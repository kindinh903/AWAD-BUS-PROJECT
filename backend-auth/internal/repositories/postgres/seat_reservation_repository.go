package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type seatReservationRepository struct {
	db *gorm.DB
}

// NewSeatReservationRepository creates a new seat reservation repository
func NewSeatReservationRepository(db *gorm.DB) repositories.SeatReservationRepository {
	return &seatReservationRepository{db: db}
}

func (r *seatReservationRepository) Create(ctx context.Context, reservation *entities.SeatReservation) error {
	return r.db.WithContext(ctx).Create(reservation).Error
}

func (r *seatReservationRepository) GetByTripAndSeat(ctx context.Context, tripID, seatID uuid.UUID) (*entities.SeatReservation, error) {
	var reservation entities.SeatReservation
	err := r.db.WithContext(ctx).
		Where("trip_id = ? AND seat_id = ? AND expires_at > ?", tripID, seatID, time.Now()).
		First(&reservation).Error
	if err != nil {
		return nil, err
	}
	return &reservation, nil
}

func (r *seatReservationRepository) GetBySessionID(ctx context.Context, sessionID string) ([]*entities.SeatReservation, error) {
	var reservations []*entities.SeatReservation
	err := r.db.WithContext(ctx).
		Where("session_id = ? AND expires_at > ?", sessionID, time.Now()).
		Find(&reservations).Error
	return reservations, err
}

func (r *seatReservationRepository) GetByTripID(ctx context.Context, tripID uuid.UUID) ([]*entities.SeatReservation, error) {
	var reservations []*entities.SeatReservation
	err := r.db.WithContext(ctx).
		Where("trip_id = ? AND expires_at > ?", tripID, time.Now()).
		Find(&reservations).Error
	return reservations, err
}

func (r *seatReservationRepository) DeleteExpired(ctx context.Context) error {
	return r.db.WithContext(ctx).
		Where("expires_at < ?", time.Now()).
		Delete(&entities.SeatReservation{}).Error
}

func (r *seatReservationRepository) DeleteBySessionID(ctx context.Context, sessionID string) error {
	return r.db.WithContext(ctx).
		Where("session_id = ?", sessionID).
		Delete(&entities.SeatReservation{}).Error
}

func (r *seatReservationRepository) DeleteByBookingID(ctx context.Context, bookingID uuid.UUID) error {
	return r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Delete(&entities.SeatReservation{}).Error
}

func (r *seatReservationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.SeatReservation{}, "id = ?", id).Error
}

func (r *seatReservationRepository) IsSeatsAvailable(ctx context.Context, tripID uuid.UUID, seatIDs []uuid.UUID) (bool, error) {
	var count int64
	
	// Check if any seats are already booked
	err := r.db.WithContext(ctx).
		Model(&entities.Passenger{}).
		Joins("JOIN bookings ON bookings.id = passengers.booking_id").
		Where("bookings.trip_id = ? AND passengers.seat_id IN ? AND bookings.status IN ?",
			tripID, seatIDs, []string{
				string(entities.BookingStatusConfirmed),
				string(entities.BookingStatusPending),
			}).
		Count(&count).Error
	
	if err != nil {
		return false, err
	}
	
	if count > 0 {
		return false, nil
	}
	
	// Check if any seats are reserved by another session
	err = r.db.WithContext(ctx).
		Model(&entities.SeatReservation{}).
		Where("trip_id = ? AND seat_id IN ? AND expires_at > ?", tripID, seatIDs, time.Now()).
		Count(&count).Error
	
	if err != nil {
		return false, err
	}
	
	return count == 0, nil
}
