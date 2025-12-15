package entities

import (
	"time"

	"github.com/google/uuid"
)

// BookingAnalytics aggregates booking metrics for reporting
// Pre-computed metrics to avoid expensive queries on large datasets
type BookingAnalytics struct {
	ID                  uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	Date                time.Time `json:"date" gorm:"not null;uniqueIndex:idx_analytics_date"`
	TotalBookings       int       `json:"total_bookings" gorm:"default:0"`
	ConfirmedBookings   int       `json:"confirmed_bookings" gorm:"default:0"`
	CancelledBookings   int       `json:"cancelled_bookings" gorm:"default:0"`
	PendingBookings     int       `json:"pending_bookings" gorm:"default:0"`
	TotalRevenue        float64   `json:"total_revenue" gorm:"default:0"`
	TotalSeatsBooked    int       `json:"total_seats_booked" gorm:"default:0"`
	AverageBookingValue float64   `json:"average_booking_value" gorm:"default:0"`
	ConversionRate      float64   `json:"conversion_rate" gorm:"default:0"` // confirmed / total
	CreatedAt           time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt           time.Time `json:"updated_at" gorm:"autoUpdateTime"`
}

// TableName overrides the table name
func (BookingAnalytics) TableName() string {
	return "booking_analytics"
}

// RouteAnalytics tracks performance metrics per route
type RouteAnalytics struct {
	ID                   uuid.UUID `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RouteID              uuid.UUID `json:"route_id" gorm:"type:uuid;not null;index"`
	Date                 time.Time `json:"date" gorm:"not null;index"`
	TotalBookings        int       `json:"total_bookings" gorm:"default:0"`
	TotalRevenue         float64   `json:"total_revenue" gorm:"default:0"`
	AverageOccupancyRate float64   `json:"average_occupancy_rate" gorm:"default:0"` // % of seats filled
	TotalSeatsBooked     int       `json:"total_seats_booked" gorm:"default:0"`
	TotalSeatsAvailable  int       `json:"total_seats_available" gorm:"default:0"`
	CreatedAt            time.Time `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt            time.Time `json:"updated_at" gorm:"autoUpdateTime"`

	// Relations
	Route *Route `json:"route,omitempty" gorm:"foreignKey:RouteID"`
}

// TableName overrides the table name
func (RouteAnalytics) TableName() string {
	return "route_analytics"
}
