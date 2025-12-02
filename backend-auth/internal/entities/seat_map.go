package entities

import (
	"time"

	"github.com/google/uuid"
)

// SeatType represents the type of seat
type SeatType string

const (
	SeatTypeStandard    SeatType = "standard"
	SeatTypeVIP         SeatType = "vip"
	SeatTypeSleeper     SeatType = "sleeper"
	SeatTypeAisle       SeatType = "aisle"       // Gap/walkway - not bookable
	SeatTypeUnavailable SeatType = "unavailable" // Blocked seat
)

// SeatPosition represents the position of a seat in the row
type SeatPosition string

const (
	SeatPositionLeft   SeatPosition = "left"
	SeatPositionMiddle SeatPosition = "middle"
	SeatPositionRight  SeatPosition = "right"
	SeatPositionAisle  SeatPosition = "aisle"
)

// SeatMap represents a bus seat layout template
type SeatMap struct {
	ID          uuid.UUID  `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Name        string     `json:"name" gorm:"not null"`                        // e.g., "Standard 40-seater", "VIP 24-seater"
	Description *string    `json:"description,omitempty"`                       // Optional description
	Rows        int        `json:"rows" gorm:"not null;default:10"`             // Number of rows
	Columns     int        `json:"columns" gorm:"not null;default:4"`           // Columns per row (e.g., 4 for 2+2 layout)
	TotalSeats  int        `json:"total_seats" gorm:"not null;default:40"`      // Total bookable seats
	BusType     string     `json:"bus_type" gorm:"not null;default:'Standard'"` // Standard, VIP, Sleeper
	IsActive    bool       `json:"is_active" gorm:"default:true"`               // Whether this template is active
	CreatedAt   time.Time  `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt   time.Time  `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt   *time.Time `json:"deleted_at,omitempty" gorm:"index"`

	// Relations
	Seats []*Seat `json:"seats,omitempty" gorm:"foreignKey:SeatMapID"`
}

// TableName overrides the table name
func (SeatMap) TableName() string {
	return "seat_maps"
}

// Seat represents an individual seat in a seat map
type Seat struct {
	ID              uuid.UUID    `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	SeatMapID       uuid.UUID    `json:"seat_map_id" gorm:"type:uuid;not null;index"`
	SeatNumber      string       `json:"seat_number" gorm:"not null"` // e.g., "1A", "1B", "2A"
	Row             int          `json:"row" gorm:"not null"`         // Row number (1-based)
	Column          int          `json:"column" gorm:"not null"`      // Column position (0-based)
	SeatType        SeatType     `json:"seat_type" gorm:"type:varchar(20);not null;default:'standard'"`
	Position        SeatPosition `json:"position" gorm:"type:varchar(20);not null;default:'left'"` // left, right, middle, aisle
	PriceMultiplier float64      `json:"price_multiplier" gorm:"not null;default:1.0"`             // 1.0 for standard, 1.5 for VIP, etc.
	IsBookable      bool         `json:"is_bookable" gorm:"default:true"`                          // Can this seat be booked?
	Label           *string      `json:"label,omitempty"`                                          // Optional label override
	CreatedAt       time.Time    `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt       time.Time    `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	SeatMap *SeatMap `json:"-" gorm:"foreignKey:SeatMapID"`
}

// TableName overrides the table name
func (Seat) TableName() string {
	return "seats"
}

// SeatTypeConfig defines the configuration for each seat type
type SeatTypeConfig struct {
	Type            SeatType `json:"type"`
	Name            string   `json:"name"`
	Color           string   `json:"color"`            // Hex color for UI
	PriceMultiplier float64  `json:"price_multiplier"` // Default price multiplier
	IsBookable      bool     `json:"is_bookable"`
}

// DefaultSeatTypeConfigs returns the default configurations for all seat types
func DefaultSeatTypeConfigs() []SeatTypeConfig {
	return []SeatTypeConfig{
		{Type: SeatTypeStandard, Name: "Standard", Color: "#3B82F6", PriceMultiplier: 1.0, IsBookable: true},
		{Type: SeatTypeVIP, Name: "VIP", Color: "#F59E0B", PriceMultiplier: 1.5, IsBookable: true},
		{Type: SeatTypeSleeper, Name: "Sleeper", Color: "#8B5CF6", PriceMultiplier: 2.0, IsBookable: true},
		{Type: SeatTypeAisle, Name: "Aisle", Color: "#E5E7EB", PriceMultiplier: 0, IsBookable: false},
		{Type: SeatTypeUnavailable, Name: "Unavailable", Color: "#EF4444", PriceMultiplier: 0, IsBookable: false},
	}
}

// GenerateDefaultSeats generates a default seat layout for a seat map
func (sm *SeatMap) GenerateDefaultSeats() []*Seat {
	seats := make([]*Seat, 0)
	seatNumber := 1

	for row := 1; row <= sm.Rows; row++ {
		for col := 0; col < sm.Columns; col++ {
			// Determine position based on column
			var position SeatPosition
			if sm.Columns == 4 {
				// 2+2 layout with aisle in middle
				switch col {
				case 0:
					position = SeatPositionLeft
				case 1:
					position = SeatPositionMiddle
				case 2:
					position = SeatPositionMiddle
				case 3:
					position = SeatPositionRight
				}
			} else if sm.Columns == 5 {
				// 2+1+2 layout
				switch col {
				case 0:
					position = SeatPositionLeft
				case 1:
					position = SeatPositionMiddle
				case 2:
					position = SeatPositionAisle
				case 3:
					position = SeatPositionMiddle
				case 4:
					position = SeatPositionRight
				}
			} else {
				position = SeatPositionMiddle
			}

			// Generate seat number label (e.g., "1A", "1B")
			seatLabel := generateSeatLabel(row, col)

			seat := &Seat{
				SeatMapID:       sm.ID,
				SeatNumber:      seatLabel,
				Row:             row,
				Column:          col,
				SeatType:        SeatTypeStandard,
				Position:        position,
				PriceMultiplier: 1.0,
				IsBookable:      true,
			}

			seats = append(seats, seat)
			seatNumber++
		}
	}

	return seats
}

// generateSeatLabel creates a seat label like "1A", "1B", etc.
func generateSeatLabel(row, col int) string {
	// Convert column to letter (0=A, 1=B, 2=C, etc.)
	letter := string(rune('A' + col))
	return string(rune('0'+row/10)) + string(rune('0'+row%10)) + letter
}

// CountBookableSeats counts the number of bookable seats
func (sm *SeatMap) CountBookableSeats() int {
	count := 0
	for _, seat := range sm.Seats {
		if seat.IsBookable {
			count++
		}
	}
	return count
}
