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

type seatMapRepository struct {
	db *gorm.DB
}

// NewSeatMapRepository creates a new seat map repository
func NewSeatMapRepository(db *gorm.DB) repositories.SeatMapRepository {
	return &seatMapRepository{db: db}
}

func (r *seatMapRepository) Create(ctx context.Context, seatMap *entities.SeatMap) error {
	return r.db.WithContext(ctx).Create(seatMap).Error
}

func (r *seatMapRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error) {
	var seatMap entities.SeatMap
	err := r.db.WithContext(ctx).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&seatMap).Error
	if err != nil {
		return nil, err
	}
	return &seatMap, nil
}

func (r *seatMapRepository) GetAll(ctx context.Context) ([]*entities.SeatMap, error) {
	var seatMaps []*entities.SeatMap
	err := r.db.WithContext(ctx).
		Where("deleted_at IS NULL").
		Order("created_at DESC").
		Find(&seatMaps).Error
	return seatMaps, err
}

func (r *seatMapRepository) Update(ctx context.Context, seatMap *entities.SeatMap) error {
	return r.db.WithContext(ctx).Save(seatMap).Error
}

func (r *seatMapRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// Soft delete all seats first
		if err := tx.Model(&entities.Seat{}).
			Where("seat_map_id = ?", id).
			Delete(&entities.Seat{}).Error; err != nil {
			return fmt.Errorf("failed to delete seats: %w", err)
		}

		// Soft delete the seat map
		if err := tx.Model(&entities.SeatMap{}).
			Where("id = ?", id).
			Update("deleted_at", time.Now()).Error; err != nil {
			return fmt.Errorf("failed to delete seat map: %w", err)
		}

		return nil
	})
}

func (r *seatMapRepository) GetWithSeats(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error) {
	var seatMap entities.SeatMap
	err := r.db.WithContext(ctx).
		Preload("Seats", func(db *gorm.DB) *gorm.DB {
			return db.Order("row ASC, \"column\" ASC")
		}).
		Where("id = ? AND deleted_at IS NULL", id).
		First(&seatMap).Error
	if err != nil {
		return nil, err
	}
	return &seatMap, nil
}

func (r *seatMapRepository) CreateSeat(ctx context.Context, seat *entities.Seat) error {
	return r.db.WithContext(ctx).Create(seat).Error
}

func (r *seatMapRepository) UpdateSeat(ctx context.Context, seat *entities.Seat) error {
	return r.db.WithContext(ctx).Save(seat).Error
}

func (r *seatMapRepository) DeleteSeat(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("id = ?", id).
		Delete(&entities.Seat{}).Error
}

func (r *seatMapRepository) GetSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) ([]*entities.Seat, error) {
	var seats []*entities.Seat
	err := r.db.WithContext(ctx).
		Where("seat_map_id = ?", seatMapID).
		Order("row ASC, \"column\" ASC").
		Find(&seats).Error
	return seats, err
}

func (r *seatMapRepository) BulkCreateSeats(ctx context.Context, seats []*entities.Seat) error {
	if len(seats) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).CreateInBatches(seats, 100).Error
}

func (r *seatMapRepository) DeleteSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("seat_map_id = ?", seatMapID).
		Delete(&entities.Seat{}).Error
}

// UpdateBusWithSeatMap assigns a seat map to a bus
func (r *seatMapRepository) UpdateBusWithSeatMap(ctx context.Context, busID, seatMapID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.Bus{}).
		Where("id = ?", busID).
		Updates(map[string]interface{}{
			"seat_map_id": seatMapID,
		}).Error
}
