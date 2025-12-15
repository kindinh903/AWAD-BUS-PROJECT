package entities

import (
	"time"

	"github.com/google/uuid"
)

// PaymentMethod represents the method used for payment
type PaymentMethod string

const (
	PaymentMethodPayOS        PaymentMethod = "payos"
	PaymentMethodCreditCard   PaymentMethod = "credit_card"
	PaymentMethodBankTransfer PaymentMethod = "bank_transfer"
	PaymentMethodCash         PaymentMethod = "cash"
)

// PaymentTransactionStatus represents the status of a payment transaction
type PaymentTransactionStatus string

const (
	PaymentTransactionPending    PaymentTransactionStatus = "pending"
	PaymentTransactionProcessing PaymentTransactionStatus = "processing"
	PaymentTransactionCompleted  PaymentTransactionStatus = "completed"
	PaymentTransactionFailed     PaymentTransactionStatus = "failed"
	PaymentTransactionCancelled  PaymentTransactionStatus = "cancelled"
	PaymentTransactionRefunded   PaymentTransactionStatus = "refunded"
)

// Payment represents a payment transaction
// This entity tracks the full lifecycle of a payment including
// creation, processing, completion, and any failures or refunds
type Payment struct {
	ID        uuid.UUID                `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BookingID uuid.UUID                `json:"booking_id" gorm:"type:uuid;not null;index"`
	Amount    float64                  `json:"amount" gorm:"not null"` // Total amount in USD
	Currency  string                   `json:"currency" gorm:"type:varchar(3);not null;default:'USD'"`
	Method    PaymentMethod            `json:"method" gorm:"type:varchar(50);not null"`
	Status    PaymentTransactionStatus `json:"status" gorm:"type:varchar(20);not null;default:'pending'"`

	// External payment gateway references
	ExternalPaymentID string  `json:"external_payment_id,omitempty" gorm:"index"` // PayOS payment link ID or external transaction ID
	ExternalOrderCode *string `json:"external_order_code,omitempty"`              // PayOS order code
	PaymentURL        *string `json:"payment_url,omitempty"`                      // Payment gateway URL

	// Payment metadata
	Description string  `json:"description,omitempty"`
	IPAddress   *string `json:"ip_address,omitempty"`
	UserAgent   *string `json:"user_agent,omitempty"`

	// Transaction timestamps
	InitiatedAt time.Time  `json:"initiated_at" gorm:"not null"`
	ProcessedAt *time.Time `json:"processed_at,omitempty"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	FailedAt    *time.Time `json:"failed_at,omitempty"`
	RefundedAt  *time.Time `json:"refunded_at,omitempty"`
	ExpiresAt   *time.Time `json:"expires_at,omitempty"` // When payment link expires

	// Failure/Error details
	FailureReason *string `json:"failure_reason,omitempty"`
	ErrorCode     *string `json:"error_code,omitempty"`

	// Refund details
	RefundAmount *float64 `json:"refund_amount,omitempty"`
	RefundReason *string  `json:"refund_reason,omitempty"`

	// Webhook processing
	WebhookReceivedAt  *time.Time `json:"webhook_received_at,omitempty"`
	WebhookProcessedAt *time.Time `json:"webhook_processed_at,omitempty"`
	WebhookRetryCount  int        `json:"webhook_retry_count" gorm:"default:0"`

	// Standard timestamps
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Booking *Booking `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
}

// TableName overrides the table name
func (Payment) TableName() string {
	return "payments"
}

// IsExpired checks if the payment has expired
func (p *Payment) IsExpired() bool {
	if p.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*p.ExpiresAt)
}

// CanBeRefunded checks if payment can be refunded
func (p *Payment) CanBeRefunded() bool {
	return p.Status == PaymentTransactionCompleted && p.RefundedAt == nil
}

// IsSuccessful checks if payment was completed successfully
func (p *Payment) IsSuccessful() bool {
	return p.Status == PaymentTransactionCompleted && p.CompletedAt != nil
}

// PaymentWebhookLog tracks all webhook events received from payment gateway
// This ensures idempotency and helps with debugging webhook issues
type PaymentWebhookLog struct {
	ID                uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	PaymentID         *uuid.UUID `json:"payment_id,omitempty" gorm:"type:uuid;index"`                         // Nullable in case we can't match
	ExternalPaymentID string     `json:"external_payment_id" gorm:"index;not null"`                           // From webhook payload
	EventType         string     `json:"event_type" gorm:"not null"`                                          // e.g., "payment.completed", "payment.failed"
	RawPayload        string     `json:"raw_payload" gorm:"type:text;not null"`                               // Full JSON payload
	Signature         *string    `json:"signature,omitempty"`                                                 // Webhook signature for verification
	ProcessedStatus   string     `json:"processed_status" gorm:"type:varchar(20);not null;default:'pending'"` // pending, processed, failed
	ProcessedAt       *time.Time `json:"processed_at,omitempty"`
	ErrorMessage      *string    `json:"error_message,omitempty"`
	RetryCount        int        `json:"retry_count" gorm:"default:0"`
	CreatedAt         time.Time  `json:"created_at" gorm:"autoCreateTime"`

	// Relations
	Payment *Payment `json:"payment,omitempty" gorm:"foreignKey:PaymentID"`
}

// TableName overrides the table name
func (PaymentWebhookLog) TableName() string {
	return "payment_webhook_logs"
}
