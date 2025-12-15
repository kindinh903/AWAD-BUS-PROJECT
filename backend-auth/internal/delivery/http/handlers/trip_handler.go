package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// TripHandler handles public trip search endpoints
type TripHandler struct {
	tripUsecase *usecases.TripUsecase
}

// NewTripHandler creates a new TripHandler
func NewTripHandler(tu *usecases.TripUsecase) *TripHandler {
	return &TripHandler{tripUsecase: tu}
}

// SearchTrips handles GET /api/v1/trips/search
// Query params: origin, destination, date (YYYY-MM-DD), optional bus_type, status, min_price, max_price
// Sorting: sort_by (price, time, duration), sort_order (asc, desc)
// Pagination: page (1-based), page_size (default 10, max 100)
func (h *TripHandler) SearchTrips(c *gin.Context) {
	origin := strings.TrimSpace(c.Query("origin"))
	destination := strings.TrimSpace(c.Query("destination"))
	dateStr := strings.TrimSpace(c.Query("date"))

	// Only date is required - origin and destination can be empty for browsing all trips
	if dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "date is required"})
		return
	}

	// parse date
	date, err := time.Parse("2006-01-02", dateStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid date format, expected YYYY-MM-DD"})
		return
	}

	var minPricePtr *float64
	var maxPricePtr *float64

	minPrice := strings.TrimSpace(c.Query("min_price"))
	maxPrice := strings.TrimSpace(c.Query("max_price"))

	if minPrice != "" {
		v, err := strconv.ParseFloat(minPrice, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid min_price"})
			return
		}
		minPricePtr = &v
	}

	if maxPrice != "" {
		v, err := strconv.ParseFloat(maxPrice, 64)
		if err != nil {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid max_price"})
			return
		}
		maxPricePtr = &v
	}

	if minPricePtr != nil && maxPricePtr != nil && *minPricePtr > *maxPricePtr {
		c.JSON(http.StatusBadRequest, gin.H{"error": "min_price cannot be greater than max_price"})
		return
	}

	busType := strings.TrimSpace(c.Query("bus_type"))
	status := strings.TrimSpace(c.Query("status"))

	var busTypePtr *string
	var statusPtr *string
	if busType != "" {
		busTypePtr = &busType
	}
	if status != "" {
		statusPtr = &status
	}

	// Parse sorting options
	sortBy := strings.TrimSpace(c.Query("sort_by"))
	sortOrder := strings.TrimSpace(c.Query("sort_order"))

	// Validate sort_by
	validSortFields := map[string]bool{"price": true, "time": true, "duration": true, "departure": true}
	if sortBy != "" && !validSortFields[strings.ToLower(sortBy)] {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sort_by, must be one of: price, time, duration, departure"})
		return
	}

	// Validate sort_order
	if sortOrder != "" && strings.ToLower(sortOrder) != "asc" && strings.ToLower(sortOrder) != "desc" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "invalid sort_order, must be 'asc' or 'desc'"})
		return
	}

	// Parse pagination options
	page := 1
	pageSize := 10

	if pageStr := strings.TrimSpace(c.Query("page")); pageStr != "" {
		p, err := strconv.Atoi(pageStr)
		if err != nil || p < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page, must be a positive integer"})
			return
		}
		page = p
	}

	if pageSizeStr := strings.TrimSpace(c.Query("page_size")); pageSizeStr != "" {
		ps, err := strconv.Atoi(pageSizeStr)
		if err != nil || ps < 1 {
			c.JSON(http.StatusBadRequest, gin.H{"error": "invalid page_size, must be a positive integer"})
			return
		}
		if ps > 100 {
			ps = 100 // Cap at 100
		}
		pageSize = ps
	}

	opts := repositories.TripSearchOptions{
		Origin:      origin,
		Destination: destination,
		Date:        date,
		BusType:     busTypePtr,
		Status:      statusPtr,
		MinPrice:    minPricePtr,
		MaxPrice:    maxPricePtr,
		SortBy:      sortBy,
		SortOrder:   sortOrder,
		Page:        page,
		PageSize:    pageSize,
	}

	result, err := h.tripUsecase.SearchTrips(c.Request.Context(), opts)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data": result.Data,
		"pagination": gin.H{
			"total":       result.Total,
			"page":        result.Page,
			"page_size":   result.PageSize,
			"total_pages": result.TotalPages,
		},
	})
}

// GetTripByID godoc
// @Summary Get trip details
// @Description Get detailed information about a specific trip
// @Tags trips
// @Produce json
// @Param id path string true "Trip ID"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /trips/{id} [get]
func (h *TripHandler) GetTripByID(c *gin.Context) {
	tripIDStr := c.Param("id")
	
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
		})
		return
	}
	
	trip, err := h.tripUsecase.GetTripByID(c.Request.Context(), tripID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Trip not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    trip,
	})
}

// GetRelatedTrips godoc
// @Summary Get related trips
// @Description Get similar trips on the same route for the given trip
// @Tags trips
// @Produce json
// @Param id path string true "Trip ID"
// @Param limit query int false "Maximum number of related trips (default 5)"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /trips/{id}/related [get]
func (h *TripHandler) GetRelatedTrips(c *gin.Context) {
	tripIDStr := c.Param("id")
	
	// Parse limit
	limit := 5
	if limitStr := c.Query("limit"); limitStr != "" {
		if l, err := strconv.Atoi(limitStr); err == nil && l > 0 && l <= 20 {
			limit = l
		}
	}

	relatedTrips, err := h.tripUsecase.GetRelatedTrips(c.Request.Context(), tripIDStr, limit)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get related trips",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    relatedTrips,
		"count":   len(relatedTrips),
	})
}

// UpdateTripStatusRequest represents the request for updating trip status
type UpdateTripStatusRequest struct {
	Status string `json:"status" binding:"required"` // scheduled, active, departed, completed, cancelled
}

// UpdateTripStatus godoc
// @Summary Update trip operational status
// @Description Update the status of a trip (admin only)
// @Tags admin
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Trip ID"
// @Param request body UpdateTripStatusRequest true "New status"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Router /admin/trips/{id}/status [put]
func (h *TripHandler) UpdateTripStatus(c *gin.Context) {
	tripIDStr := c.Param("id")
	
	var req UpdateTripStatusRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	// Validate status
	validStatuses := map[string]bool{
		"scheduled": true, "active": true, "departed": true, 
		"completed": true, "cancelled": true,
	}
	if !validStatuses[strings.ToLower(req.Status)] {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid status. Must be one of: scheduled, active, departed, completed, cancelled",
		})
		return
	}

	if err := h.tripUsecase.UpdateTripStatus(c.Request.Context(), tripIDStr, req.Status); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to update trip status",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Trip status updated successfully",
	})
}
