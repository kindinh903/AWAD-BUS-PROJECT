// Package handlers provides HTTP request handlers for analytics operations.
package handlers

import (
	"fmt"
	"net/http"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// AnalyticsHandler handles HTTP requests for analytics operations
// All analytics endpoints require admin authentication
type AnalyticsHandler struct {
	analyticsUsecase *usecases.AnalyticsUsecase
}

// NewAnalyticsHandler creates a new analytics handler
func NewAnalyticsHandler(analyticsUsecase *usecases.AnalyticsUsecase) *AnalyticsHandler {
	return &AnalyticsHandler{
		analyticsUsecase: analyticsUsecase,
	}
}

// GetDashboardSummary handles GET /api/v1/admin/analytics/dashboard
// Returns key metrics for admin dashboard homepage
func (h *AnalyticsHandler) GetDashboardSummary(c *gin.Context) {
	summary, err := h.analyticsUsecase.GetDashboardSummary(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve dashboard summary",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"dashboard": summary,
	})
}

// GetBookingTrends handles GET /api/v1/admin/analytics/bookings/trends
// Query params: start_date (YYYY-MM-DD), end_date (YYYY-MM-DD)
func (h *AnalyticsHandler) GetBookingTrends(c *gin.Context) {
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	trends, err := h.analyticsUsecase.GetBookingTrends(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve booking trends",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"trends":     trends,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
	})
}

// GetRevenueSummary handles GET /api/v1/admin/analytics/revenue
// Query params: start_date, end_date
func (h *AnalyticsHandler) GetRevenueSummary(c *gin.Context) {
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	summary, err := h.analyticsUsecase.GetRevenueSummary(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve revenue summary",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"revenue": summary,
	})
}

// GetConversionRate handles GET /api/v1/admin/analytics/conversion-rate
// Query params: start_date, end_date
func (h *AnalyticsHandler) GetConversionRate(c *gin.Context) {
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	conversionData, err := h.analyticsUsecase.GetConversionRate(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve conversion rate",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"conversion": conversionData,
	})
}

// GetPopularRoutes handles GET /api/v1/admin/analytics/routes/popular
// Query params: start_date, end_date, limit (default: 10), order_by (revenue|bookings, default: revenue)
func (h *AnalyticsHandler) GetPopularRoutes(c *gin.Context) {
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	// Parse limit parameter
	limit := 10
	if limitStr := c.Query("limit"); limitStr != "" {
		if parsedLimit, err := strconv.Atoi(limitStr); err == nil && parsedLimit > 0 {
			limit = parsedLimit
		}
	}

	// Parse order_by parameter
	orderBy := c.DefaultQuery("order_by", "revenue")
	if orderBy != "revenue" && orderBy != "bookings" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "order_by must be 'revenue' or 'bookings'"})
		return
	}

	routes, err := h.analyticsUsecase.GetPopularRoutes(c.Request.Context(), startDate, endDate, limit, orderBy)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve popular routes",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"routes":     routes,
		"start_date": startDate.Format("2006-01-02"),
		"end_date":   endDate.Format("2006-01-02"),
		"order_by":   orderBy,
		"limit":      limit,
	})
}

// GetRoutePerformance handles GET /api/v1/admin/analytics/routes/:id/performance
// Path param: route_id
// Query params: start_date, end_date
func (h *AnalyticsHandler) GetRoutePerformance(c *gin.Context) {
	// Parse route ID
	routeID, err := strconv.ParseUint(c.Param("id"), 10, 32)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid route ID"})
		return
	}

	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	performance, err := h.analyticsUsecase.GetRoutePerformance(c.Request.Context(), uint(routeID), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve route performance",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"performance": performance,
	})
}

// GetRevenueByTimeOfDay handles GET /api/v1/admin/analytics/revenue/time-of-day
// Query params: start_date, end_date
func (h *AnalyticsHandler) GetRevenueByTimeOfDay(c *gin.Context) {
	startDate, endDate, err := h.parseDateRange(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	distribution, err := h.analyticsUsecase.GetRevenueByTimeOfDay(c.Request.Context(), startDate, endDate)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve revenue distribution",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"distribution": distribution,
		"start_date":   startDate.Format("2006-01-02"),
		"end_date":     endDate.Format("2006-01-02"),
	})
}

// ComparePeriods handles GET /api/v1/admin/analytics/compare
// Query params:
//
//	current_start, current_end
//	previous_start, previous_end
func (h *AnalyticsHandler) ComparePeriods(c *gin.Context) {
	// Parse current period
	currentStart, err := time.Parse("2006-01-02", c.Query("current_start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid current_start date format (use YYYY-MM-DD)"})
		return
	}

	currentEnd, err := time.Parse("2006-01-02", c.Query("current_end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid current_end date format (use YYYY-MM-DD)"})
		return
	}

	// Parse previous period
	previousStart, err := time.Parse("2006-01-02", c.Query("previous_start"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid previous_start date format (use YYYY-MM-DD)"})
		return
	}

	previousEnd, err := time.Parse("2006-01-02", c.Query("previous_end"))
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid previous_end date format (use YYYY-MM-DD)"})
		return
	}

	comparison, err := h.analyticsUsecase.ComparePeriods(c.Request.Context(), currentStart, currentEnd, previousStart, previousEnd)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to compare periods",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"comparison": comparison,
	})
}

// Helper function to parse date range from query parameters
func (h *AnalyticsHandler) parseDateRange(c *gin.Context) (startDate, endDate time.Time, err error) {
	// Get start_date from query, default to 30 days ago
	startDateStr := c.Query("start_date")
	if startDateStr == "" {
		startDate = time.Now().AddDate(0, 0, -30)
	} else {
		startDate, err = time.Parse("2006-01-02", startDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid start_date format (use YYYY-MM-DD)")
		}
	}

	// Get end_date from query, default to today
	endDateStr := c.Query("end_date")
	if endDateStr == "" {
		endDate = time.Now()
	} else {
		endDate, err = time.Parse("2006-01-02", endDateStr)
		if err != nil {
			return time.Time{}, time.Time{}, fmt.Errorf("invalid end_date format (use YYYY-MM-DD)")
		}
	}

	// Normalize to end of day
	endDate = time.Date(endDate.Year(), endDate.Month(), endDate.Day(), 23, 59, 59, 0, endDate.Location())

	// Validate date range
	if endDate.Before(startDate) {
		return time.Time{}, time.Time{}, fmt.Errorf("end_date must be after start_date")
	}

	return startDate, endDate, nil
}

// RegisterAnalyticsRoutes registers all analytics-related routes
// All routes require admin authentication
func RegisterAnalyticsRoutes(router *gin.RouterGroup, handler *AnalyticsHandler, adminMiddleware gin.HandlerFunc) {
	analytics := router.Group("/analytics")
	analytics.Use(adminMiddleware)
	{
		// Dashboard overview
		analytics.GET("/dashboard", handler.GetDashboardSummary)

		// Booking analytics
		analytics.GET("/bookings/trends", handler.GetBookingTrends)
		analytics.GET("/conversion-rate", handler.GetConversionRate)

		// Revenue analytics
		analytics.GET("/revenue", handler.GetRevenueSummary)
		analytics.GET("/revenue/time-of-day", handler.GetRevenueByTimeOfDay)

		// Route analytics
		analytics.GET("/routes/popular", handler.GetPopularRoutes)
		analytics.GET("/routes/:id/performance", handler.GetRoutePerformance)

		// Comparison
		analytics.GET("/compare", handler.ComparePeriods)
	}
}
