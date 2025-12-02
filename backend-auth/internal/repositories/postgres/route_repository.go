package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

type routeRepository struct {
	db *gorm.DB
}

// NewRouteRepository creates a new route repository
func NewRouteRepository(db *gorm.DB) repositories.RouteRepository {
	return &routeRepository{db: db}
}

func (r *routeRepository) Create(ctx context.Context, route *entities.Route) error {
	return r.db.WithContext(ctx).Create(route).Error
}

func (r *routeRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Route, error) {
	var route entities.Route
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&route).Error
	if err != nil {
		return nil, err
	}
	return &route, nil
}

func (r *routeRepository) GetAll(ctx context.Context) ([]*entities.Route, error) {
	var routes []*entities.Route
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("origin ASC, destination ASC").
		Find(&routes).Error
	return routes, err
}

func (r *routeRepository) GetActiveRoutes(ctx context.Context) ([]*entities.Route, error) {
	var routes []*entities.Route
	err := r.db.WithContext(ctx).
		Where("is_active = ? AND deleted_at IS NULL", true).
		Order("origin ASC, destination ASC").
		Find(&routes).Error
	return routes, err
}

func (r *routeRepository) Update(ctx context.Context, route *entities.Route) error {
	return r.db.WithContext(ctx).Save(route).Error
}

func (r *routeRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.Route{}).
		Where("id = ?", id).
		Update("deleted_at", time.Now()).Error
}
