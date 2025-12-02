package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// RouteStopHandler handles route stop operations
type RouteStopHandler struct {
	routeStopUsecase *usecases.RouteStopUsecase
}

// NewRouteStopHandler creates a new route stop handler
func NewRouteStopHandler(routeStopUsecase *usecases.RouteStopUsecase) *RouteStopHandler {
	return &RouteStopHandler{
		routeStopUsecase: routeStopUsecase,
	}
}

// CreateStopRequest represents the request for creating a route stop
type CreateStopRequest struct {
	Name       string  `json:"name" binding:"required"`
	Type       string  `json:"type" binding:"required,oneof=pickup dropoff"`
	OrderIndex int     `json:"order_index" binding:"required,min=1"`
	Address    *string `json:"address,omitempty"`
	Latitude   *float64 `json:"latitude,omitempty"`
	Longitude  *float64 `json:"longitude,omitempty"`
}

// UpdateStopRequest represents the request for updating a route stop
type UpdateStopRequest struct {
	Name       string   `json:"name" binding:"required"`
	OrderIndex int      `json:"order_index" binding:"required,min=1"`
	Address    *string  `json:"address,omitempty"`
	Latitude   *float64 `json:"latitude,omitempty"`
	Longitude  *float64 `json:"longitude,omitempty"`
}

// CreateStop creates a new route stop
// @Summary Create route stop
// @Description Create a new pickup or dropoff point for a route
// @Tags admin
// @Accept json
// @Produce json
// @Param id path string true "Route ID"
// @Param body body CreateStopRequest true "Stop details"
// @Security BearerAuth
// @Success 201 {object} map[string]interface{} "Stop created"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Route not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes/{id}/stops [post]
func (h *RouteStopHandler) CreateStop(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	var req CreateStopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	stop := &entities.RouteStop{
		RouteID:    routeID,
		Name:       req.Name,
		Type:       entities.RouteStopType(req.Type),
		OrderIndex: req.OrderIndex,
		Address:    req.Address,
		Latitude:   req.Latitude,
		Longitude:  req.Longitude,
	}

	if err := h.routeStopUsecase.CreateStop(c.Request.Context(), stop); err != nil {
		if contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Route not found",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create stop",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"message": "Stop created successfully",
		"data":    stop,
	})
}

// UpdateStop updates a route stop
// @Summary Update route stop
// @Description Update an existing route stop
// @Tags admin
// @Accept json
// @Produce json
// @Param routeId path string true "Route ID"
// @Param stopId path string true "Stop ID"
// @Param body body UpdateStopRequest true "Updated stop details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Stop updated"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Stop not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes/{routeId}/stops/{stopId} [put]
func (h *RouteStopHandler) UpdateStop(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("routeId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	stopID, err := uuid.Parse(c.Param("stopId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid stop ID format",
		})
		return
	}

	var req UpdateStopRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get existing stop to preserve type
	existingStop, err := h.routeStopUsecase.GetStopByID(c.Request.Context(), stopID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Stop not found",
			"details": err.Error(),
		})
		return
	}

	// Update stop fields
	existingStop.RouteID = routeID
	existingStop.Name = req.Name
	existingStop.OrderIndex = req.OrderIndex
	existingStop.Address = req.Address
	existingStop.Latitude = req.Latitude
	existingStop.Longitude = req.Longitude

	if err := h.routeStopUsecase.UpdateStop(c.Request.Context(), existingStop); err != nil {
		if contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Stop or route not found",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update stop",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stop updated successfully",
		"data":    existingStop,
	})
}

// DeleteStop deletes a route stop
// @Summary Delete route stop
// @Description Delete a route stop (must maintain at least 1 pickup and 1 dropoff)
// @Tags admin
// @Produce json
// @Param routeId path string true "Route ID"
// @Param stopId path string true "Stop ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Stop deleted"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 404 {object} map[string]interface{} "Stop not found"
// @Failure 409 {object} map[string]interface{} "Cannot delete last stop"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes/{routeId}/stops/{stopId} [delete]
func (h *RouteStopHandler) DeleteStop(c *gin.Context) {
	stopID, err := uuid.Parse(c.Param("stopId"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid stop ID format",
		})
		return
	}

	if err := h.routeStopUsecase.DeleteStop(c.Request.Context(), stopID); err != nil {
		if contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Stop not found",
				"details": err.Error(),
			})
			return
		}

		if contains(err.Error(), "cannot delete") || contains(err.Error(), "last") {
			c.JSON(http.StatusConflict, gin.H{
				"error":   "Cannot delete stop",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete stop",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Stop deleted successfully",
	})
}

// GetRouteWithStops retrieves a route with all its stops
// @Summary Get route with stops
// @Description Get route details with pickup and dropoff points
// @Tags routes
// @Produce json
// @Param id path string true "Route ID"
// @Success 200 {object} map[string]interface{} "Route with stops"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Route not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /routes/{id} [get]
func (h *RouteStopHandler) GetRouteWithStops(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	result, err := h.routeStopUsecase.GetRouteWithStops(c.Request.Context(), routeID)
	if err != nil {
		if contains(err.Error(), "not found") {
			c.JSON(http.StatusNotFound, gin.H{
				"error":   "Route not found",
				"details": err.Error(),
			})
			return
		}

		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get route with stops",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    result,
	})
}
