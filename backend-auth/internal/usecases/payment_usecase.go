package usecases

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/services"
)

type PaymentUsecase struct {
	paymentRepo       repositories.PaymentRepository
	webhookLogRepo    repositories.PaymentWebhookLogRepository
	bookingRepo       repositories.BookingRepository
	notificationRepo  repositories.NotificationRepository
	paymentProvider   services.PaymentProvider
	notificationQueue *services.NotificationQueue
	templateEngine    *services.NotificationTemplateEngine
	// Dependencies for sending ticket emails
	passengerRepo repositories.PassengerRepository
	ticketRepo    repositories.TicketRepository
	tripRepo      repositories.TripRepository
	ticketService *services.TicketService
	emailService  *services.EmailService
}

func NewPaymentUsecase(
	paymentRepo repositories.PaymentRepository,
	webhookLogRepo repositories.PaymentWebhookLogRepository,
	bookingRepo repositories.BookingRepository,
	notificationRepo repositories.NotificationRepository,
	paymentProvider services.PaymentProvider,
	notificationQueue *services.NotificationQueue,
	templateEngine *services.NotificationTemplateEngine,
	passengerRepo repositories.PassengerRepository,
	ticketRepo repositories.TicketRepository,
	tripRepo repositories.TripRepository,
	ticketService *services.TicketService,
	emailService *services.EmailService,
) *PaymentUsecase {
	return &PaymentUsecase{
		paymentRepo:       paymentRepo,
		webhookLogRepo:    webhookLogRepo,
		bookingRepo:       bookingRepo,
		notificationRepo:  notificationRepo,
		paymentProvider:   paymentProvider,
		notificationQueue: notificationQueue,
		templateEngine:    templateEngine,
		passengerRepo:     passengerRepo,
		ticketRepo:        ticketRepo,
		tripRepo:          tripRepo,
		ticketService:     ticketService,
		emailService:      emailService,
	}
}

type CreatePaymentRequest struct {
	BookingID   uuid.UUID
	Amount      float64
	Currency    string
	Method      entities.PaymentMethod
	ReturnURL   string
	CancelURL   string
	Description string
}

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

	// Use booking's amount if not provided
	amount := req.Amount
	if amount == 0 {
		amount = booking.TotalAmount
	}

	// Use default currency
	currency := req.Currency
	if currency == "" {
		currency = "VND"
	}

	// CRITICAL FIX: Generate orderCode as INTEGER (Unix timestamp)
	// PayOS requires orderCode to be a pure integer
	orderCode := time.Now().Unix()
	orderCodeStr := fmt.Sprintf("%d", orderCode)

	// Create payment record
	now := time.Now()
	expiresAt := now.Add(15 * time.Minute) // Change from 30 to 15 minutes
	expiresAtUnix := expiresAt.Unix()

	payment := &entities.Payment{
		BookingID:         req.BookingID,
		Amount:            amount,
		Currency:          currency,
		Method:            req.Method,
		Status:            entities.PaymentTransactionPending,
		ExternalOrderCode: &orderCodeStr,
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
		OrderCode:   orderCode, // Pass as int64
		Amount:      amount,
		Description: req.Description,
		ReturnURL:   req.ReturnURL,
		CancelURL:   req.CancelURL,
		BuyerName:   booking.ContactName,
		BuyerEmail:  booking.ContactEmail,
		BuyerPhone:  booking.ContactPhone,
		ExpiresAt:   expiresAtUnix,
		Items: []services.PayOSItem{
			{
				Name:     "Bus Ticket",
				Quantity: 1,
				Price:    int(amount),
			},
		},
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

	// AUTO-SUCCESS IN MOCK MODE: Immediately trigger payment success webhook
	// This simulates instant payment success for testing
	useMockPayment := os.Getenv("USE_MOCK_PAYMENT") == "true"
	if useMockPayment {
		log.Printf("🎫 [MOCK MODE] Auto-triggering payment success for order: %s", orderCodeStr)
		go func() {
			time.Sleep(2 * time.Second) // Small delay to simulate processing
			bgCtx := context.Background()
			if err := uc.ProcessWebhook(bgCtx, orderCodeStr, "payment.success", "{\"mock\":true}", "mock-signature"); err != nil {
				log.Printf("❌ [MOCK MODE] Failed to auto-process payment: %v", err)
			} else {
				log.Printf("✅ [MOCK MODE] Payment auto-completed successfully")
			}
		}()
	}

	return &CreatePaymentResponse{
		Payment:     payment,
		CheckoutURL: paymentLink.CheckoutURL,
		QRCodeURL:   paymentLink.QRCodeURL,
	}, nil
}

// ProcessWebhook processes payment webhook from gateway
// Handles PayOS webhook events and updates payment/booking status accordingly
func (uc *PaymentUsecase) ProcessWebhook(ctx context.Context, externalPaymentID, eventType, rawPayload, signature string) error {
	log.Printf("[Webhook] Processing event: %s for payment: %s", eventType, externalPaymentID)

	// 1. Log webhook receipt
	webhookLog := &entities.PaymentWebhookLog{
		ExternalPaymentID: externalPaymentID,
		EventType:         eventType,
		RawPayload:        rawPayload,
		Signature:         &signature,
		ProcessedStatus:   "pending",
	}

	if err := uc.webhookLogRepo.Create(ctx, webhookLog); err != nil {
		log.Printf("[Webhook] Error logging webhook: %v", err)
		return fmt.Errorf("failed to log webhook: %w", err)
	}

	log.Printf("[Webhook] Webhook logged with ID: %s", webhookLog.ID)

	// 2. Check for duplicate webhooks
	existingLogs, err := uc.webhookLogRepo.GetByExternalPaymentID(ctx, externalPaymentID)
	if err == nil && len(existingLogs) > 1 {
		for _, existingLog := range existingLogs {
			if existingLog.ProcessedStatus == "processed" && existingLog.EventType == eventType {
				log.Printf("[Webhook] Duplicate webhook detected for %s (event: %s), skipping", externalPaymentID, eventType)
				webhookLog.ProcessedStatus = "duplicate"
				uc.webhookLogRepo.Update(ctx, webhookLog)
				return nil
			}
		}
	}

	// 3. Verify webhook signature
	// Skip signature verification if signature is empty (development/mock mode)
	// In production with real PayOS, signature will always be present
	if signature != "" && signature != "mock-signature" {
		verified, err := uc.paymentProvider.VerifyWebhookSignature([]byte(rawPayload), signature)
		if err != nil || !verified {
			errMsg := "webhook signature verification failed"
			log.Printf("[Webhook] Signature verification failed for payment %s: verified=%v, err=%v", externalPaymentID, verified, err)
			webhookLog.ProcessedStatus = "failed"
			webhookLog.ErrorMessage = &errMsg
			uc.webhookLogRepo.Update(ctx, webhookLog)
			return fmt.Errorf(errMsg)
		}
		log.Printf("[Webhook] Signature verified successfully for payment %s", externalPaymentID)
	} else {
		log.Printf("[Webhook] Signature verification skipped for payment %s (empty/mock signature - development mode)", externalPaymentID)
	}

	// 4. Get payment by external order code (not payment link ID)
	payment, err := uc.paymentRepo.GetByOrderCode(ctx, externalPaymentID)
	if err != nil {
		errMsg := fmt.Sprintf("payment not found: %v", err)
		log.Printf("[Webhook] Payment lookup failed for order code %s: %v", externalPaymentID, err)
		webhookLog.ProcessedStatus = "failed"
		webhookLog.ErrorMessage = &errMsg
		uc.webhookLogRepo.Update(ctx, webhookLog)
		return fmt.Errorf(errMsg)
	}

	log.Printf("[Webhook] Found payment %s for order code %s", payment.ID, externalPaymentID)

	// Link webhook log to payment
	webhookLog.PaymentID = &payment.ID
	uc.webhookLogRepo.Update(ctx, webhookLog)

	// 5. Process webhook based on event type
	log.Printf("[Webhook] Processing event type: %s", eventType)

	switch eventType {
	case "payment.completed", "payment.success", "PAID":
		err = uc.handlePaymentSuccess(ctx, payment)
	case "payment.failed", "FAILED":
		err = uc.handlePaymentFailure(ctx, payment, "payment failed")
	case "payment.cancelled", "CANCELLED":
		err = uc.handlePaymentCancellation(ctx, payment)
	case "payment.expired", "EXPIRED":
		err = uc.handlePaymentExpiry(ctx, payment)
	case "payment.pending", "PENDING":
		log.Printf("[Webhook] Payment still pending, no action needed")
		err = nil
	default:
		if len(eventType) > 20 && eventType[:14] == "payment.failed:" {
			// Handle payment.failed:reason format
			reason := eventType[14:]
			err = uc.handlePaymentFailure(ctx, payment, reason)
		} else {
			log.Printf("[Webhook] Unknown webhook event type: %s, taking no action", eventType)
			err = nil
		}
	}

	// 6. Update webhook log status
	if err != nil {
		log.Printf("[Webhook] Error processing webhook: %v", err)
		webhookLog.ProcessedStatus = "failed"
		errMsg := err.Error()
		webhookLog.ErrorMessage = &errMsg
		webhookLog.RetryCount++
	} else {
		webhookLog.ProcessedStatus = "processed"
		now := time.Now()
		webhookLog.ProcessedAt = &now
		log.Printf("[Webhook] Webhook processed successfully for payment %s", payment.ID)
	}

	uc.webhookLogRepo.Update(ctx, webhookLog)

	return err
}

// handlePaymentSuccess handles successful payment webhook
func (uc *PaymentUsecase) handlePaymentSuccess(ctx context.Context, payment *entities.Payment) error {
	// Check if already processed
	if payment.Status == entities.PaymentTransactionCompleted {
		log.Printf("[Payment] Payment %s already completed, skipping", payment.ID)
		return nil
	}

	log.Printf("[Payment] Processing successful payment for payment ID: %s, booking ID: %s", payment.ID, payment.BookingID)

	// Update payment status
	now := time.Now()
	payment.Status = entities.PaymentTransactionCompleted
	payment.CompletedAt = &now
	payment.WebhookReceivedAt = &now
	payment.WebhookProcessedAt = &now

	if err := uc.paymentRepo.Update(ctx, payment); err != nil {
		log.Printf("[Payment] Error updating payment status: %v", err)
		return fmt.Errorf("failed to update payment: %w", err)
	}

	log.Printf("[Payment] Payment status updated to completed")

	// Update booking status
	booking, err := uc.bookingRepo.GetByID(ctx, payment.BookingID)
	if err != nil {
		log.Printf("[Payment] Error fetching booking: %v", err)
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
		log.Printf("[Payment] Error updating booking status: %v", err)
		return fmt.Errorf("failed to update booking: %w", err)
	}

	log.Printf("[Payment] Booking %s status updated to confirmed", booking.BookingReference)

	// Send payment receipt notification asynchronously
	go uc.sendPaymentReceiptNotification(booking, payment)

	// Send ticket emails asynchronously
	go uc.sendTicketEmails(ctx, booking.ID)

	log.Printf("[Payment] Payment %s processed successfully for booking %s", payment.ID, booking.BookingReference)

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

	// Create in-app notification as well
	inAppNotification := &entities.Notification{
		UserID:    booking.UserID,
		BookingID: &booking.ID,
		Type:      entities.NotificationTypePaymentReceipt,
		Channel:   entities.NotificationChannelInApp,
		Status:    entities.NotificationStatusSent,
		Subject:   "Payment Successful",
		Body:      fmt.Sprintf("Your payment of %s đ has been processed successfully", fmt.Sprintf("%.0f", payment.Amount)),
	}
	uc.notificationRepo.Create(ctx, inAppNotification)
}

// sendTicketEmails sends e-ticket emails to passengers after payment success
func (uc *PaymentUsecase) sendTicketEmails(ctx context.Context, bookingID uuid.UUID) error {
	log.Printf("[TicketEmail] Starting ticket email sending for booking: %s", bookingID)

	// Get booking with all details
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		log.Printf("[TicketEmail] Failed to get booking: %v", err)
		return fmt.Errorf("failed to get booking: %w", err)
	}

	// Get trip details
	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		log.Printf("[TicketEmail] Failed to get trip: %v", err)
		return fmt.Errorf("failed to get trip: %w", err)
	}

	// Get passengers
	passengers, err := uc.passengerRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		log.Printf("[TicketEmail] Failed to get passengers: %v", err)
		return fmt.Errorf("failed to get passengers: %w", err)
	}

	// Get tickets
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		log.Printf("[TicketEmail] Failed to get tickets: %v", err)
		return fmt.Errorf("failed to get tickets: %w", err)
	}

	log.Printf("[TicketEmail] Found %d tickets to send", len(tickets))

	// Send email for each ticket
	for i, ticket := range tickets {
		if i >= len(passengers) {
			break
		}
		passenger := passengers[i]

		// Generate PDF for this ticket
		pdfBytes, err := uc.ticketService.GenerateTicketPDF(ticket, booking, trip, passenger)
		if err != nil {
			log.Printf("[TicketEmail] Failed to generate PDF for ticket %s: %v", ticket.TicketNumber, err)
			continue
		}

		// Send email with PDF attachment
		if err := uc.emailService.SendTicketEmail(
			booking.ContactEmail,
			booking.ContactName,
			booking.BookingReference,
			ticket.TicketNumber,
			pdfBytes,
		); err != nil {
			log.Printf("[TicketEmail] Failed to send email for ticket %s: %v", ticket.TicketNumber, err)
		} else {
			log.Printf("[TicketEmail] Successfully sent ticket email for %s", ticket.TicketNumber)
		}
	}

	log.Printf("[TicketEmail] Completed ticket email sending for booking: %s", bookingID)
	return nil
}

// GetPaymentByBookingID retrieves payment(s) for a booking
func (uc *PaymentUsecase) GetPaymentByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Payment, error) {
	return uc.paymentRepo.GetByBookingID(ctx, bookingID)
}

// GetPaymentByID retrieves a payment by ID
func (uc *PaymentUsecase) GetPaymentByID(ctx context.Context, paymentID uuid.UUID) (*entities.Payment, error) {
	return uc.paymentRepo.GetByID(ctx, paymentID)
}
