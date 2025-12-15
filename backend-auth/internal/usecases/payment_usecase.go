package usecases

import (
	"context"
	"fmt"
	"log"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/services"
)

// PaymentUsecase handles payment business logic
// Integrates with payment gateway (PayOS), booking, and notification systems
// Ensures idempotent webhook processing and state consistency
type PaymentUsecase struct {
	paymentRepo       repositories.PaymentRepository
	webhookLogRepo    repositories.PaymentWebhookLogRepository
	bookingRepo       repositories.BookingRepository
	notificationRepo  repositories.NotificationRepository
	paymentProvider   services.PaymentProvider
	notificationQueue *services.NotificationQueue
	templateEngine    *services.NotificationTemplateEngine
}

// NewPaymentUsecase creates a new payment usecase
func NewPaymentUsecase(
	paymentRepo repositories.PaymentRepository,
	webhookLogRepo repositories.PaymentWebhookLogRepository,
	bookingRepo repositories.BookingRepository,
	notificationRepo repositories.NotificationRepository,
	paymentProvider services.PaymentProvider,
	notificationQueue *services.NotificationQueue,
	templateEngine *services.NotificationTemplateEngine,
) *PaymentUsecase {
	return &PaymentUsecase{
		paymentRepo:       paymentRepo,
		webhookLogRepo:    webhookLogRepo,
		bookingRepo:       bookingRepo,
		notificationRepo:  notificationRepo,
		paymentProvider:   paymentProvider,
		notificationQueue: notificationQueue,
		templateEngine:    templateEngine,
	}
}

// CreatePaymentRequest represents a payment creation request
type CreatePaymentRequest struct {
	BookingID   uuid.UUID
	Amount      float64
	Currency    string
	Method      entities.PaymentMethod
	ReturnURL   string
	CancelURL   string
	Description string
}

// CreatePaymentResponse represents the payment creation response
type CreatePaymentResponse struct {
	Payment     *entities.Payment
	CheckoutURL string
	QRCodeURL   string
}

// CreatePayment creates a new payment and generates payment link
func (uc *PaymentUsecase) CreatePayment(ctx context.Context, req CreatePaymentRequest) (*CreatePaymentResponse, error) {
	// Get booking to validate
	booking, err := uc.bookingRepo.GetByID(ctx, req.BookingID)
	if err != nil {
		return nil, fmt.Errorf("booking not found: %w", err)
	}

	// Validate booking status
	if booking.Status != entities.BookingStatusPending {
		return nil, fmt.Errorf("booking is not in pending status")
	}

	if booking.PaymentStatus == entities.PaymentStatusCompleted {
		return nil, fmt.Errorf("booking already paid")
	}

	// Generate unique order code
	orderCode := fmt.Sprintf("BUS%d%s", time.Now().Unix(), booking.BookingReference[len(booking.BookingReference)-4:])

	// Create payment record
	now := time.Now()
	expiresAt := now.Add(30 * time.Minute)

	payment := &entities.Payment{
		BookingID:         req.BookingID,
		Amount:            req.Amount,
		Currency:          req.Currency,
		Method:            req.Method,
		Status:            entities.PaymentTransactionPending,
		ExternalOrderCode: &orderCode,
		Description:       req.Description,
		InitiatedAt:       now,
		ExpiresAt:         &expiresAt,
	}

	// Save payment to DB first
	if err := uc.paymentRepo.Create(ctx, payment); err != nil {
		return nil, fmt.Errorf("failed to create payment: %w", err)
	}

	// Create payment link via provider
	paymentLink, err := uc.paymentProvider.CreatePaymentLink(services.CreatePaymentRequest{
		OrderCode:   orderCode,
		Amount:      req.Amount,
		Description: req.Description,
		ReturnURL:   req.ReturnURL,
		CancelURL:   req.CancelURL,
		BuyerName:   booking.ContactName,
		BuyerEmail:  booking.ContactEmail,
		BuyerPhone:  booking.ContactPhone,
		ExpiresAt:   expiresAt.Unix(),
	})

	if err != nil {
		// Mark payment as failed
		payment.Status = entities.PaymentTransactionFailed
		failedAt := time.Now()
		payment.FailedAt = &failedAt
		errMsg := err.Error()
		payment.FailureReason = &errMsg
		uc.paymentRepo.Update(ctx, payment)

		return nil, fmt.Errorf("failed to create payment link: %w", err)
	}

	// Update payment with external ID and URL
	payment.ExternalPaymentID = paymentLink.PaymentLinkID
	payment.PaymentURL = &paymentLink.CheckoutURL

	if err := uc.paymentRepo.Update(ctx, payment); err != nil {
		log.Printf("Warning: Failed to update payment with external ID: %v", err)
	}

	return &CreatePaymentResponse{
		Payment:     payment,
		CheckoutURL: paymentLink.CheckoutURL,
		QRCodeURL:   paymentLink.QRCodeURL,
	}, nil
}

// ProcessWebhook processes payment webhook from gateway
// Implements idempotent webhook handling with deduplication
func (uc *PaymentUsecase) ProcessWebhook(ctx context.Context, externalPaymentID, eventType, rawPayload, signature string) error {
	// 1. Log webhook receipt
	webhookLog := &entities.PaymentWebhookLog{
		ExternalPaymentID: externalPaymentID,
		EventType:         eventType,
		RawPayload:        rawPayload,
		Signature:         &signature,
		ProcessedStatus:   "pending",
	}

	if err := uc.webhookLogRepo.Create(ctx, webhookLog); err != nil {
		return fmt.Errorf("failed to log webhook: %w", err)
	}

	// 2. Check for duplicate webhooks
	existingLogs, err := uc.webhookLogRepo.GetByExternalPaymentID(ctx, externalPaymentID)
	if err == nil && len(existingLogs) > 1 {
		// Check if already processed successfully
		for _, existingLog := range existingLogs {
			if existingLog.ProcessedStatus == "processed" && existingLog.EventType == eventType {
				fmt.Printf("Duplicate webhook detected for %s, skipping\n", externalPaymentID)
				webhookLog.ProcessedStatus = "duplicate"
				uc.webhookLogRepo.Update(ctx, webhookLog)
				return nil
			}
		}
	}

	// 3. Verify webhook signature
	verified, err := uc.paymentProvider.VerifyWebhookSignature([]byte(rawPayload), signature)
	if err != nil || !verified {
		errMsg := "webhook signature verification failed"
		webhookLog.ProcessedStatus = "failed"
		webhookLog.ErrorMessage = &errMsg
		uc.webhookLogRepo.Update(ctx, webhookLog)
		return fmt.Errorf(errMsg)
	}

	// 4. Get payment by external ID
	payment, err := uc.paymentRepo.GetByExternalID(ctx, externalPaymentID)
	if err != nil {
		// Payment not found, might be for a different system
		errMsg := fmt.Sprintf("payment not found: %v", err)
		webhookLog.ProcessedStatus = "failed"
		webhookLog.ErrorMessage = &errMsg
		uc.webhookLogRepo.Update(ctx, webhookLog)
		return fmt.Errorf(errMsg)
	}

	// Link webhook log to payment
	webhookLog.PaymentID = &payment.ID
	uc.webhookLogRepo.Update(ctx, webhookLog)

	// 5. Process webhook based on event type
	switch eventType {
	case "payment.completed", "PAID":
		err = uc.handlePaymentSuccess(ctx, payment)
	case "payment.failed", "FAILED":
		err = uc.handlePaymentFailure(ctx, payment, "payment failed")
	case "payment.cancelled", "CANCELLED":
		err = uc.handlePaymentCancellation(ctx, payment)
	case "payment.expired", "EXPIRED":
		err = uc.handlePaymentExpiry(ctx, payment)
	default:
		log.Printf("Unknown webhook event type: %s", eventType)
		return nil
	}

	// 6. Update webhook log status
	if err != nil {
		webhookLog.ProcessedStatus = "failed"
		errMsg := err.Error()
		webhookLog.ErrorMessage = &errMsg
		webhookLog.RetryCount++
	} else {
		webhookLog.ProcessedStatus = "processed"
		now := time.Now()
		webhookLog.ProcessedAt = &now
	}

	uc.webhookLogRepo.Update(ctx, webhookLog)

	return err
}

// handlePaymentSuccess handles successful payment webhook
func (uc *PaymentUsecase) handlePaymentSuccess(ctx context.Context, payment *entities.Payment) error {
	// Check if already processed
	if payment.Status == entities.PaymentTransactionCompleted {
		log.Printf("Payment %s already completed, skipping", payment.ID)
		return nil
	}

	// Update payment status
	now := time.Now()
	payment.Status = entities.PaymentTransactionCompleted
	payment.CompletedAt = &now
	payment.WebhookReceivedAt = &now
	payment.WebhookProcessedAt = &now

	if err := uc.paymentRepo.Update(ctx, payment); err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}

	// Update booking status
	booking, err := uc.bookingRepo.GetByID(ctx, payment.BookingID)
	if err != nil {
		return fmt.Errorf("failed to get booking: %w", err)
	}

	booking.Status = entities.BookingStatusConfirmed
	booking.PaymentStatus = entities.PaymentStatusCompleted
	booking.ConfirmedAt = &now
	paymentMethod := string(payment.Method)
	booking.PaymentMethod = &paymentMethod
	externalID := payment.ExternalPaymentID
	booking.PaymentReference = &externalID

	if err := uc.bookingRepo.Update(ctx, booking); err != nil {
		return fmt.Errorf("failed to update booking: %w", err)
	}

	// Send payment receipt notification
	go uc.sendPaymentReceiptNotification(booking, payment)

	log.Printf("Payment %s processed successfully for booking %s", payment.ID, booking.BookingReference)

	return nil
}

// handlePaymentFailure handles failed payment webhook
func (uc *PaymentUsecase) handlePaymentFailure(ctx context.Context, payment *entities.Payment, reason string) error {
	now := time.Now()
	payment.Status = entities.PaymentTransactionFailed
	payment.FailedAt = &now
	payment.FailureReason = &reason

	if err := uc.paymentRepo.Update(ctx, payment); err != nil {
		return fmt.Errorf("failed to update payment: %w", err)
	}

	// Update booking payment status
	booking, err := uc.bookingRepo.GetByID(ctx, payment.BookingID)
	if err == nil {
		booking.PaymentStatus = entities.PaymentStatusFailed
		uc.bookingRepo.Update(ctx, booking)
	}

	return nil
}

// handlePaymentCancellation handles cancelled payment webhook
func (uc *PaymentUsecase) handlePaymentCancellation(ctx context.Context, payment *entities.Payment) error {
	payment.Status = entities.PaymentTransactionCancelled
	return uc.paymentRepo.Update(ctx, payment)
}

// handlePaymentExpiry handles expired payment webhook
func (uc *PaymentUsecase) handlePaymentExpiry(ctx context.Context, payment *entities.Payment) error {
	payment.Status = entities.PaymentTransactionFailed
	now := time.Now()
	payment.FailedAt = &now
	reason := "payment expired"
	payment.FailureReason = &reason

	return uc.paymentRepo.Update(ctx, payment)
}

// sendPaymentReceiptNotification sends payment receipt via notification queue
func (uc *PaymentUsecase) sendPaymentReceiptNotification(booking *entities.Booking, payment *entities.Payment) {
	ctx := context.Background()

	// Render notification template
	subject, body, err := uc.templateEngine.RenderPaymentReceipt(services.PaymentReceiptData{
		RecipientName:    booking.ContactName,
		BookingReference: booking.BookingReference,
		Amount:           payment.Amount,
		TransactionID:    payment.ExternalPaymentID,
		PaymentMethod:    string(payment.Method),
		PaymentDate:      payment.CompletedAt.Format("January 2, 2006 at 3:04 PM"),
	})

	if err != nil {
		log.Printf("Failed to render payment receipt template: %v", err)
		return
	}

	// Create notification
	notification := &entities.Notification{
		UserID:         booking.UserID,
		BookingID:      &booking.ID,
		Type:           entities.NotificationTypePaymentReceipt,
		Channel:        entities.NotificationChannelEmail,
		Status:         entities.NotificationStatusPending,
		RecipientEmail: &booking.ContactEmail,
		RecipientName:  booking.ContactName,
		Subject:        subject,
		Body:           body,
		HTMLBody:       &body,
	}

	if err := uc.notificationRepo.Create(ctx, notification); err != nil {
		log.Printf("Failed to create payment receipt notification: %v", err)
		return
	}

	// Enqueue for sending
	if err := uc.notificationQueue.Enqueue(notification); err != nil {
		log.Printf("Failed to enqueue payment receipt notification: %v", err)
	}
}

// GetPaymentByBookingID retrieves payment(s) for a booking
func (uc *PaymentUsecase) GetPaymentByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Payment, error) {
	return uc.paymentRepo.GetByBookingID(ctx, bookingID)
}

// GetPaymentByID retrieves a payment by ID
func (uc *PaymentUsecase) GetPaymentByID(ctx context.Context, paymentID uuid.UUID) (*entities.Payment, error) {
	return uc.paymentRepo.GetByID(ctx, paymentID)
}
