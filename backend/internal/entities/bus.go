package entities

import (
	"database/sql/driver"
	"encoding/json"
	"time"

	"github.com/google/uuid"
	"github.com/lib/pq"
)

// BusStatus represents the operational status of a bus
type BusStatus string

const (
	BusStatusActive      BusStatus = "active"
	BusStatusMaintenance BusStatus = "maintenance"
	BusStatusInactive    BusStatus = "inactive"
)

// SeatLayout represents the seat configuration of a bus
type SeatLayout struct {
	Rows       int        `json:"rows"`
	Columns    int        `json:"columns"`
	TotalSeats int        `json:"total_seats"`
	Floors     int        `json:"floors"` // 1 or 2 for single/double decker
	Layout     [][]string `json:"layout"` // 2D array: "A1", "A2", "aisle", "empty"
}

// Scan implements sql.Scanner interface for JSONB
func (sl *SeatLayout) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return json.Unmarshal(bytes, sl)
}

// Value implements driver.Valuer interface for JSONB
func (sl SeatLayout) Value() (driver.Value, error) {
	return json.Marshal(sl)
}

// Bus represents a bus/vehicle in the fleet
type Bus struct {
	ID              uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	LicensePlate    string     `json:"license_plate" gorm:"uniqueIndex;not null"`
	BusType         string     `json:"bus_type" gorm:"not null"` // "sleeper", "seater", "semi-sleeper", "limousine"
	Manufacturer    string     `json:"manufacturer"`
	Model           string     `json:"model"`
	Year            int        `json:"year"`
	OperatorName    string         `json:"operator_name" gorm:"type:varchar(255)"` // Vietnamese bus operator name
	SeatLayout      SeatLayout     `json:"seat_layout" gorm:"type:jsonb;not null"`
	Amenities       pq.StringArray `json:"amenities" gorm:"type:text[]"` // ["wifi", "ac", "charging"]
	Status          BusStatus      `json:"status" gorm:"type:varchar(20);not null;default:'active'"`
	LastMaintenance *time.Time `json:"last_maintenance,omitempty"`
	CreatedAt       time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName overrides the table name
func (Bus) TableName() string {
	return "buses"
}
