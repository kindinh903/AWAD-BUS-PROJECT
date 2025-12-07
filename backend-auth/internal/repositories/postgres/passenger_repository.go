package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type passengerRepository struct {
	db *gorm.DB
}

// NewPassengerRepository creates a new passenger repository
func NewPassengerRepository(db *gorm.DB) repositories.PassengerRepository {
	return &passengerRepository{db: db}
}

func (r *passengerRepository) Create(ctx context.Context, passenger *entities.Passenger) error {
	return r.db.WithContext(ctx).Create(passenger).Error
}

func (r *passengerRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Passenger, error) {
	var passenger entities.Passenger
	err := r.db.WithContext(ctx).First(&passenger, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &passenger, nil
}

func (r *passengerRepository) GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Passenger, error) {
	var passengers []*entities.Passenger
	err := r.db.WithContext(ctx).Where("booking_id = ?", bookingID).Find(&passengers).Error
	return passengers, err
}

func (r *passengerRepository) BulkCreate(ctx context.Context, passengers []*entities.Passenger) error {
	if len(passengers) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&passengers).Error
}

func (r *passengerRepository) Update(ctx context.Context, passenger *entities.Passenger) error {
	return r.db.WithContext(ctx).Save(passenger).Error
}

func (r *passengerRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.Passenger{}, "id = ?", id).Error
}
