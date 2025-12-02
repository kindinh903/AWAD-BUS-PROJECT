package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// SeatMapHandler handles seat map configuration endpoints
type SeatMapHandler struct {
	seatMapUsecase *usecases.SeatMapUsecase
}

// NewSeatMapHandler creates a new seat map handler
func NewSeatMapHandler(seatMapUsecase *usecases.SeatMapUsecase) *SeatMapHandler {
	return &SeatMapHandler{
		seatMapUsecase: seatMapUsecase,
	}
}

// CreateSeatMapRequest represents the request to create a seat map
type CreateSeatMapRequest struct {
	Name        string  `json:"name" binding:"required"`
	Description *string `json:"description"`
	Rows        int     `json:"rows" binding:"required,min=1,max=20"`
	Columns     int     `json:"columns" binding:"required,min=2,max=6"`
	BusType     string  `json:"bus_type" binding:"required"`
}

// CreateSeatMap creates a new seat map template
// @Summary Create seat map
// @Description Create a new seat map template with default seat layout
// @Tags seat-maps
// @Accept json
// @Produce json
// @Param body body CreateSeatMapRequest true "Seat map details"
// @Security BearerAuth
// @Success 201 {object} map[string]interface{} "Created seat map"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps [post]
func (h *SeatMapHandler) CreateSeatMap(c *gin.Context) {
	var req CreateSeatMapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	input := usecases.CreateSeatMapInput{
		Name:        req.Name,
		Description: req.Description,
		Rows:        req.Rows,
		Columns:     req.Columns,
		BusType:     req.BusType,
	}

	seatMap, err := h.seatMapUsecase.CreateSeatMap(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create seat map",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    seatMap,
	})
}

// GetAllSeatMaps returns all seat maps
// @Summary Get all seat maps
// @Description Get list of all seat map templates
// @Tags seat-maps
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of seat maps"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps [get]
func (h *SeatMapHandler) GetAllSeatMaps(c *gin.Context) {
	seatMaps, err := h.seatMapUsecase.GetAllSeatMaps(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get seat maps",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    seatMaps,
		"count":   len(seatMaps),
	})
}

// GetSeatMap returns a specific seat map with all seats
// @Summary Get seat map
// @Description Get a seat map by ID with all seat configurations
// @Tags seat-maps
// @Produce json
// @Param id path string true "Seat Map ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Seat map with seats"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps/{id} [get]
func (h *SeatMapHandler) GetSeatMap(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	seatMap, err := h.seatMapUsecase.GetSeatMap(c.Request.Context(), id)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Seat map not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    seatMap,
	})
}

// UpdateSeatMapRequest represents the request to update a seat map
type UpdateSeatMapRequest struct {
	Name        *string `json:"name"`
	Description *string `json:"description"`
	BusType     *string `json:"bus_type"`
	IsActive    *bool   `json:"is_active"`
}

// UpdateSeatMap updates a seat map's metadata
// @Summary Update seat map
// @Description Update a seat map's name, description, bus type, or active status
// @Tags seat-maps
// @Accept json
// @Produce json
// @Param id path string true "Seat Map ID"
// @Param body body UpdateSeatMapRequest true "Update details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Updated seat map"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps/{id} [put]
func (h *SeatMapHandler) UpdateSeatMap(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	var req UpdateSeatMapRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	input := usecases.UpdateSeatMapInput{
		Name:        req.Name,
		Description: req.Description,
		BusType:     req.BusType,
		IsActive:    req.IsActive,
	}

	seatMap, err := h.seatMapUsecase.UpdateSeatMap(c.Request.Context(), id, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update seat map",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    seatMap,
	})
}

// DeleteSeatMap deletes a seat map
// @Summary Delete seat map
// @Description Delete a seat map and all its seats
// @Tags seat-maps
// @Produce json
// @Param id path string true "Seat Map ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Deletion successful"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps/{id} [delete]
func (h *SeatMapHandler) DeleteSeatMap(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	if err := h.seatMapUsecase.DeleteSeatMap(c.Request.Context(), id); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete seat map",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Seat map deleted successfully",
	})
}

// BulkUpdateSeatsRequest represents the request to bulk update seats
type BulkUpdateSeatsRequest struct {
	Seats []SeatUpdateItem `json:"seats" binding:"required"`
}

// SeatUpdateItem represents a single seat update
type SeatUpdateItem struct {
	ID              string             `json:"id" binding:"required"`
	SeatType        *entities.SeatType `json:"seat_type"`
	PriceMultiplier *float64           `json:"price_multiplier"`
	IsBookable      *bool              `json:"is_bookable"`
}

// BulkUpdateSeats updates multiple seats at once
// @Summary Bulk update seats
// @Description Update multiple seats' configurations in a single request
// @Tags seat-maps
// @Accept json
// @Produce json
// @Param id path string true "Seat Map ID"
// @Param body body BulkUpdateSeatsRequest true "Seat updates"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Updated seat map"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps/{id}/seats [put]
func (h *SeatMapHandler) BulkUpdateSeats(c *gin.Context) {
	idStr := c.Param("id")
	seatMapID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	var req BulkUpdateSeatsRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Convert request to usecase input
	updates := make([]usecases.SeatUpdateItem, len(req.Seats))
	for i, s := range req.Seats {
		seatID, err := uuid.Parse(s.ID)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{
				"error": "Invalid seat ID format: " + s.ID,
			})
			return
		}
		updates[i] = usecases.SeatUpdateItem{
			ID:              seatID,
			SeatType:        s.SeatType,
			PriceMultiplier: s.PriceMultiplier,
			IsBookable:      s.IsBookable,
		}
	}

	input := usecases.BulkUpdateSeatsInput{
		SeatUpdates: updates,
	}

	seatMap, err := h.seatMapUsecase.BulkUpdateSeats(c.Request.Context(), seatMapID, input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update seats",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    seatMap,
	})
}

// RegenerateSeatLayoutRequest represents the request to regenerate seats
type RegenerateSeatLayoutRequest struct {
	Rows    int `json:"rows" binding:"required,min=1,max=20"`
	Columns int `json:"columns" binding:"required,min=2,max=6"`
}

// RegenerateSeatLayout regenerates the seat layout for a seat map
// @Summary Regenerate seat layout
// @Description Delete all existing seats and create a new layout with specified dimensions
// @Tags seat-maps
// @Accept json
// @Produce json
// @Param id path string true "Seat Map ID"
// @Param body body RegenerateSeatLayoutRequest true "New layout dimensions"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Regenerated seat map"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/seat-maps/{id}/regenerate [post]
func (h *SeatMapHandler) RegenerateSeatLayout(c *gin.Context) {
	idStr := c.Param("id")
	id, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	var req RegenerateSeatLayoutRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	seatMap, err := h.seatMapUsecase.RegenerateSeatLayout(c.Request.Context(), id, req.Rows, req.Columns)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to regenerate seat layout",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    seatMap,
	})
}

// AssignSeatMapToBusRequest represents the request to assign a seat map to a bus
type AssignSeatMapToBusRequest struct {
	BusID     string `json:"bus_id" binding:"required"`
	SeatMapID string `json:"seat_map_id" binding:"required"`
}

// AssignSeatMapToBus assigns a seat map template to a bus
// @Summary Assign seat map to bus
// @Description Assign a seat map configuration to a specific bus
// @Tags seat-maps
// @Accept json
// @Produce json
// @Param body body AssignSeatMapToBusRequest true "Assignment details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Updated bus"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses/assign-seat-map [post]
func (h *SeatMapHandler) AssignSeatMapToBus(c *gin.Context) {
	var req AssignSeatMapToBusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	busID, err := uuid.Parse(req.BusID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bus ID format",
		})
		return
	}

	seatMapID, err := uuid.Parse(req.SeatMapID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid seat map ID format",
		})
		return
	}

	bus, err := h.seatMapUsecase.AssignSeatMapToBus(c.Request.Context(), busID, seatMapID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to assign seat map to bus",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Seat map assigned to bus successfully",
		"data":    bus,
	})
}

// GetSeatTypeConfigs returns available seat type configurations
// @Summary Get seat type configs
// @Description Get all available seat type configurations with colors and multipliers
// @Tags seat-maps
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Seat type configurations"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Router /admin/seat-maps/configs [get]
func (h *SeatMapHandler) GetSeatTypeConfigs(c *gin.Context) {
	configs := h.seatMapUsecase.GetSeatTypeConfigs()

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    configs,
	})
}
