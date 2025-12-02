package entities

import (
	"time"

	"github.com/google/uuid"
)

// Route represents a bus route between two locations
type Route struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Origin          string     `json:"origin" gorm:"not null"`                    // e.g., "Ho Chi Minh City"
	Destination     string     `json:"destination" gorm:"not null"`               // e.g., "Da Nang"
	DurationMinutes int        `json:"duration_minutes" gorm:"not null"`          // Estimated duration in minutes
	Distance        *float64   `json:"distance,omitempty"`                        // Distance in kilometers
	BasePrice       float64    `json:"base_price" gorm:"not null"`                // Base price for this route
	Description     *string    `json:"description,omitempty"`                     // Route description
	IsActive        bool       `json:"is_active" gorm:"default:true"`             // Whether this route is active
	CreatedAt       time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt       *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName overrides the table name
func (Route) TableName() string {
	return "routes"
}
