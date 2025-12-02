package usecases

import (
	"context"
	"fmt"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// SeatMapUsecase handles business logic for seat map operations
type SeatMapUsecase struct {
	seatMapRepo repositories.SeatMapRepository
	busRepo     repositories.BusRepository
}

// NewSeatMapUsecase creates a new seat map usecase
func NewSeatMapUsecase(
	seatMapRepo repositories.SeatMapRepository,
	busRepo repositories.BusRepository,
) *SeatMapUsecase {
	return &SeatMapUsecase{
		seatMapRepo: seatMapRepo,
		busRepo:     busRepo,
	}
}

// CreateSeatMapInput represents input for creating a seat map
type CreateSeatMapInput struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Rows        int     `json:"rows" binding:"required,min=1,max=20"`
	Columns     int     `json:"columns" binding:"required,min=2,max=6"`
	BusType     string  `json:"bus_type" binding:"required"`
}

// CreateSeatMap creates a new seat map with default seats
func (u *SeatMapUsecase) CreateSeatMap(ctx context.Context, input CreateSeatMapInput) (*entities.SeatMap, error) {
	// Calculate total seats
	totalSeats := input.Rows * input.Columns

	seatMap := &entities.SeatMap{
		Name:        input.Name,
		Description: input.Description,
		Rows:        input.Rows,
		Columns:     input.Columns,
		TotalSeats:  totalSeats,
		BusType:     input.BusType,
		IsActive:    true,
	}

	// Create the seat map first
	if err := u.seatMapRepo.Create(ctx, seatMap); err != nil {
		return nil, fmt.Errorf("failed to create seat map: %w", err)
	}

	// Generate default seats
	seats := seatMap.GenerateDefaultSeats()

	// Bulk create seats
	if err := u.seatMapRepo.BulkCreateSeats(ctx, seats); err != nil {
		// Rollback by deleting the seat map
		_ = u.seatMapRepo.Delete(ctx, seatMap.ID)
		return nil, fmt.Errorf("failed to create seats: %w", err)
	}

	// Reload with seats
	return u.seatMapRepo.GetWithSeats(ctx, seatMap.ID)
}

// GetSeatMap returns a seat map by ID with all seats
func (u *SeatMapUsecase) GetSeatMap(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error) {
	return u.seatMapRepo.GetWithSeats(ctx, id)
}

// GetAllSeatMaps returns all seat maps
func (u *SeatMapUsecase) GetAllSeatMaps(ctx context.Context) ([]*entities.SeatMap, error) {
	return u.seatMapRepo.GetAll(ctx)
}

// UpdateSeatMapInput represents input for updating a seat map
type UpdateSeatMapInput struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	BusType     *string `json:"bus_type"`
	IsActive    *bool   `json:"is_active"`
}

// UpdateSeatMap updates a seat map's metadata
func (u *SeatMapUsecase) UpdateSeatMap(ctx context.Context, id uuid.UUID, input UpdateSeatMapInput) (*entities.SeatMap, error) {
	seatMap, err := u.seatMapRepo.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("seat map not found: %w", err)
	}

	if input.Name != nil {
		seatMap.Name = *input.Name
	}
	if input.Description != nil {
		seatMap.Description = input.Description
	}
	if input.BusType != nil {
		seatMap.BusType = *input.BusType
	}
	if input.IsActive != nil {
		seatMap.IsActive = *input.IsActive
	}

	if err := u.seatMapRepo.Update(ctx, seatMap); err != nil {
		return nil, fmt.Errorf("failed to update seat map: %w", err)
	}

	return u.seatMapRepo.GetWithSeats(ctx, id)
}

// DeleteSeatMap deletes a seat map and all its seats
func (u *SeatMapUsecase) DeleteSeatMap(ctx context.Context, id uuid.UUID) error {
	return u.seatMapRepo.Delete(ctx, id)
}

// UpdateSeatInput represents input for updating a single seat
type UpdateSeatInput struct {
	SeatType        *entities.SeatType `json:"seat_type"`
	PriceMultiplier *float64           `json:"price_multiplier"`
	IsBookable      *bool              `json:"is_bookable"`
	Label           *string            `json:"label"`
}

// UpdateSeat updates a single seat's configuration
func (u *SeatMapUsecase) UpdateSeat(ctx context.Context, seatID uuid.UUID, input UpdateSeatInput) (*entities.Seat, error) {
	seats, err := u.seatMapRepo.GetSeatsByMapID(ctx, uuid.Nil)
	if err != nil {
		return nil, err
	}

	// Find the seat
	var seat *entities.Seat
	for _, s := range seats {
		if s.ID == seatID {
			seat = s
			break
		}
	}

	if seat == nil {
		return nil, fmt.Errorf("seat not found")
	}

	if input.SeatType != nil {
		seat.SeatType = *input.SeatType
		// Auto-update bookable status based on seat type
		if *input.SeatType == entities.SeatTypeAisle || *input.SeatType == entities.SeatTypeUnavailable {
			seat.IsBookable = false
		}
	}
	if input.PriceMultiplier != nil {
		seat.PriceMultiplier = *input.PriceMultiplier
	}
	if input.IsBookable != nil {
		seat.IsBookable = *input.IsBookable
	}
	if input.Label != nil {
		seat.Label = input.Label
	}

	if err := u.seatMapRepo.UpdateSeat(ctx, seat); err != nil {
		return nil, fmt.Errorf("failed to update seat: %w", err)
	}

	return seat, nil
}

// BulkUpdateSeatsInput represents input for bulk updating seats
type BulkUpdateSeatsInput struct {
	SeatUpdates []SeatUpdateItem `json:"seats" binding:"required"`
}

// SeatUpdateItem represents a single seat update in bulk operation
type SeatUpdateItem struct {
	ID              uuid.UUID          `json:"id" binding:"required"`
	SeatType        *entities.SeatType `json:"seat_type"`
	PriceMultiplier *float64           `json:"price_multiplier"`
	IsBookable      *bool              `json:"is_bookable"`
}

// BulkUpdateSeats updates multiple seats at once
func (u *SeatMapUsecase) BulkUpdateSeats(ctx context.Context, seatMapID uuid.UUID, input BulkUpdateSeatsInput) (*entities.SeatMap, error) {
	// Get all seats for this map
	seats, err := u.seatMapRepo.GetSeatsByMapID(ctx, seatMapID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seats: %w", err)
	}

	// Create a map for quick lookup
	seatMap := make(map[uuid.UUID]*entities.Seat)
	for _, s := range seats {
		seatMap[s.ID] = s
	}

	// Update each seat
	for _, update := range input.SeatUpdates {
		seat, ok := seatMap[update.ID]
		if !ok {
			continue // Skip if seat not found
		}

		if update.SeatType != nil {
			seat.SeatType = *update.SeatType
			// Auto-update bookable status based on seat type
			if *update.SeatType == entities.SeatTypeAisle || *update.SeatType == entities.SeatTypeUnavailable {
				seat.IsBookable = false
			}
		}
		if update.PriceMultiplier != nil {
			seat.PriceMultiplier = *update.PriceMultiplier
		}
		if update.IsBookable != nil {
			seat.IsBookable = *update.IsBookable
		}

		if err := u.seatMapRepo.UpdateSeat(ctx, seat); err != nil {
			return nil, fmt.Errorf("failed to update seat %s: %w", seat.SeatNumber, err)
		}
	}

	// Return updated seat map
	return u.seatMapRepo.GetWithSeats(ctx, seatMapID)
}

// RegenerateSeatLayout deletes all existing seats and creates a new layout
func (u *SeatMapUsecase) RegenerateSeatLayout(ctx context.Context, seatMapID uuid.UUID, rows, columns int) (*entities.SeatMap, error) {
	seatMap, err := u.seatMapRepo.GetByID(ctx, seatMapID)
	if err != nil {
		return nil, fmt.Errorf("seat map not found: %w", err)
	}

	// Delete existing seats
	if err := u.seatMapRepo.DeleteSeatsByMapID(ctx, seatMapID); err != nil {
		return nil, fmt.Errorf("failed to delete existing seats: %w", err)
	}

	// Update dimensions
	seatMap.Rows = rows
	seatMap.Columns = columns
	seatMap.TotalSeats = rows * columns

	if err := u.seatMapRepo.Update(ctx, seatMap); err != nil {
		return nil, fmt.Errorf("failed to update seat map: %w", err)
	}

	// Generate new seats
	seats := seatMap.GenerateDefaultSeats()

	if err := u.seatMapRepo.BulkCreateSeats(ctx, seats); err != nil {
		return nil, fmt.Errorf("failed to create seats: %w", err)
	}

	return u.seatMapRepo.GetWithSeats(ctx, seatMapID)
}

// AssignSeatMapToBus assigns a seat map template to a bus
func (u *SeatMapUsecase) AssignSeatMapToBus(ctx context.Context, busID, seatMapID uuid.UUID) (*entities.Bus, error) {
	// Verify seat map exists
	seatMap, err := u.seatMapRepo.GetByID(ctx, seatMapID)
	if err != nil {
		return nil, fmt.Errorf("seat map not found: %w", err)
	}

	// Get the bus
	bus, err := u.busRepo.GetByID(ctx, busID)
	if err != nil {
		return nil, fmt.Errorf("bus not found: %w", err)
	}

	// Update bus with seat map
	bus.SeatMapID = &seatMapID
	bus.TotalSeats = seatMap.TotalSeats
	bus.BusType = seatMap.BusType

	if err := u.busRepo.Update(ctx, bus); err != nil {
		return nil, fmt.Errorf("failed to update bus: %w", err)
	}

	return bus, nil
}

// GetSeatTypeConfigs returns all available seat type configurations
func (u *SeatMapUsecase) GetSeatTypeConfigs() []entities.SeatTypeConfig {
	return entities.DefaultSeatTypeConfigs()
}
