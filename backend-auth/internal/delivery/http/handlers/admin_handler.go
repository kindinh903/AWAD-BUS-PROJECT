package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// AdminHandler handles admin-specific operations
type AdminHandler struct {
	tripUsecase    *usecases.TripUsecase
	bookingUsecase *usecases.BookingUsecase
}

// NewAdminHandler creates a new admin handler
func NewAdminHandler(tripUsecase *usecases.TripUsecase, bookingUsecase *usecases.BookingUsecase) *AdminHandler {
	return &AdminHandler{
		tripUsecase:    tripUsecase,
		bookingUsecase: bookingUsecase,
	}
}

// GetAvailableBusesRequest represents the request for getting available buses
type GetAvailableBusesRequest struct {
	RouteID   string    `form:"routeId" binding:"required,uuid"`
	StartTime time.Time `form:"start" binding:"required" time_format:"2006-01-02T15:04:05Z07:00"`
	EndTime   time.Time `form:"end" binding:"required" time_format:"2006-01-02T15:04:05Z07:00"`
}

// AssignBusRequest represents the request for assigning a bus to a trip
type AssignBusRequest struct {
	TripID string `json:"tripId" binding:"required,uuid"`
	BusID  string `json:"busId" binding:"required,uuid"`
}

// GetAvailableBuses returns buses available for a given route and time range
// @Summary Get available buses
// @Description Get list of buses that don't have conflicting trips in the specified time range
// @Tags admin
// @Accept json
// @Produce json
// @Param routeId query string true "Route ID"
// @Param start query string true "Start time (RFC3339 format)"
// @Param end query string true "End time (RFC3339 format)"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Available buses"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses/available [get]
func (h *AdminHandler) GetAvailableBuses(c *gin.Context) {
	var req GetAvailableBusesRequest
	
	// Parse query parameters
	if err := c.ShouldBindQuery(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request parameters",
			"details": err.Error(),
		})
		return
	}

	// Validate time range
	if req.EndTime.Before(req.StartTime) {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "End time must be after start time",
		})
		return
	}

	routeID, err := uuid.Parse(req.RouteID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	// Get available buses
	buses, err := h.tripUsecase.GetAvailableBuses(c.Request.Context(), routeID, req.StartTime, req.EndTime)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get available buses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": buses,
		"count": len(buses),
	})
}

// AssignBus assigns a bus to a trip
// @Summary Assign bus to trip
// @Description Assign a bus to a scheduled trip with conflict checking
// @Tags admin
// @Accept json
// @Produce json
// @Param body body AssignBusRequest true "Assignment details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Assignment successful"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 409 {object} map[string]interface{} "Conflict - bus already assigned"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/trips/assign-bus [post]
func (h *AdminHandler) AssignBus(c *gin.Context) {
	var req AssignBusRequest
	
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	tripID, err := uuid.Parse(req.TripID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
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

	// Assign bus to trip (includes conflict checking)
	if err := h.tripUsecase.AssignBusToTrip(c.Request.Context(), tripID, busID); err != nil {
		// Check if it's a conflict error
		if contains(err.Error(), "conflict") {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Schedule conflict",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to assign bus",
			"details": err.Error(),
		})
		return
	}

	// Get updated trip details
	trip, err := h.tripUsecase.GetTripByID(c.Request.Context(), tripID)
	if err != nil {
		// Assignment succeeded but couldn't fetch updated trip
		c.JSON(http.StatusOK, gin.H{
			"success": true,
			"message": "Bus assigned successfully",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Bus assigned successfully",
		"data": trip,
	})
}

// GetAllTrips returns all trips
// @Summary Get all trips
// @Description Get list of all trips with route and bus information
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of trips"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/trips [get]
func (h *AdminHandler) GetAllTrips(c *gin.Context) {
	trips, err := h.tripUsecase.GetAllTrips(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get trips",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": trips,
		"count": len(trips),
	})
}

// GetAllBuses returns all buses
// @Summary Get all buses
// @Description Get list of all buses in the fleet
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of buses"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/buses [get]
func (h *AdminHandler) GetAllBuses(c *gin.Context) {
	buses, err := h.tripUsecase.GetAllBuses(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get buses",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": buses,
		"count": len(buses),
	})
}

// GetAllRoutes returns all routes
// @Summary Get all routes
// @Description Get list of all available routes
// @Tags admin
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of routes"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes [get]
func (h *AdminHandler) GetAllRoutes(c *gin.Context) {
	routes, err := h.tripUsecase.GetAllRoutes(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get routes",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": routes,
		"count": len(routes),
	})
}

// GetTripPassengers returns all passengers for a specific trip
// @Summary Get trip passengers
// @Description Get list of all passengers booked on a specific trip with check-in status
// @Tags admin
// @Produce json
// @Param id path string true "Trip ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of passengers"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/trips/{id}/passengers [get]
func (h *AdminHandler) GetTripPassengers(c *gin.Context) {
	tripIDStr := c.Param("id")
	
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
		})
		return
	}

	passengers, err := h.bookingUsecase.GetTripPassengers(c.Request.Context(), tripID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to get passengers",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data": passengers,
		"count": len(passengers),
	})
}

// CheckInPassenger marks a passenger as checked in
// @Summary Check in passenger
// @Description Mark a passenger as checked in for their trip
// @Tags admin
// @Produce json
// @Param id path string true "Trip ID"
// @Param passengerId path string true "Passenger ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Check-in successful"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 409 {object} map[string]interface{} "Already checked in"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/trips/{id}/passengers/{passengerId}/check-in [post]
func (h *AdminHandler) CheckInPassenger(c *gin.Context) {
	tripIDStr := c.Param("id")
	passengerIDStr := c.Param("passengerId")
	
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
		})
		return
	}

	passengerID, err := uuid.Parse(passengerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid passenger ID format",
		})
		return
	}

	err = h.bookingUsecase.CheckInPassenger(c.Request.Context(), tripID, passengerID)
	if err != nil {
		if err.Error() == "passenger already checked in" {
			c.JSON(http.StatusConflict, gin.H{
				"error": "Passenger already checked in",
			})
			return
		}
		c.JSON(http.StatusInternalServerError, gin.H{
			"error": "Failed to check in passenger",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Passenger checked in successfully",
	})
}

// Helper function to check if string contains substring
func contains(s, substr string) bool {
	return len(s) >= len(substr) && (s == substr || len(s) > len(substr) && 
		(s[:len(substr)] == substr || s[len(s)-len(substr):] == substr || 
		findSubstring(s, substr)))
}

func findSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
