package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"gorm.io/gorm"
)

type userRepository struct {
	db *gorm.DB
}

// NewUserRepository creates a new user repository
func NewUserRepository(db *gorm.DB) *userRepository {
	return &userRepository{db: db}
}

func (r *userRepository) Create(ctx context.Context, user *entities.User) error {
	return r.db.WithContext(ctx).Create(user).Error
}

func (r *userRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error) {
	var user entities.User
	err := r.db.WithContext(ctx).Where("id = ? AND deleted_at IS NULL", id).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByEmail(ctx context.Context, email string) (*entities.User, error) {
	var user entities.User
	err := r.db.WithContext(ctx).Where("email = ? AND deleted_at IS NULL", email).First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) GetByOAuthID(ctx context.Context, oauthID string, provider string) (*entities.User, error) {
	var user entities.User
	err := r.db.WithContext(ctx).
		Where("oauth_id = ? AND oauth_provider = ? AND deleted_at IS NULL", oauthID, provider).
		First(&user).Error
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepository) Update(ctx context.Context, user *entities.User) error {
	return r.db.WithContext(ctx).Save(user).Error
}

func (r *userRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Model(&entities.User{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}

// GetByRole returns all users with a specific role
func (r *userRepository) GetByRole(ctx context.Context, role entities.Role) ([]*entities.User, error) {
	var users []*entities.User
	err := r.db.WithContext(ctx).
		Where("role = ? AND deleted_at IS NULL", role).
		Order("created_at DESC").
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

// GetAll returns all users (excluding deleted)
func (r *userRepository) GetAll(ctx context.Context) ([]*entities.User, error) {
	var users []*entities.User
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&users).Error
	if err != nil {
		return nil, err
	}
	return users, nil
}

// SetActive updates user active status
func (r *userRepository) SetActive(ctx context.Context, id uuid.UUID, active bool) error {
	return r.db.WithContext(ctx).
		Model(&entities.User{}).
		Where("id = ?", id).
		Update("is_active", active).Error
}
