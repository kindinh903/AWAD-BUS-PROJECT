package entities

import (
	"time"

	"github.com/google/uuid"
)

// RouteStopType represents the type of route stop
type RouteStopType string

const (
	RouteStopTypePickup  RouteStopType = "pickup"
	RouteStopTypeDropoff RouteStopType = "dropoff"
)

// RouteStop represents a pickup or dropoff point along a route
type RouteStop struct {
	ID         uuid.UUID     `json:"id" gorm:"type:uuid;primaryKey;default:gen_random_uuid()"`
	RouteID    uuid.UUID     `json:"route_id" gorm:"type:uuid;not null;index"`
	Name       string        `json:"name" gorm:"not null"`                          // e.g., "Ben Xe Mien Dong"
	Type       RouteStopType `json:"type" gorm:"type:varchar(20);not null;index"`  // pickup or dropoff
	OrderIndex int           `json:"order_index" gorm:"not null"`                   // Order within the type (pickup or dropoff)
	Address    *string       `json:"address,omitempty"`                             // Full address
	Latitude   *float64      `json:"latitude,omitempty"`                            // GPS coordinates (optional)
	Longitude  *float64      `json:"longitude,omitempty"`                           // GPS coordinates (optional)
	CreatedAt  time.Time     `json:"created_at" gorm:"autoCreateTime"`
	UpdatedAt  time.Time     `json:"updated_at" gorm:"autoUpdateTime"`
	DeletedAt  *time.Time    `json:"deleted_at,omitempty" gorm:"index"`

	// Relation (will be loaded separately)
	Route *Route `json:"route,omitempty" gorm:"foreignKey:RouteID"`
}

// TableName overrides the table name
func (RouteStop) TableName() string {
	return "route_stops"
}
