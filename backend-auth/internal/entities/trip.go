package entities

import (
	"time"

	"github.com/google/uuid"
)

// TripStatus represents the status of a trip
type TripStatus string

const (
	TripStatusScheduled TripStatus = "scheduled" // Trip is scheduled but not started
	TripStatusActive    TripStatus = "active"    // Trip is currently running
	TripStatusCompleted TripStatus = "completed" // Trip has been completed
	TripStatusCancelled TripStatus = "cancelled" // Trip has been cancelled
)

// Trip represents a scheduled bus trip
type Trip struct {
	ID        uuid.UUID   `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RouteID   uuid.UUID   `json:"route_id" gorm:"type:uuid;not null;index"` // Foreign key to routes
	BusID     *uuid.UUID  `json:"bus_id,omitempty" gorm:"type:uuid;index"`   // Foreign key to buses (nullable before assignment)
	StartTime time.Time   `json:"start_time" gorm:"not null;index"`          // Departure date and time
	EndTime   time.Time   `json:"end_time" gorm:"not null;index"`            // Expected arrival date and time
	Price     float64     `json:"price" gorm:"not null"`                     // Price for this specific trip
	Status    TripStatus  `json:"status" gorm:"type:varchar(20);not null;default:'scheduled'"`
	DriverID  *uuid.UUID  `json:"driver_id,omitempty" gorm:"type:uuid"`      // Foreign key to driver (future enhancement)
	Notes     *string     `json:"notes,omitempty"`                           // Admin notes
	CreatedAt time.Time   `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt time.Time   `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt *time.Time  `json:"deleted_at,omitempty" gorm:"index"`
	
	// Relations (will be loaded separately)
	Route     *Route      `json:"route,omitempty" gorm:"foreignKey:RouteID"`
	Bus       *Bus        `json:"bus,omitempty" gorm:"foreignKey:BusID"`
}

// TableName overrides the table name
func (Trip) TableName() string {
	return "trips"
}

// HasScheduleConflict checks if this trip conflicts with another trip
func (t *Trip) HasScheduleConflict(other *Trip) bool {
	// Two trips conflict if they overlap in time
	// They DON'T conflict if:
	//   - This trip ends before other starts (t.EndTime <= other.StartTime)
	//   - This trip starts after other ends (t.StartTime >= other.EndTime)
	// So they DO conflict if NOT (above conditions):
	return !(t.EndTime.Before(other.StartTime) || t.EndTime.Equal(other.StartTime) ||
		t.StartTime.After(other.EndTime) || t.StartTime.Equal(other.EndTime))
}
