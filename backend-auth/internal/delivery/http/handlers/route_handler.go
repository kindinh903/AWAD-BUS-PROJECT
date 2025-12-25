package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// RouteHandler handles route-related operations
type RouteHandler struct {
	routeRepo repositories.RouteRepository
}

// NewRouteHandler creates a new route handler
func NewRouteHandler(routeRepo repositories.RouteRepository) *RouteHandler {
	return &RouteHandler{
		routeRepo: routeRepo,
	}
}

// CreateRouteRequest represents the request for creating a new route
type CreateRouteRequest struct {
	Origin          string   `json:"origin" binding:"required"`
	Destination     string   `json:"destination" binding:"required"`
	DurationMinutes int      `json:"durationMinutes" binding:"required,min=1"`
	Distance        *float64 `json:"distance,omitempty"`
	BasePrice       float64  `json:"basePrice" binding:"required,min=0"`
	Description     *string  `json:"description,omitempty"`
}

// UpdateRouteRequest represents the request for updating a route
type UpdateRouteRequest struct {
	Origin          *string  `json:"origin,omitempty"`
	Destination     *string  `json:"destination,omitempty"`
	DurationMinutes *int     `json:"durationMinutes,omitempty"`
	Distance        *float64 `json:"distance,omitempty"`
	BasePrice       *float64 `json:"basePrice,omitempty"`
	Description     *string  `json:"description,omitempty"`
	IsActive        *bool    `json:"isActive,omitempty"`
}

// CreateRoute creates a new route
// @Summary Create route
// @Description Create a new route (admin only)
// @Tags admin,routes
// @Accept json
// @Produce json
// @Param route body CreateRouteRequest true "Route details"
// @Security BearerAuth
// @Success 201 {object} map[string]interface{} "Created route"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 401 {object} map[string]interface{} "Unauthorized"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes [post]
func (h *RouteHandler) CreateRoute(c *gin.Context) {
	var req CreateRouteRequest

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate that origin and destination are different
	if req.Origin == req.Destination {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Origin and destination must be different",
		})
		return
	}

	// Create route entity
	route := &entities.Route{
		Origin:          req.Origin,
		Destination:     req.Destination,
		DurationMinutes: req.DurationMinutes,
		Distance:        req.Distance,
		BasePrice:       req.BasePrice,
		Description:     req.Description,
		IsActive:        true,
	}

	// Save to database
	if err := h.routeRepo.Create(c.Request.Context(), route); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create route",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"message": "Route created successfully",
		"data":    route,
	})
}

// GetAllRoutes retrieves all routes
// @Summary Get all routes
// @Description Get list of all routes (including inactive ones for admin)
// @Tags routes
// @Produce json
// @Param active query bool false "Filter by active status"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "List of routes"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /routes [get]
func (h *RouteHandler) GetAllRoutes(c *gin.Context) {
	activeOnly := c.Query("active") == "true"

	routes, err := h.routeRepo.GetAll(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to fetch routes",
			"details": err.Error(),
		})
		return
	}

	// Filter by active status if requested
	if activeOnly {
		activeRoutes := make([]*entities.Route, 0)
		for _, route := range routes {
			if route.IsActive {
				activeRoutes = append(activeRoutes, route)
			}
		}
		routes = activeRoutes
	}

	c.JSON(http.StatusOK, gin.H{
		"data": routes,
	})
}

// GetRouteByID retrieves a route by ID
// @Summary Get route by ID
// @Description Get a specific route by ID
// @Tags routes
// @Produce json
// @Param id path string true "Route ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Route details"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Route not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /routes/{id} [get]
func (h *RouteHandler) GetRouteByID(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	route, err := h.routeRepo.GetByID(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": route,
	})
}

// UpdateRoute updates an existing route
// @Summary Update route
// @Description Update an existing route (admin only)
// @Tags admin,routes
// @Accept json
// @Produce json
// @Param id path string true "Route ID"
// @Param route body UpdateRouteRequest true "Updated route details"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Updated route"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Route not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes/{id} [put]
func (h *RouteHandler) UpdateRoute(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	var req UpdateRouteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Get existing route
	route, err := h.routeRepo.GetByID(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
		return
	}

	// Update fields if provided
	if req.Origin != nil {
		route.Origin = *req.Origin
	}
	if req.Destination != nil {
		route.Destination = *req.Destination
	}
	if req.DurationMinutes != nil {
		route.DurationMinutes = *req.DurationMinutes
	}
	if req.Distance != nil {
		route.Distance = req.Distance
	}
	if req.BasePrice != nil {
		route.BasePrice = *req.BasePrice
	}
	if req.Description != nil {
		route.Description = req.Description
	}
	if req.IsActive != nil {
		route.IsActive = *req.IsActive
	}

	// Validate that origin and destination are different
	if route.Origin == route.Destination {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Origin and destination must be different",
		})
		return
	}

	// Update in database
	if err := h.routeRepo.Update(c.Request.Context(), route); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update route",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Route updated successfully",
		"data":    route,
	})
}

// DeleteRoute deletes a route (soft delete)
// @Summary Delete route
// @Description Soft delete a route (admin only)
// @Tags admin,routes
// @Produce json
// @Param id path string true "Route ID"
// @Security BearerAuth
// @Success 200 {object} map[string]interface{} "Success message"
// @Failure 400 {object} map[string]interface{} "Bad request"
// @Failure 404 {object} map[string]interface{} "Route not found"
// @Failure 500 {object} map[string]interface{} "Internal server error"
// @Router /admin/routes/{id} [delete]
func (h *RouteHandler) DeleteRoute(c *gin.Context) {
	routeID, err := uuid.Parse(c.Param("id"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid route ID format",
		})
		return
	}

	// Check if route exists
	_, err = h.routeRepo.GetByID(c.Request.Context(), routeID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error": "Route not found",
		})
		return
	}

	// Soft delete
	if err := h.routeRepo.Delete(c.Request.Context(), routeID); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to delete route",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"message": "Route deleted successfully",
	})
}
