package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type bookingRepository struct {
	db *gorm.DB
}

// NewBookingRepository creates a new booking repository
func NewBookingRepository(db *gorm.DB) repositories.BookingRepository {
	return &bookingRepository{db: db}
}

func (r *bookingRepository) Create(ctx context.Context, booking *entities.Booking) error {
	return r.db.WithContext(ctx).Create(booking).Error
}

func (r *bookingRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Booking, error) {
	var booking entities.Booking
	err := r.db.WithContext(ctx).First(&booking, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

func (r *bookingRepository) GetByReference(ctx context.Context, reference string) (*entities.Booking, error) {
	var booking entities.Booking
	err := r.db.WithContext(ctx).First(&booking, "booking_reference = ?", reference).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

func (r *bookingRepository) GetByUserID(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*entities.Booking, int64, error) {
	var bookings []*entities.Booking
	var total int64

	offset := (page - 1) * pageSize

	// Count total
	if err := r.db.WithContext(ctx).Model(&entities.Booking{}).
		Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Get paginated results
	err := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC").
		Limit(pageSize).
		Offset(offset).
		Find(&bookings).Error

	return bookings, total, err
}

func (r *bookingRepository) GetByGuestContact(ctx context.Context, email, phone string) ([]*entities.Booking, error) {
	var bookings []*entities.Booking
	err := r.db.WithContext(ctx).
		Where("is_guest_booking = ? AND (contact_email = ? OR contact_phone = ?)", true, email, phone).
		Order("created_at DESC").
		Find(&bookings).Error
	return bookings, err
}

func (r *bookingRepository) GetByTripID(ctx context.Context, tripID uuid.UUID) ([]*entities.Booking, error) {
	var bookings []*entities.Booking
	err := r.db.WithContext(ctx).
		Where("trip_id = ? AND status IN ?", tripID, []string{
			string(entities.BookingStatusConfirmed),
			string(entities.BookingStatusPending),
		}).
		Find(&bookings).Error
	return bookings, err
}

func (r *bookingRepository) Update(ctx context.Context, booking *entities.Booking) error {
	return r.db.WithContext(ctx).Save(booking).Error
}

func (r *bookingRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.Booking{}, "id = ?", id).Error
}

func (r *bookingRepository) ExpirePendingBookings(ctx context.Context) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entities.Booking{}).
		Where("status = ? AND expires_at IS NOT NULL AND expires_at < ?",
			entities.BookingStatusPending, now).
		Update("status", entities.BookingStatusExpired).Error
}

func (r *bookingRepository) GetWithDetails(ctx context.Context, id uuid.UUID) (*entities.Booking, error) {
	var booking entities.Booking
	err := r.db.WithContext(ctx).
		Preload("Trip").
		Preload("Trip.Route").
		Preload("Trip.Bus").
		Preload("Passengers").
		Preload("Tickets").
		Preload("User").
		First(&booking, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &booking, nil
}

// GetByStatus retrieves all bookings with a specific status
// Used by background jobs for trip reminders and analytics
func (r *bookingRepository) GetByStatus(ctx context.Context, status entities.BookingStatus) ([]*entities.Booking, error) {
	var bookings []*entities.Booking
	err := r.db.WithContext(ctx).
		Where("status = ?", status).
		Preload("Trip").
		Preload("Trip.Route").
		Preload("Passengers").
		Order("created_at DESC").
		Find(&bookings).Error
	return bookings, err
}

// GetByDateRange retrieves all bookings within a specified time range
// Used for analytics and daily report generation
func (r *bookingRepository) GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*entities.Booking, error) {
	var bookings []*entities.Booking
	err := r.db.WithContext(ctx).
		Where("created_at >= ? AND created_at < ?", startDate, endDate).
		Preload("Trip").
		Preload("Trip.Route").
		Order("created_at DESC").
		Find(&bookings).Error
	return bookings, err
}
