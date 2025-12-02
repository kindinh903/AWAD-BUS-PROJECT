package usecases

import (
	"context"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// TripUsecase handles business logic for trip and bus assignment
type TripUsecase struct {
	tripRepo  repositories.TripRepository
	busRepo   repositories.BusRepository
	routeRepo repositories.RouteRepository
}

// NewTripUsecase creates a new trip usecase
func NewTripUsecase(
	tripRepo repositories.TripRepository,
	busRepo repositories.BusRepository,
	routeRepo repositories.RouteRepository,
) *TripUsecase {
	return &TripUsecase{
		tripRepo:  tripRepo,
		busRepo:   busRepo,
		routeRepo: routeRepo,
	}
}

// GetAvailableBuses returns buses that are available for a given route and time range
func (u *TripUsecase) GetAvailableBuses(ctx context.Context, routeID uuid.UUID, startTime, endTime time.Time) ([]*entities.Bus, error) {
	// Validate the route exists
	_, err := u.routeRepo.GetByID(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("route not found: %w", err)
	}

	// Get buses that don't have conflicting trips
	buses, err := u.busRepo.GetAvailable(ctx, startTime, endTime)
	if err != nil {
		return nil, fmt.Errorf("failed to get available buses: %w", err)
	}

	return buses, nil
}

// AssignBusToTrip assigns a bus to a trip with conflict validation
func (u *TripUsecase) AssignBusToTrip(ctx context.Context, tripID, busID uuid.UUID) error {
	// The repository's AssignBus method already handles all validation and conflict checking
	// including transaction management, so we just call it directly
	err := u.tripRepo.AssignBus(ctx, tripID, busID)
	if err != nil {
		return fmt.Errorf("failed to assign bus: %w", err)
	}

	return nil
}

// GetAllTrips returns all trips with their route and bus information
func (u *TripUsecase) GetAllTrips(ctx context.Context) ([]*entities.Trip, error) {
	return u.tripRepo.GetAll(ctx)
}

// GetTripByID returns a specific trip by ID
func (u *TripUsecase) GetTripByID(ctx context.Context, tripID uuid.UUID) (*entities.Trip, error) {
	return u.tripRepo.GetByID(ctx, tripID)
}

// GetAllBuses returns all buses
func (u *TripUsecase) GetAllBuses(ctx context.Context) ([]*entities.Bus, error) {
	return u.busRepo.GetAll(ctx)
}

// SearchTrips searches trips using provided options with pagination
func (u *TripUsecase) SearchTrips(ctx context.Context, opts repositories.TripSearchOptions) (*repositories.PaginatedTrips, error) {
	return u.tripRepo.SearchTrips(ctx, opts)
}

// GetAllRoutes returns all routes
func (u *TripUsecase) GetAllRoutes(ctx context.Context) ([]*entities.Route, error) {
	return u.routeRepo.GetAll(ctx)
}

// CreateTrip creates a new trip
func (u *TripUsecase) CreateTrip(ctx context.Context, trip *entities.Trip) error {
	// Validate route exists
	_, err := u.routeRepo.GetByID(ctx, trip.RouteID)
	if err != nil {
		return fmt.Errorf("route not found: %w", err)
	}

	// If bus is assigned, validate it's available
	if trip.BusID != nil {
		// Check bus exists
		_, err := u.busRepo.GetByID(ctx, *trip.BusID)
		if err != nil {
			return fmt.Errorf("bus not found: %w", err)
		}

		// Check for conflicts
		conflictingTrips, err := u.tripRepo.GetByBusID(ctx, *trip.BusID, trip.StartTime, trip.EndTime)
		if err != nil {
			return fmt.Errorf("failed to check conflicts: %w", err)
		}

		if len(conflictingTrips) > 0 {
			return fmt.Errorf("bus has conflicting trip(s) at the requested time")
		}
	}

	return u.tripRepo.Create(ctx, trip)
}
