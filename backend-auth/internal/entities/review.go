package entities

import (
	"time"

	"github.com/google/uuid"
)

// Review represents a customer review for a completed trip
type Review struct {
	ID        uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	TripID    uuid.UUID  `json:"trip_id" gorm:"type:uuid;not null;index"`
	UserID    uuid.UUID  `json:"user_id" gorm:"type:uuid;not null;index"`
	BookingID uuid.UUID  `json:"booking_id" gorm:"type:uuid;not null"` // Verify user completed the trip
	Rating    int        `json:"rating" gorm:"not null"`               // 1-5 stars
	Title     string     `json:"title" gorm:"size:200"`
	Comment   string     `json:"comment" gorm:"type:text"`
	CreatedAt time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Trip    *Trip    `json:"trip,omitempty" gorm:"foreignKey:TripID"`
	User    *User    `json:"user,omitempty" gorm:"foreignKey:UserID"`
	Booking *Booking `json:"booking,omitempty" gorm:"foreignKey:BookingID"`
}

// TableName overrides the table name
func (Review) TableName() string {
	return "reviews"
}

// ReviewStats holds aggregated review statistics for a trip or route
type ReviewStats struct {
	TotalReviews  int64   `json:"total_reviews"`
	AverageRating float64 `json:"average_rating"`
	Rating5Count  int64   `json:"rating_5_count"`
	Rating4Count  int64   `json:"rating_4_count"`
	Rating3Count  int64   `json:"rating_3_count"`
	Rating2Count  int64   `json:"rating_2_count"`
	Rating1Count  int64   `json:"rating_1_count"`
}
