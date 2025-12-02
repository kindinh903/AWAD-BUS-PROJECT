package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	GetByOAuthID(ctx context.Context, oauthID string, provider string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// RefreshTokenRepository defines the interface for refresh token operations
type RefreshTokenRepository interface {
	Create(ctx context.Context, token *entities.RefreshToken) error
	GetByToken(ctx context.Context, token string) (*entities.RefreshToken, error)
	Revoke(ctx context.Context, token string) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) error
}

// BusRepository defines the interface for bus data operations
type BusRepository interface {
	Create(ctx context.Context, bus *entities.Bus) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Bus, error)
	GetAll(ctx context.Context) ([]*entities.Bus, error)
	GetAvailable(ctx context.Context, startTime, endTime time.Time) ([]*entities.Bus, error)
	Update(ctx context.Context, bus *entities.Bus) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// RouteRepository defines the interface for route data operations
type RouteRepository interface {
	Create(ctx context.Context, route *entities.Route) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Route, error)
	GetAll(ctx context.Context) ([]*entities.Route, error)
	GetActiveRoutes(ctx context.Context) ([]*entities.Route, error)
	Update(ctx context.Context, route *entities.Route) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// TripRepository defines the interface for trip data operations
type TripRepository interface {
	Create(ctx context.Context, trip *entities.Trip) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Trip, error)
	GetAll(ctx context.Context) ([]*entities.Trip, error)
	GetByBusID(ctx context.Context, busID uuid.UUID, startTime, endTime time.Time) ([]*entities.Trip, error)
	AssignBus(ctx context.Context, tripID, busID uuid.UUID) error
	Update(ctx context.Context, trip *entities.Trip) error
	Delete(ctx context.Context, id uuid.UUID) error
	SearchTrips(ctx context.Context, options TripSearchOptions) (*PaginatedTrips, error)
}

// TripSearchOptions holds optional search filters for trips
type TripSearchOptions struct {
	Origin      string
	Destination string
	Date        time.Time
	BusType     *string
	Status      *string
	MinPrice    *float64
	MaxPrice    *float64
	// Sorting options
	SortBy    string // "price", "time", "duration", "departure"
	SortOrder string // "asc", "desc"
	// Pagination options
	Page     int // 1-based page number
	PageSize int // Items per page (default 10, max 100)
}

// PaginatedTrips represents a paginated response for trip searches
type PaginatedTrips struct {
	Data       []*entities.Trip `json:"data"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	PageSize   int              `json:"page_size"`
	TotalPages int              `json:"total_pages"`
}

// SearchTrips searches trips joined with route and bus information using filters
type TripSearchRepository interface {
	SearchTrips(ctx context.Context, opts TripSearchOptions) (*PaginatedTrips, error)
}

// SeatMapRepository defines the interface for seat map data operations
type SeatMapRepository interface {
	Create(ctx context.Context, seatMap *entities.SeatMap) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error)
	GetAll(ctx context.Context) ([]*entities.SeatMap, error)
	Update(ctx context.Context, seatMap *entities.SeatMap) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetWithSeats(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error)
	CreateSeat(ctx context.Context, seat *entities.Seat) error
	UpdateSeat(ctx context.Context, seat *entities.Seat) error
	DeleteSeat(ctx context.Context, id uuid.UUID) error
	GetSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) ([]*entities.Seat, error)
	BulkCreateSeats(ctx context.Context, seats []*entities.Seat) error
	DeleteSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) error
}

// RouteStopRepository defines the interface for route stop data operations
type RouteStopRepository interface {
	Create(ctx context.Context, stop *entities.RouteStop) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.RouteStop, error)
	GetByRouteID(ctx context.Context, routeID uuid.UUID) ([]*entities.RouteStop, error)
	GetByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) ([]*entities.RouteStop, error)
	Update(ctx context.Context, stop *entities.RouteStop) error
	Delete(ctx context.Context, id uuid.UUID) error
	ReorderStops(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) error
	CountByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) (int64, error)
}
