package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type bookingAnalyticsRepository struct {
	db *gorm.DB
}

// NewBookingAnalyticsRepository creates a new booking analytics repository
func NewBookingAnalyticsRepository(db *gorm.DB) repositories.BookingAnalyticsRepository {
	return &bookingAnalyticsRepository{db: db}
}

func (r *bookingAnalyticsRepository) Create(ctx context.Context, analytics *entities.BookingAnalytics) error {
	return r.db.WithContext(ctx).Create(analytics).Error
}

func (r *bookingAnalyticsRepository) GetByDate(ctx context.Context, date time.Time) (*entities.BookingAnalytics, error) {
	var analytics entities.BookingAnalytics
	// Truncate to date only for comparison
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	err := r.db.WithContext(ctx).
		Where("DATE(date) = DATE(?)", dateOnly).
		First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

func (r *bookingAnalyticsRepository) GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*entities.BookingAnalytics, error) {
	var analytics []*entities.BookingAnalytics
	err := r.db.WithContext(ctx).
		Where("date >= ? AND date <= ?", startDate, endDate).
		Order("date ASC").
		Find(&analytics).Error
	return analytics, err
}

func (r *bookingAnalyticsRepository) Update(ctx context.Context, analytics *entities.BookingAnalytics) error {
	return r.db.WithContext(ctx).Save(analytics).Error
}

func (r *bookingAnalyticsRepository) CreateOrUpdate(ctx context.Context, analytics *entities.BookingAnalytics) error {
	// Upsert: on conflict update
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "date"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"total_bookings",
				"confirmed_bookings",
				"cancelled_bookings",
				"pending_bookings",
				"total_revenue",
				"total_seats_booked",
				"average_booking_value",
				"conversion_rate",
				"updated_at",
			}),
		}).
		Create(analytics).Error
}

// Route analytics repository
type routeAnalyticsRepository struct {
	db *gorm.DB
}

// NewRouteAnalyticsRepository creates a new route analytics repository
func NewRouteAnalyticsRepository(db *gorm.DB) repositories.RouteAnalyticsRepository {
	return &routeAnalyticsRepository{db: db}
}

func (r *routeAnalyticsRepository) Create(ctx context.Context, analytics *entities.RouteAnalytics) error {
	return r.db.WithContext(ctx).Create(analytics).Error
}

func (r *routeAnalyticsRepository) GetByRouteAndDate(ctx context.Context, routeID uuid.UUID, date time.Time) (*entities.RouteAnalytics, error) {
	var analytics entities.RouteAnalytics
	dateOnly := time.Date(date.Year(), date.Month(), date.Day(), 0, 0, 0, 0, date.Location())
	err := r.db.WithContext(ctx).
		Where("route_id = ? AND DATE(date) = DATE(?)", routeID, dateOnly).
		First(&analytics).Error
	if err != nil {
		return nil, err
	}
	return &analytics, nil
}

func (r *routeAnalyticsRepository) GetByRouteIDAndDateRange(ctx context.Context, routeID uuid.UUID, startDate, endDate time.Time) ([]*entities.RouteAnalytics, error) {
	var analytics []*entities.RouteAnalytics
	err := r.db.WithContext(ctx).
		Where("route_id = ? AND date >= ? AND date <= ?", routeID, startDate, endDate).
		Order("date ASC").
		Find(&analytics).Error
	return analytics, err
}

func (r *routeAnalyticsRepository) GetTopRoutesByRevenue(ctx context.Context, startDate, endDate time.Time, limit int) ([]*entities.RouteAnalytics, error) {
	var analytics []*entities.RouteAnalytics

	// Aggregate by route_id and sum revenue
	err := r.db.WithContext(ctx).
		Model(&entities.RouteAnalytics{}).
		Select("route_id, SUM(total_revenue) as total_revenue, SUM(total_bookings) as total_bookings").
		Where("date >= ? AND date <= ?", startDate, endDate).
		Group("route_id").
		Order("total_revenue DESC").
		Limit(limit).
		Preload("Route").
		Find(&analytics).Error

	return analytics, err
}

func (r *routeAnalyticsRepository) GetTopRoutesByBookings(ctx context.Context, startDate, endDate time.Time, limit int) ([]*entities.RouteAnalytics, error) {
	var analytics []*entities.RouteAnalytics

	// Aggregate by route_id and sum bookings
	err := r.db.WithContext(ctx).
		Model(&entities.RouteAnalytics{}).
		Select("route_id, SUM(total_bookings) as total_bookings, SUM(total_revenue) as total_revenue").
		Where("date >= ? AND date <= ?", startDate, endDate).
		Group("route_id").
		Order("total_bookings DESC").
		Limit(limit).
		Preload("Route").
		Find(&analytics).Error

	return analytics, err
}

func (r *routeAnalyticsRepository) Update(ctx context.Context, analytics *entities.RouteAnalytics) error {
	return r.db.WithContext(ctx).Save(analytics).Error
}

func (r *routeAnalyticsRepository) CreateOrUpdate(ctx context.Context, analytics *entities.RouteAnalytics) error {
	// Upsert: on conflict update
	return r.db.WithContext(ctx).
		Clauses(clause.OnConflict{
			Columns: []clause.Column{{Name: "route_id"}, {Name: "date"}},
			DoUpdates: clause.AssignmentColumns([]string{
				"total_bookings",
				"total_revenue",
				"average_occupancy_rate",
				"total_seats_booked",
				"total_seats_available",
				"updated_at",
			}),
		}).
		Create(analytics).Error
}
