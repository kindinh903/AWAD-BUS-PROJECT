package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

type tripRepository struct {
	db *gorm.DB
}

// NewTripRepository creates a new trip repository
func NewTripRepository(db *gorm.DB) repositories.TripRepository {
	return &tripRepository{db: db}
}

func (r *tripRepository) Create(ctx context.Context, trip *entities.Trip) error {
	return r.db.WithContext(ctx).Create(trip).Error
}

func (r *tripRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Trip, error) {
	var trip entities.Trip
	err := r.db.WithContext(ctx).
		Preload("Route").
		Preload("Bus").
		Where("id = ?", id).
		First(&trip).Error
	if err != nil {
		return nil, err
	}
	return &trip, nil
}

func (r *tripRepository) GetAll(ctx context.Context) ([]*entities.Trip, error) {
	var trips []*entities.Trip
	err := r.db.WithContext(ctx).
		Preload("Route").
		Preload("Bus").
		Where("deleted_at IS NULL").
		Order("start_time DESC").
		Find(&trips).Error
	return trips, err
}

// GetByBusID returns all trips for a specific bus within a time range
func (r *tripRepository) GetByBusID(ctx context.Context, busID uuid.UUID, startTime, endTime time.Time) ([]*entities.Trip, error) {
	var trips []*entities.Trip
	err := r.db.WithContext(ctx).
		Where("bus_id = ? AND deleted_at IS NULL", busID).
		Where("status IN (?, ?)", entities.TripStatusScheduled, entities.TripStatusActive).
		Where("NOT (end_time <= ? OR start_time >= ?)", startTime, endTime).
		Order("start_time ASC").
		Find(&trips).Error
	return trips, err
}

// AssignBus assigns a bus to a trip with conflict checking
func (r *tripRepository) AssignBus(ctx context.Context, tripID, busID uuid.UUID) error {
	// Start a transaction
	return r.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		// 1. Get the trip
		var trip entities.Trip
		if err := tx.Where("id = ?", tripID).First(&trip).Error; err != nil {
			return fmt.Errorf("trip not found: %w", err)
		}

		// 2. Check if trip is already completed or cancelled
		if trip.Status == entities.TripStatusCompleted || trip.Status == entities.TripStatusCancelled {
			return fmt.Errorf("cannot assign bus to %s trip", trip.Status)
		}

		// 3. Get the bus to ensure it exists and is active
		var bus entities.Bus
		if err := tx.Where("id = ? AND status = ?", busID, entities.BusStatusActive).First(&bus).Error; err != nil {
			return fmt.Errorf("bus not found or not active: %w", err)
		}

		// 4. Check for schedule conflicts
		var conflictingTrips []*entities.Trip
		err := tx.
			Where("bus_id = ? AND deleted_at IS NULL", busID).
			Where("id != ?", tripID). // Exclude current trip
			Where("status IN (?, ?)", entities.TripStatusScheduled, entities.TripStatusActive).
			Where("NOT (end_time <= ? OR start_time >= ?)", trip.StartTime, trip.EndTime).
			Find(&conflictingTrips).Error

		if err != nil {
			return fmt.Errorf("error checking conflicts: %w", err)
		}

		if len(conflictingTrips) > 0 {
			return fmt.Errorf("bus has conflicting trip(s) at the requested time")
		}

		// 5. Assign the bus
		if err := tx.Model(&trip).Update("bus_id", busID).Error; err != nil {
			return fmt.Errorf("failed to assign bus: %w", err)
		}

		return nil
	})
}

func (r *tripRepository) Update(ctx context.Context, trip *entities.Trip) error {
	return r.db.WithContext(ctx).Save(trip).Error
}

func (r *tripRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.Trip{}).
		Where("id = ?", id).
		Update("deleted_at", time.Now()).Error
}

// SearchTrips implements trip search with joins to route and bus and optional filters
// Supports sorting by price, time, duration and pagination
func (r *tripRepository) SearchTrips(ctx context.Context, opts repositories.TripSearchOptions) (*repositories.PaginatedTrips, error) {
	var trips []*entities.Trip
	var total int64

	// Set defaults for pagination
	page := opts.Page
	if page < 1 {
		page = 1
	}
	pageSize := opts.PageSize
	if pageSize < 1 {
		pageSize = 10
	}
	if pageSize > 100 {
		pageSize = 100
	}

	// Build base query
	baseQuery := r.db.WithContext(ctx).
		Model(&entities.Trip{}).
		Joins("JOIN routes ON routes.id = trips.route_id").
		Joins("LEFT JOIN buses ON buses.id = trips.bus_id").
		Where("trips.deleted_at IS NULL")

	// Required filters: origin, destination, date
	baseQuery = baseQuery.Where("routes.origin = ?", opts.Origin)
	baseQuery = baseQuery.Where("routes.destination = ?", opts.Destination)

	// Match date (date only)
	dateStr := opts.Date.Format("2006-01-02")
	baseQuery = baseQuery.Where("DATE(trips.start_time) = ?", dateStr)

	// Optional filters
	if opts.BusType != nil && strings.TrimSpace(*opts.BusType) != "" {
		baseQuery = baseQuery.Where("LOWER(buses.bus_type) = ?", strings.ToLower(strings.TrimSpace(*opts.BusType)))
	}

	if opts.Status != nil && strings.TrimSpace(*opts.Status) != "" {
		baseQuery = baseQuery.Where("trips.status = ?", strings.TrimSpace(*opts.Status))
	}

	if opts.MinPrice != nil {
		baseQuery = baseQuery.Where("trips.price >= ?", *opts.MinPrice)
	}

	if opts.MaxPrice != nil {
		baseQuery = baseQuery.Where("trips.price <= ?", *opts.MaxPrice)
	}

	// Count total matching records
	if err := baseQuery.Count(&total).Error; err != nil {
		return nil, fmt.Errorf("failed to count trips: %w", err)
	}

	// Build sort order
	sortOrder := "ASC"
	if strings.ToLower(opts.SortOrder) == "desc" {
		sortOrder = "DESC"
	}

	// Determine sort column
	var orderClause string
	switch strings.ToLower(opts.SortBy) {
	case "price":
		orderClause = fmt.Sprintf("trips.price %s", sortOrder)
	case "duration":
		orderClause = fmt.Sprintf("routes.duration_minutes %s", sortOrder)
	case "time", "departure", "":
		orderClause = fmt.Sprintf("trips.start_time %s", sortOrder)
	default:
		orderClause = fmt.Sprintf("trips.start_time %s", sortOrder)
	}

	// Calculate offset
	offset := (page - 1) * pageSize

	// Execute query with pagination
	db := r.db.WithContext(ctx).
		Model(&entities.Trip{}).
		Preload("Route").
		Preload("Bus").
		Joins("JOIN routes ON routes.id = trips.route_id").
		Joins("LEFT JOIN buses ON buses.id = trips.bus_id").
		Where("trips.deleted_at IS NULL")

	// Apply same filters
	db = db.Where("routes.origin = ?", opts.Origin)
	db = db.Where("routes.destination = ?", opts.Destination)
	db = db.Where("DATE(trips.start_time) = ?", dateStr)

	if opts.BusType != nil && strings.TrimSpace(*opts.BusType) != "" {
		db = db.Where("LOWER(buses.bus_type) = ?", strings.ToLower(strings.TrimSpace(*opts.BusType)))
	}

	if opts.Status != nil && strings.TrimSpace(*opts.Status) != "" {
		db = db.Where("trips.status = ?", strings.TrimSpace(*opts.Status))
	}

	if opts.MinPrice != nil {
		db = db.Where("trips.price >= ?", *opts.MinPrice)
	}

	if opts.MaxPrice != nil {
		db = db.Where("trips.price <= ?", *opts.MaxPrice)
	}

	// Apply sorting and pagination
	if err := db.Order(orderClause).
		Offset(offset).
		Limit(pageSize).
		Find(&trips).Error; err != nil {
		return nil, fmt.Errorf("failed to search trips: %w", err)
	}

	// Calculate total pages
	totalPages := int(total) / pageSize
	if int(total)%pageSize > 0 {
		totalPages++
	}

	return &repositories.PaginatedTrips{
		Data:       trips,
		Total:      total,
		Page:       page,
		PageSize:   pageSize,
		TotalPages: totalPages,
	}, nil
}
