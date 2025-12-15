package entities

import (
	"time"

	"github.com/google/uuid"
)

// NotificationType represents the type of notification
type NotificationType string

const (
	NotificationTypeBookingConfirmation NotificationType = "booking_confirmation"
	NotificationTypePaymentReceipt      NotificationType = "payment_receipt"
	NotificationTypeTripReminder        NotificationType = "trip_reminder"
	NotificationTypeCancellation        NotificationType = "cancellation"
	NotificationTypeRefund              NotificationType = "refund"
	NotificationTypeSeatChange          NotificationType = "seat_change"
)

// NotificationChannel represents the delivery channel
type NotificationChannel string

const (
	NotificationChannelEmail NotificationChannel = "email"
	NotificationChannelSMS   NotificationChannel = "sms"
	NotificationChannelPush  NotificationChannel = "push"
)

// NotificationStatus represents the delivery status
type NotificationStatus string

const (
	NotificationStatusPending   NotificationStatus = "pending"
	NotificationStatusQueued    NotificationStatus = "queued"
	NotificationStatusSending   NotificationStatus = "sending"
	NotificationStatusSent      NotificationStatus = "sent"
	NotificationStatusFailed    NotificationStatus = "failed"
	NotificationStatusCancelled NotificationStatus = "cancelled"
)

// Notification represents a notification to be sent to a user
// Supports email, SMS (optional), and push notifications (future)
// Integrates with a simple queue system for reliable delivery
type Notification struct {
	ID        uuid.UUID           `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID    *uuid.UUID          `json:"user_id,omitempty" gorm:"type:uuid;index"` // Nullable for guest users
	BookingID *uuid.UUID          `json:"booking_id,omitempty" gorm:"type:uuid;index"`
	Type      NotificationType    `json:"type" gorm:"type:varchar(50);not null;index"`
	Channel   NotificationChannel `json:"channel" gorm:"type:varchar(20);not null"`
	Status    NotificationStatus  `json:"status" gorm:"type:varchar(20);not null;default:'pending';index"`

	// Recipient information
	RecipientEmail *string `json:"recipient_email,omitempty"`
	RecipientPhone *string `json:"recipient_phone,omitempty"`
	RecipientName  string  `json:"recipient_name,omitempty"`

	// Content
	Subject  string  `json:"subject,omitempty"`
	Body     string  `json:"body" gorm:"type:text;not null"`
	HTMLBody *string `json:"html_body,omitempty" gorm:"type:text"`

	// Metadata for template rendering
	TemplateData *string `json:"template_data,omitempty" gorm:"type:jsonb"` // JSON data for templates

	// Delivery tracking
	ScheduledFor *time.Time `json:"scheduled_for,omitempty"` // For scheduled notifications
	SentAt       *time.Time `json:"sent_at,omitempty"`
	FailedAt     *time.Time `json:"failed_at,omitempty"`
	ErrorMessage *string    `json:"error_message,omitempty"`
	RetryCount   int        `json:"retry_count" gorm:"default:0"`
	MaxRetries   int        `json:"max_retries" gorm:"default:3"`

	// Standard timestamps
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime;index"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Booking *Booking `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
}

// TableName overrides the table name
func (Notification) TableName() string {
	return "notifications"
}

// CanRetry checks if notification can be retried
func (n *Notification) CanRetry() bool {
	return n.Status == NotificationStatusFailed && n.RetryCount < n.MaxRetries
}

// IsReadyToSend checks if notification should be sent now
func (n *Notification) IsReadyToSend() bool {
	if n.Status != NotificationStatusPending && n.Status != NotificationStatusQueued {
		return false
	}
	if n.ScheduledFor == nil {
		return true
	}
	return time.Now().After(*n.ScheduledFor)
}

// NotificationPreference stores user preferences for notifications
// Allows users to opt in/out of specific notification types and channels
type NotificationPreference struct {
	ID     uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	UserID uuid.UUID `json:"user_id" gorm:"type:uuid;not null;uniqueIndex"`

	// Email preferences
	EmailEnabled        bool `json:"email_enabled" gorm:"default:true"`
	BookingConfirmation bool `json:"booking_confirmation" gorm:"default:true"`
	PaymentReceipts     bool `json:"payment_receipts" gorm:"default:true"`
	TripReminders       bool `json:"trip_reminders" gorm:"default:true"`
	CancellationNotices bool `json:"cancellation_notices" gorm:"default:true"`

	// SMS preferences (optional feature)
	SMSEnabled        bool `json:"sms_enabled" gorm:"default:false"`
	SMSBookingConfirm bool `json:"sms_booking_confirm" gorm:"default:false"`
	SMSTripReminders  bool `json:"sms_trip_reminders" gorm:"default:false"`

	// Marketing preferences
	PromotionalEmails bool `json:"promotional_emails" gorm:"default:true"`
	Newsletter        bool `json:"newsletter" gorm:"default:false"`

	// Standard timestamps
	CreatedAt time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	User *User `json:"user,omitempty" gorm:"foreignKey:UserID"`
}

// TableName overrides the table name
func (NotificationPreference) TableName() string {
	return "notification_preferences"
}

// ShouldSendNotification checks if a notification should be sent based on preferences
func (np *NotificationPreference) ShouldSendNotification(notifType NotificationType, channel NotificationChannel) bool {
	// Always send critical notifications
	if notifType == NotificationTypeCancellation || notifType == NotificationTypeRefund {
		return true
	}

	if channel == NotificationChannelEmail && !np.EmailEnabled {
		return false
	}

	if channel == NotificationChannelSMS && !np.SMSEnabled {
		return false
	}

	// Check specific notification type preferences
	switch notifType {
	case NotificationTypeBookingConfirmation:
		if channel == NotificationChannelEmail {
			return np.BookingConfirmation
		}
		if channel == NotificationChannelSMS {
			return np.SMSBookingConfirm
		}
	case NotificationTypePaymentReceipt:
		return np.PaymentReceipts
	case NotificationTypeTripReminder:
		if channel == NotificationChannelEmail {
			return np.TripReminders
		}
		if channel == NotificationChannelSMS {
			return np.SMSTripReminders
		}
	}

	return true
}
