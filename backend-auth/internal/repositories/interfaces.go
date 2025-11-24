package repositories

import (
	"context"

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
