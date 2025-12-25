package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// BusHandler handles bus-related operations
type BusHandler struct {
	busRepo repositories.BusRepository
}

// NewBusHandler creates a new bus handler
func NewBusHandler(busRepo repositories.BusRepository) *BusHandler {
	return &BusHandler{
		busRepo: busRepo,
	}
}

// CreateBusRequest represents the request for creating a new bus
type CreateBusRequest struct {
	Name         string  `json:"name" binding:"required"`
	PlateNumber  string  `json:"plateNumber" binding:"required"`
	TotalSeats   int     `json:"totalSeats" binding:"required,min=1"`
	BusType      string  `json:"busType" binding:"required"`
	Manufacturer *string `json:"manufacturer,omitempty"`
	Model        *string `json:"model,omitempty"`
	Year         *int    `json:"year,omitempty"`
}

// UpdateBusRequest represents the request for updating a bus
type UpdateBusRequest struct {
	Name         *string `json:"name,omitempty"`
	PlateNumber  *string `json:"plateNumber,omitempty"`
	TotalSeats   *int    `json:"totalSeats,omitempty"`
	BusType      *string `json:"busType,omitempty"`
	Manufacturer *string `json:"manufacturer,omitempty"`
	Model        *string `json:"model,omitempty"`
	Year         *int    `json:"year,omitempty"`
	Status       *string `json:"status,omitempty"`
}

// CreateBus creates a new bus
// @Summary Create bus
// @Description Create a new bus (admin only)
// @Tags admin,buses
// @Accept json
// @Produce json
// @Param bus body CreateBusRequest true "Bus details"
// @Security BearerAuth
// @Success 201 {object} map[string]interface{} "Created bus"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 409 {object} map[string]interface{} "Plate number already exists"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses [post]
func (h *BusHandler) CreateBus(c *gin.Context) {
	var req CreateBusRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Create bus entity
	bus := &entities.Bus{
		Name:         req.Name,
		PlateNumber:  req.PlateNumber,
		TotalSeats:   req.TotalSeats,
		BusType:      req.BusType,
		Manufacturer: req.Manufacturer,
		Model:        req.Model,
		Year:         req.Year,
		Status:       entities.BusStatusActive,
	}

	// Save to database
	if err := h.busRepo.Create(c.Request.Context(), bus); err != nil {
		// Check for unique constraint violation
		if err.Error() == "ERROR: duplicate key value violates unique constraint \"buses_plate_number_key\" (SQLSTATE 23505)" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Bus with this plate number already exists",
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create bus",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Bus created successfully",
		"data":    bus,
	})
}

// GetAllBuses retrieves all buses
// @Summary Get all buses
// @Description Get list of all buses
// @Tags buses
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of buses"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses [get]
func (h *BusHandler) GetAllBuses(c *gin.Context) {
	buses, err := h.busRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch buses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": buses,
	})
}

// GetBusByID retrieves a bus by ID
// @Summary Get bus by ID
// @Description Get a specific bus by ID
// @Tags buses
// @Produce json
// @Param id path string true "Bus ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Bus details"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Bus not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses/{id} [get]
func (h *BusHandler) GetBusByID(c *gin.Context) {
	busID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bus ID format",
		})
		return
	}

	bus, err := h.busRepo.GetByID(c.Request.Context(), busID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bus not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": bus,
	})
}

// UpdateBus updates an existing bus
// @Summary Update bus
// @Description Update an existing bus (admin only)
// @Tags admin,buses
// @Accept json
// @Produce json
// @Param id path string true "Bus ID"
// @Param bus body UpdateBusRequest true "Updated bus details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Updated bus"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Bus not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses/{id} [put]
func (h *BusHandler) UpdateBus(c *gin.Context) {
	busID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bus ID format",
		})
		return
	}

	var req UpdateBusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get existing bus
	bus, err := h.busRepo.GetByID(c.Request.Context(), busID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bus not found",
		})
		return
	}

	// Update fields if provided
	if req.Name != nil {
		bus.Name = *req.Name
	}
	if req.PlateNumber != nil {
		bus.PlateNumber = *req.PlateNumber
	}
	if req.TotalSeats != nil {
		bus.TotalSeats = *req.TotalSeats
	}
	if req.BusType != nil {
		bus.BusType = *req.BusType
	}
	if req.Manufacturer != nil {
		bus.Manufacturer = req.Manufacturer
	}
	if req.Model != nil {
		bus.Model = req.Model
	}
	if req.Year != nil {
		bus.Year = req.Year
	}
	if req.Status != nil {
		bus.Status = entities.BusStatus(*req.Status)
	}

	// Update in database
	if err := h.busRepo.Update(c.Request.Context(), bus); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update bus",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bus updated successfully",
		"data":    bus,
	})
}

// DeleteBus deletes a bus (soft delete)
// @Summary Delete bus
// @Description Soft delete a bus (admin only)
// @Tags admin,buses
// @Produce json
// @Param id path string true "Bus ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Bus not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses/{id} [delete]
func (h *BusHandler) DeleteBus(c *gin.Context) {
	busID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid bus ID format",
		})
		return
	}

	// Check if bus exists
	_, err = h.busRepo.GetByID(c.Request.Context(), busID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Bus not found",
		})
		return
	}

	// Soft delete
	if err := h.busRepo.Delete(c.Request.Context(), busID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete bus",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Bus deleted successfully",
	})
}
