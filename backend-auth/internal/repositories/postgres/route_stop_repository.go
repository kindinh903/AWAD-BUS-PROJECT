package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

type routeStopRepository struct {
	db *gorm.DB
}

// NewRouteStopRepository creates a new route stop repository
func NewRouteStopRepository(db *gorm.DB) repositories.RouteStopRepository {
	return &routeStopRepository{db: db}
}

func (r *routeStopRepository) Create(ctx context.Context, stop *entities.RouteStop) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Check if order_index already exists for this route and type
		var existingStop entities.RouteStop
		err := tx.Where("route_id = ? AND type = ? AND order_index = ? AND deleted_at IS NULL", 
			stop.RouteID, stop.Type, stop.OrderIndex).
			First(&existingStop).Error
		
		if err == nil {
			// Order index already exists, need to shift others
			if err := r.shiftStopsUpFrom(tx, stop.RouteID, stop.Type, stop.OrderIndex); err != nil {
				return fmt.Errorf("failed to shift stops: %w", err)
			}
		} else if err != gorm.ErrRecordNotFound {
			return fmt.Errorf("error checking existing stop: %w", err)
		}

		// Create the new stop
		if err := tx.Create(stop).Error; err != nil {
			return fmt.Errorf("failed to create stop: %w", err)
		}

		return nil
	})
}

func (r *routeStopRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.RouteStop, error) {
	var stop entities.RouteStop
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&stop).Error
	if err != nil {
		return nil, err
	}
	return &stop, nil
}

func (r *routeStopRepository) GetByRouteID(ctx context.Context, routeID uuid.UUID) ([]*entities.RouteStop, error) {
	var stops []*entities.RouteStop
	err := r.db.WithContext(ctx).
		Where("route_id = ? AND deleted_at IS NULL", routeID).
		Order("type ASC, order_index ASC").
		Find(&stops).Error
	return stops, err
}

func (r *routeStopRepository) GetByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) ([]*entities.RouteStop, error) {
	var stops []*entities.RouteStop
	err := r.db.WithContext(ctx).
		Where("route_id = ? AND type = ? AND deleted_at IS NULL", routeID, stopType).
		Order("order_index ASC").
		Find(&stops).Error
	return stops, err
}

func (r *routeStopRepository) Update(ctx context.Context, stop *entities.RouteStop) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get the current stop to check if order_index is changing
		var currentStop entities.RouteStop
		if err := tx.Where("id = ?", stop.ID).First(&currentStop).Error; err != nil {
			return fmt.Errorf("stop not found: %w", err)
		}

		// If order_index is changing, handle reordering
		if currentStop.OrderIndex != stop.OrderIndex {
			// Check if new order_index is already taken
			var existingStop entities.RouteStop
			err := tx.Where("route_id = ? AND type = ? AND order_index = ? AND id != ? AND deleted_at IS NULL",
				stop.RouteID, stop.Type, stop.OrderIndex, stop.ID).
				First(&existingStop).Error

			if err == nil {
				// New order exists, need to shift
				if stop.OrderIndex > currentStop.OrderIndex {
					// Moving down: shift stops between old and new position up
					if err := r.shiftStopsDown(tx, stop.RouteID, stop.Type, currentStop.OrderIndex+1, stop.OrderIndex); err != nil {
						return err
					}
				} else {
					// Moving up: shift stops between new and old position down
					if err := r.shiftStopsUpRange(tx, stop.RouteID, stop.Type, stop.OrderIndex, currentStop.OrderIndex-1); err != nil {
						return err
					}
				}
			} else if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("error checking order conflict: %w", err)
			}
		}

		// Update the stop
		stop.UpdatedAt = time.Now()
		if err := tx.Save(stop).Error; err != nil {
			return fmt.Errorf("failed to update stop: %w", err)
		}

		return nil
	})
}

func (r *routeStopRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get the stop to know its order and type
		var stop entities.RouteStop
		if err := tx.Where("id = ?", id).First(&stop).Error; err != nil {
			return fmt.Errorf("stop not found: %w", err)
		}

		// Soft delete the stop
		if err := tx.Model(&entities.RouteStop{}).
			Where("id = ?", id).
			Update("deleted_at", time.Now()).Error; err != nil {
			return fmt.Errorf("failed to delete stop: %w", err)
		}

		// Shift remaining stops down to fill the gap
		if err := r.shiftStopsDown(tx, stop.RouteID, stop.Type, stop.OrderIndex+1, 999999); err != nil {
			return fmt.Errorf("failed to reorder stops: %w", err)
		}

		return nil
	})
}

func (r *routeStopRepository) ReorderStops(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Get all stops of this type for the route
		var stops []*entities.RouteStop
		if err := tx.Where("route_id = ? AND type = ? AND deleted_at IS NULL", routeID, stopType).
			Order("order_index ASC").
			Find(&stops).Error; err != nil {
			return err
		}

		// Reassign order_index sequentially
		for i, stop := range stops {
			if stop.OrderIndex != i+1 {
				if err := tx.Model(stop).Update("order_index", i+1).Error; err != nil {
					return err
				}
			}
		}

		return nil
	})
}

func (r *routeStopRepository) CountByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) (int64, error) {
	var count int64
	err := r.db.WithContext(ctx).
		Model(&entities.RouteStop{}).
		Where("route_id = ? AND type = ? AND deleted_at IS NULL", routeID, stopType).
		Count(&count).Error
	return count, err
}

// Helper functions for reordering

// shiftStopsUpFrom shifts all stops with order_index >= fromIndex up by 1
func (r *routeStopRepository) shiftStopsUpFrom(tx *gorm.DB, routeID uuid.UUID, stopType entities.RouteStopType, fromIndex int) error {
	return tx.Model(&entities.RouteStop{}).
		Where("route_id = ? AND type = ? AND order_index >= ? AND deleted_at IS NULL", routeID, stopType, fromIndex).
		UpdateColumn("order_index", gorm.Expr("order_index + 1")).Error
}

// shiftStopsUpRange shifts stops in the range [fromIndex, toIndex] up by 1
func (r *routeStopRepository) shiftStopsUpRange(tx *gorm.DB, routeID uuid.UUID, stopType entities.RouteStopType, fromIndex, toIndex int) error {
	return tx.Model(&entities.RouteStop{}).
		Where("route_id = ? AND type = ? AND order_index >= ? AND order_index <= ? AND deleted_at IS NULL", 
			routeID, stopType, fromIndex, toIndex).
		UpdateColumn("order_index", gorm.Expr("order_index + 1")).Error
}

// shiftStopsDown shifts all stops with order_index >= fromIndex down by 1
func (r *routeStopRepository) shiftStopsDown(tx *gorm.DB, routeID uuid.UUID, stopType entities.RouteStopType, fromIndex, toIndex int) error {
	return tx.Model(&entities.RouteStop{}).
		Where("route_id = ? AND type = ? AND order_index >= ? AND order_index <= ? AND deleted_at IS NULL", 
			routeID, stopType, fromIndex, toIndex).
		UpdateColumn("order_index", gorm.Expr("order_index - 1")).Error
}
