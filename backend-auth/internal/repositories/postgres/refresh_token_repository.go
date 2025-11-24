package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"gorm.io/gorm"
)

type refreshTokenRepository struct {
	db *gorm.DB
}

// NewRefreshTokenRepository creates a new refresh token repository
func NewRefreshTokenRepository(db *gorm.DB) *refreshTokenRepository {
	return &refreshTokenRepository{db: db}
}

func (r *refreshTokenRepository) Create(ctx context.Context, token *entities.RefreshToken) error {
	return r.db.WithContext(ctx).Create(token).Error
}

func (r *refreshTokenRepository) GetByToken(ctx context.Context, token string) (*entities.RefreshToken, error) {
	var refreshToken entities.RefreshToken
	err := r.db.WithContext(ctx).
		Where("token = ? AND is_revoked = false AND expires_at > ?", token, time.Now()).
		First(&refreshToken).Error
	if err != nil {
		return nil, err
	}
	return &refreshToken, nil
}

func (r *refreshTokenRepository) Revoke(ctx context.Context, token string) error {
	return r.db.WithContext(ctx).
		Model(&entities.RefreshToken{}).
		Where("token = ?", token).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
		}).Error
}

func (r *refreshTokenRepository) RevokeAllForUser(ctx context.Context, userID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.RefreshToken{}).
		Where("user_id = ? AND is_revoked = false", userID).
		Updates(map[string]interface{}{
			"is_revoked": true,
			"revoked_at": time.Now(),
		}).Error
}

func (r *refreshTokenRepository) DeleteExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).
		Where("expires_at < ? OR (is_revoked = true AND revoked_at < ?)", time.Now(), time.Now().AddDate(0, 0, -30)).
		Delete(&entities.RefreshToken{}).Error
}
