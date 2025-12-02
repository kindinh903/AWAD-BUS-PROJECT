package usecases

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// RouteStopUsecase handles business logic for route stops
type RouteStopUsecase struct {
	routeStopRepo repositories.RouteStopRepository
	routeRepo     repositories.RouteRepository
}

// NewRouteStopUsecase creates a new route stop usecase
func NewRouteStopUsecase(
	routeStopRepo repositories.RouteStopRepository,
	routeRepo repositories.RouteRepository,
) *RouteStopUsecase {
	return &RouteStopUsecase{
		routeStopRepo: routeStopRepo,
		routeRepo:     routeRepo,
	}
}

// CreateStop creates a new route stop
func (u *RouteStopUsecase) CreateStop(ctx context.Context, stop *entities.RouteStop) error {
	// Validate route exists
	_, err := u.routeRepo.GetByID(ctx, stop.RouteID)
	if err != nil {
		return fmt.Errorf("route not found: %w", err)
	}

	// Validate stop type
	if stop.Type != entities.RouteStopTypePickup && stop.Type != entities.RouteStopTypeDropoff {
		return fmt.Errorf("invalid stop type: must be 'pickup' or 'dropoff'")
	}

	// Validate order index is positive
	if stop.OrderIndex < 1 {
		return fmt.Errorf("order_index must be >= 1")
	}

	return u.routeStopRepo.Create(ctx, stop)
}

// GetStopByID retrieves a route stop by ID
func (u *RouteStopUsecase) GetStopByID(ctx context.Context, id uuid.UUID) (*entities.RouteStop, error) {
	return u.routeStopRepo.GetByID(ctx, id)
}

// GetStopsByRouteID retrieves all stops for a route
func (u *RouteStopUsecase) GetStopsByRouteID(ctx context.Context, routeID uuid.UUID) ([]*entities.RouteStop, error) {
	// Validate route exists
	_, err := u.routeRepo.GetByID(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("route not found: %w", err)
	}

	return u.routeStopRepo.GetByRouteID(ctx, routeID)
}

// GetRouteWithStops retrieves a route with all its stops organized by type
func (u *RouteStopUsecase) GetRouteWithStops(ctx context.Context, routeID uuid.UUID) (map[string]interface{}, error) {
	// Get the route
	route, err := u.routeRepo.GetByID(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("route not found: %w", err)
	}

	// Get all stops
	stops, err := u.routeStopRepo.GetByRouteID(ctx, routeID)
	if err != nil {
		return nil, fmt.Errorf("failed to get stops: %w", err)
	}

	// Organize stops by type
	pickupPoints := []*entities.RouteStop{}
	dropoffPoints := []*entities.RouteStop{}

	for _, stop := range stops {
		if stop.Type == entities.RouteStopTypePickup {
			pickupPoints = append(pickupPoints, stop)
		} else {
			dropoffPoints = append(dropoffPoints, stop)
		}
	}

	return map[string]interface{}{
		"route":          route,
		"pickup_points":  pickupPoints,
		"dropoff_points": dropoffPoints,
	}, nil
}

// UpdateStop updates a route stop
func (u *RouteStopUsecase) UpdateStop(ctx context.Context, stop *entities.RouteStop) error {
	// Validate stop exists
	existingStop, err := u.routeStopRepo.GetByID(ctx, stop.ID)
	if err != nil {
		return fmt.Errorf("stop not found: %w", err)
	}

	// Validate route exists
	_, err = u.routeRepo.GetByID(ctx, stop.RouteID)
	if err != nil {
		return fmt.Errorf("route not found: %w", err)
	}

	// Validate stop type
	if stop.Type != entities.RouteStopTypePickup && stop.Type != entities.RouteStopTypeDropoff {
		return fmt.Errorf("invalid stop type: must be 'pickup' or 'dropoff'")
	}

	// Validate order index is positive
	if stop.OrderIndex < 1 {
		return fmt.Errorf("order_index must be >= 1")
	}

	// Type change is not allowed
	if existingStop.Type != stop.Type {
		return fmt.Errorf("cannot change stop type from %s to %s", existingStop.Type, stop.Type)
	}

	return u.routeStopRepo.Update(ctx, stop)
}

// DeleteStop deletes a route stop with validation
func (u *RouteStopUsecase) DeleteStop(ctx context.Context, stopID uuid.UUID) error {
	// Get the stop
	stop, err := u.routeStopRepo.GetByID(ctx, stopID)
	if err != nil {
		return fmt.Errorf("stop not found: %w", err)
	}

	// Check if this is the last stop of its type
	count, err := u.routeStopRepo.CountByRouteIDAndType(ctx, stop.RouteID, stop.Type)
	if err != nil {
		return fmt.Errorf("failed to count stops: %w", err)
	}

	if count <= 1 {
		return fmt.Errorf("cannot delete the last %s stop for this route", stop.Type)
	}

	return u.routeStopRepo.Delete(ctx, stopID)
}

// ValidateRouteHasRequiredStops checks if a route has at least one pickup and one dropoff
func (u *RouteStopUsecase) ValidateRouteHasRequiredStops(ctx context.Context, routeID uuid.UUID) error {
	pickupCount, err := u.routeStopRepo.CountByRouteIDAndType(ctx, routeID, entities.RouteStopTypePickup)
	if err != nil {
		return fmt.Errorf("failed to count pickup stops: %w", err)
	}

	if pickupCount < 1 {
		return fmt.Errorf("route must have at least one pickup stop")
	}

	dropoffCount, err := u.routeStopRepo.CountByRouteIDAndType(ctx, routeID, entities.RouteStopTypeDropoff)
	if err != nil {
		return fmt.Errorf("failed to count dropoff stops: %w", err)
	}

	if dropoffCount < 1 {
		return fmt.Errorf("route must have at least one dropoff stop")
	}

	return nil
}
