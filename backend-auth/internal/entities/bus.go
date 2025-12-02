package entities

import (
	"time"

	"github.com/google/uuid"
)

// BusStatus represents the operational status of a bus
type BusStatus string

const (
	BusStatusActive      BusStatus = "active"
	BusStatusMaintenance BusStatus = "maintenance"
	BusStatusInactive    BusStatus = "inactive"
)

// Bus represents a physical bus in the fleet
type Bus struct {
	ID           uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name         string     `json:"name" gorm:"not null"`                          // e.g., "Bus A1", "VIP Express 01"
	PlateNumber  string     `json:"plate_number" gorm:"uniqueIndex;not null"`      // e.g., "29B-123.45"
	SeatMapID    *uuid.UUID `json:"seat_map_id,omitempty" gorm:"type:uuid"`        // Reference to seat configuration
	TotalSeats   int        `json:"total_seats" gorm:"not null;default:40"`        // Total number of seats
	BusType      string     `json:"bus_type" gorm:"not null;default:'Standard'"`   // Standard, VIP, Sleeper
	Manufacturer *string    `json:"manufacturer,omitempty"`                        // e.g., "Hyundai", "Thaco"
	Model        *string    `json:"model,omitempty"`                               // e.g., "Universe", "TB120S"
	Year         *int       `json:"year,omitempty"`                                // Manufacturing year
	Status       BusStatus  `json:"status" gorm:"type:varchar(20);default:'active'"` // active, maintenance, inactive
	CreatedAt    time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt    time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt    *time.Time `json:"deleted_at,omitempty" gorm:"index"`
}

// TableName overrides the table name
func (Bus) TableName() string {
	return "buses"
}
