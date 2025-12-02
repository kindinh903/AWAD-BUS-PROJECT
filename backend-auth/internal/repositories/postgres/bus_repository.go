package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

type busRepository struct {
	db *gorm.DB
}

// NewBusRepository creates a new bus repository
func NewBusRepository(db *gorm.DB) repositories.BusRepository {
	return &busRepository{db: db}
}

func (r *busRepository) Create(ctx context.Context, bus *entities.Bus) error {
	return r.db.WithContext(ctx).Create(bus).Error
}

func (r *busRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Bus, error) {
	var bus entities.Bus
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&bus).Error
	if err != nil {
		return nil, err
	}
	return &bus, nil
}

func (r *busRepository) GetAll(ctx context.Context) ([]*entities.Bus, error) {
	var buses []*entities.Bus
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&buses).Error
	return buses, err
}

// GetAvailable returns buses that don't have conflicting trips in the given time range
func (r *busRepository) GetAvailable(ctx context.Context, startTime, endTime time.Time) ([]*entities.Bus, error) {
	var buses []*entities.Bus
	
	// Find buses that don't have any trips overlapping with the given time range
	// A trip overlaps if NOT (trip.end_time <= startTime OR trip.start_time >= endTime)
	// We want buses that DON'T have such overlapping trips
	err := r.db.WithContext(ctx).
		Where("status = ? AND deleted_at IS NULL", entities.BusStatusActive).
		Where(`id NOT IN (
			SELECT bus_id FROM trips 
			WHERE bus_id IS NOT NULL 
			AND deleted_at IS NULL
			AND status IN (?, ?)
			AND NOT (end_time <= ? OR start_time >= ?)
		)`, entities.TripStatusScheduled, entities.TripStatusActive, startTime, endTime).
		Order("name ASC").
		Find(&buses).Error
		
	return buses, err
}

func (r *busRepository) Update(ctx context.Context, bus *entities.Bus) error {
	return r.db.WithContext(ctx).Save(bus).Error
}

func (r *busRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.Bus{}).
		Where("id = ?", id).
		Update("deleted_at", time.Now()).Error
}
