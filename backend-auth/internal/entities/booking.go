package entities

import (
	"time"

	"github.com/google/uuid"
)

// BookingStatus represents the status of a booking
type BookingStatus string

const (
	BookingStatusPending   BookingStatus = "pending"   // Booking created but not paid
	BookingStatusConfirmed BookingStatus = "confirmed" // Payment confirmed
	BookingStatusCancelled BookingStatus = "cancelled" // Booking cancelled
	BookingStatusCompleted BookingStatus = "completed" // Trip completed
	BookingStatusExpired   BookingStatus = "expired"   // Booking expired due to non-payment
)

// PaymentStatus represents the payment status
type PaymentStatus string

const (
	PaymentStatusPending   PaymentStatus = "pending"
	PaymentStatusCompleted PaymentStatus = "completed"
	PaymentStatusFailed    PaymentStatus = "failed"
	PaymentStatusRefunded  PaymentStatus = "refunded"
)

// Booking represents a ticket booking
type Booking struct {
	ID                uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BookingReference  string        `json:"booking_reference" gorm:"uniqueIndex;not null"` // Unique booking reference (e.g., "BK20231215ABC123")
	TripID            uuid.UUID     `json:"trip_id" gorm:"type:uuid;not null;index"`
	UserID            *uuid.UUID    `json:"user_id,omitempty" gorm:"type:uuid;index"` // Nullable for guest bookings
	ContactEmail      string        `json:"contact_email" gorm:"not null"`             // Primary contact email
	ContactPhone      string        `json:"contact_phone" gorm:"not null"`             // Primary contact phone
	ContactName       string        `json:"contact_name" gorm:"not null"`              // Primary contact name
	TotalSeats        int           `json:"total_seats" gorm:"not null"`               // Number of seats booked
	TotalAmount       float64       `json:"total_amount" gorm:"not null"`              // Total price
	Status            BookingStatus `json:"status" gorm:"type:varchar(20);not null;default:'pending';index"`
	PaymentStatus     PaymentStatus `json:"payment_status" gorm:"type:varchar(20);not null;default:'pending'"`
	PaymentMethod     *string       `json:"payment_method,omitempty"`            // e.g., "credit_card", "cash", "bank_transfer"
	PaymentReference  *string       `json:"payment_reference,omitempty"`         // External payment reference
	IsGuestBooking    bool          `json:"is_guest_booking" gorm:"default:false"` // True if booked without account
	Notes             *string       `json:"notes,omitempty"`                     // Additional notes
	ExpiresAt         *time.Time    `json:"expires_at,omitempty"`                // Expiration time for pending bookings
	ConfirmedAt       *time.Time    `json:"confirmed_at,omitempty"`              // When booking was confirmed
	CancelledAt       *time.Time    `json:"cancelled_at,omitempty"`              // When booking was cancelled
	CancellationReason *string      `json:"cancellation_reason,omitempty"`       // Reason for cancellation
	CreatedAt         time.Time     `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt         time.Time     `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt         *time.Time    `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Trip       *Trip       `json:"trip,omitempty" gorm:"foreignKey:TripID"`
	User       *User       `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Passengers []Passenger `json:"passengers,omitempty" gorm:"foreignKey:BookingID"`
	Tickets    []Ticket    `json:"tickets,omitempty" gorm:"foreignKey:BookingID"`
}

// TableName overrides the table name
func (Booking) TableName() string {
	return "bookings"
}

// IsExpired checks if the booking has expired
func (b *Booking) IsExpired() bool {
	if b.ExpiresAt == nil {
		return false
	}
	return time.Now().After(*b.ExpiresAt)
}

// CanBeCancelled checks if booking can be cancelled
func (b *Booking) CanBeCancelled() bool {
	return b.Status == BookingStatusPending || b.Status == BookingStatusConfirmed
}

// Passenger represents a passenger in a booking
type Passenger struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	BookingID    uuid.UUID  `json:"booking_id" gorm:"type:uuid;not null;index"`
	SeatID       uuid.UUID  `json:"seat_id" gorm:"type:uuid;not null;index"`   // Which seat on the seat map
	SeatNumber   string     `json:"seat_number" gorm:"not null"`               // Denormalized for convenience
	FullName     string     `json:"full_name" gorm:"not null"`                 // Passenger full name
	IDNumber     *string    `json:"id_number,omitempty"`                       // ID/Passport number
	Phone        *string    `json:"phone,omitempty"`                           // Passenger phone
	Email        *string    `json:"email,omitempty"`                           // Passenger email
	Age          *int       `json:"age,omitempty"`                             // Passenger age
	Gender       *string    `json:"gender,omitempty" gorm:"type:varchar(10)"` // Male/Female/Other
	SeatType     SeatType   `json:"seat_type" gorm:"type:varchar(20);not null;default:'standard'"`
	SeatPrice    float64    `json:"seat_price" gorm:"not null"`                // Price for this specific seat
	SpecialNeeds *string    `json:"special_needs,omitempty"`                   // Special requirements
	CreatedAt    time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Booking *Booking `json:"-" gorm:"foreignKey:BookingID"`
	Seat    *Seat    `json:"seat,omitempty" gorm:"foreignKey:SeatID"`
}

// TableName overrides the table name
func (Passenger) TableName() string {
	return "passengers"
}

// SeatReservation represents a temporary seat lock during booking process
type SeatReservation struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TripID    uuid.UUID  `json:"trip_id" gorm:"type:uuid;not null;index"`
	SeatID    uuid.UUID  `json:"seat_id" gorm:"type:uuid;not null;index"`
	SessionID string     `json:"session_id" gorm:"not null;index"` // Session or user identifier
	ExpiresAt time.Time  `json:"expires_at" gorm:"not null;index"` // When the reservation expires
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Trip *Trip `json:"trip,omitempty" gorm:"foreignKey:TripID"`
	Seat *Seat `json:"seat,omitempty" gorm:"foreignKey:SeatID"`
}

// TableName overrides the table name
func (SeatReservation) TableName() string {
	return "seat_reservations"
}

// IsExpired checks if the reservation has expired
func (sr *SeatReservation) IsExpired() bool {
	return time.Now().After(sr.ExpiresAt)
}

// Ticket represents an e-ticket for a passenger
type Ticket struct {
	ID            uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TicketNumber  string     `json:"ticket_number" gorm:"uniqueIndex;not null"` // Unique ticket number
	BookingID     uuid.UUID  `json:"booking_id" gorm:"type:uuid;not null;index"`
	PassengerID   uuid.UUID  `json:"passenger_id" gorm:"type:uuid;not null;index"`
	TripID        uuid.UUID  `json:"trip_id" gorm:"type:uuid;not null;index"`
	SeatNumber    string     `json:"seat_number" gorm:"not null"`    // Denormalized
	PassengerName string     `json:"passenger_name" gorm:"not null"` // Denormalized
	QRCode        *string    `json:"qr_code,omitempty"`              // Base64 encoded QR code
	Barcode       *string    `json:"barcode,omitempty"`              // Barcode for scanning
	IsUsed        bool       `json:"is_used" gorm:"default:false"`   // Has ticket been used/scanned
	UsedAt        *time.Time `json:"used_at,omitempty"`              // When ticket was scanned
	CreatedAt     time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt     time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt     *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Booking   *Booking   `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
	Passenger *Passenger `json:"passenger,omitempty" gorm:"foreignKey:PassengerID"`
	Trip      *Trip      `json:"trip,omitempty" gorm:"foreignKey:TripID"`
}

// TableName overrides the table name
func (Ticket) TableName() string {
	return "tickets"
}
