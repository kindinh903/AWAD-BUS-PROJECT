package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// ReviewHandler handles review-related HTTP requests
type ReviewHandler struct {
	reviewUsecase *usecases.ReviewUsecase
}

// NewReviewHandler creates a new review handler
func NewReviewHandler(reviewUsecase *usecases.ReviewUsecase) *ReviewHandler {
	return &ReviewHandler{
		reviewUsecase: reviewUsecase,
	}
}

// CreateReviewRequest represents the request body for creating a review
type CreateReviewRequest struct {
	BookingID string `json:"booking_id" binding:"required,uuid"`
	Rating    int    `json:"rating" binding:"required,min=1,max=5"`
	Title     string `json:"title"`
	Comment   string `json:"comment"`
}

// GetTripReviews godoc
// @Summary Get trip reviews
// @Description Get paginated reviews for a specific trip
// @Tags reviews
// @Produce json
// @Param id path string true "Trip ID"
// @Param page query int false "Page number (default 1)"
// @Param page_size query int false "Items per page (default 10, max 50)"
// @Success 200 {object} usecases.TripReviewsResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /trips/{id}/reviews [get]
func (h *ReviewHandler) GetTripReviews(c *gin.Context) {
	tripIDStr := c.Param("id")
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
		})
		return
	}

	// Parse pagination params
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	input := usecases.GetTripReviewsInput{
		TripID:   tripID,
		Page:     page,
		PageSize: pageSize,
	}

	response, err := h.reviewUsecase.GetTripReviews(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get reviews",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    response,
	})
}

// CreateReview godoc
// @Summary Create a trip review
// @Description Create a review for a completed trip (authenticated users only)
// @Tags reviews
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Trip ID"
// @Param request body CreateReviewRequest true "Review data"
// @Success 201 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /trips/{id}/reviews [post]
func (h *ReviewHandler) CreateReview(c *gin.Context) {
	// Get user ID from context (set by auth middleware)
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	userID, ok := userIDValue.(uuid.UUID)
	if !ok {
		// Try parsing as string
		userIDStr, ok := userIDValue.(string)
		if !ok {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user ID in context",
			})
			return
		}
		var err error
		userID, err = uuid.Parse(userIDStr)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{
				"error": "Invalid user ID format",
			})
			return
		}
	}

	tripIDStr := c.Param("id")
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid trip ID format",
		})
		return
	}

	var req CreateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	bookingID, err := uuid.Parse(req.BookingID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid booking ID format",
		})
		return
	}

	input := usecases.CreateReviewInput{
		TripID:    tripID,
		BookingID: bookingID,
		Rating:    req.Rating,
		Title:     req.Title,
		Comment:   req.Comment,
	}

	review, err := h.reviewUsecase.CreateReview(c.Request.Context(), userID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to create review",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"success": true,
		"data":    review,
		"message": "Review created successfully",
	})
}

// UpdateReviewRequest represents the request body for updating a review
type UpdateReviewRequest struct {
	Rating  *int    `json:"rating" binding:"omitempty,min=1,max=5"`
	Title   *string `json:"title"`
	Comment *string `json:"comment"`
}

// UpdateReview godoc
// @Summary Update a review
// @Description Update an existing review (owner only)
// @Tags reviews
// @Accept json
// @Produce json
// @Security BearerAuth
// @Param id path string true "Review ID"
// @Param request body UpdateReviewRequest true "Updated review data"
// @Success 200 {object} map[string]interface{}
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Router /reviews/{id} [put]
func (h *ReviewHandler) UpdateReview(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	userID, err := parseUserID(userIDValue)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	reviewIDStr := c.Param("id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid review ID format",
		})
		return
	}

	var req UpdateReviewRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request body",
			"details": err.Error(),
		})
		return
	}

	input := usecases.UpdateReviewInput{
		Rating:  req.Rating,
		Title:   req.Title,
		Comment: req.Comment,
	}

	review, err := h.reviewUsecase.UpdateReview(c.Request.Context(), reviewID, userID, input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to update review",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    review,
		"message": "Review updated successfully",
	})
}

// DeleteReview godoc
// @Summary Delete a review
// @Description Delete an existing review (owner only)
// @Tags reviews
// @Produce json
// @Security BearerAuth
// @Param id path string true "Review ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 401 {object} ErrorResponse
// @Failure 403 {object} ErrorResponse
// @Router /reviews/{id} [delete]
func (h *ReviewHandler) DeleteReview(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	userID, err := parseUserID(userIDValue)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	reviewIDStr := c.Param("id")
	reviewID, err := uuid.Parse(reviewIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error": "Invalid review ID format",
		})
		return
	}

	if err := h.reviewUsecase.DeleteReview(c.Request.Context(), reviewID, userID); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Failed to delete review",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"message": "Review deleted successfully",
	})
}

// GetUserReviews godoc
// @Summary Get user reviews
// @Description Get all reviews by the authenticated user
// @Tags reviews
// @Produce json
// @Security BearerAuth
// @Success 200 {object} map[string]interface{}
// @Failure 401 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /reviews/my-reviews [get]
func (h *ReviewHandler) GetUserReviews(c *gin.Context) {
	userIDValue, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": "User not authenticated",
		})
		return
	}

	userID, err := parseUserID(userIDValue)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{
			"error": err.Error(),
		})
		return
	}

	reviews, err := h.reviewUsecase.GetUserReviews(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to get reviews",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"success": true,
		"data":    reviews,
		"count":   len(reviews),
	})
}

// Helper function to parse user ID from context
func parseUserID(userIDValue interface{}) (uuid.UUID, error) {
	switch v := userIDValue.(type) {
	case uuid.UUID:
		return v, nil
	case string:
		return uuid.Parse(v)
	default:
		return uuid.Nil, errors.New("invalid user ID type")
	}
}

var errors = struct {
	New func(text string) error
}{
	New: func(text string) error {
		return &errorString{text}
	},
}

type errorString struct {
	s string
}

func (e *errorString) Error() string {
	return e.s
}
