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
}
