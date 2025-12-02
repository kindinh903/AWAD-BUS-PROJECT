package handlers

import (
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
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

	if origin == "" || destination == "" || dateStr == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "origin, destination and date are required"})
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
