package usecases

import (
	"context"
	"errors"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
)

// ReviewUsecase handles review business logic
type ReviewUsecase struct {
	reviewRepo  repositories.ReviewRepository
	bookingRepo repositories.BookingRepository
	tripRepo    repositories.TripRepository
}

// NewReviewUsecase creates a new review usecase
func NewReviewUsecase(
	reviewRepo repositories.ReviewRepository,
	bookingRepo repositories.BookingRepository,
	tripRepo repositories.TripRepository,
) *ReviewUsecase {
	return &ReviewUsecase{
		reviewRepo:  reviewRepo,
		bookingRepo: bookingRepo,
		tripRepo:    tripRepo,
	}
}

// CreateReviewInput holds input data for creating a review
type CreateReviewInput struct {
	TripID    uuid.UUID `json:"trip_id" binding:"required"`
	BookingID uuid.UUID `json:"booking_id" binding:"required"`
	Rating    int       `json:"rating" binding:"required,min=1,max=5"`
	Title     string    `json:"title"`
	Comment   string    `json:"comment"`
}

// CreateReview creates a new review for a completed trip
func (u *ReviewUsecase) CreateReview(ctx context.Context, userID uuid.UUID, input CreateReviewInput) (*entities.Review, error) {
	// Validate rating range
	if input.Rating < 1 || input.Rating > 5 {
		return nil, errors.New("rating must be between 1 and 5")
	}

	// Verify the trip exists
	trip, err := u.tripRepo.GetByID(ctx, input.TripID)
	if err != nil {
		return nil, errors.New("trip not found")
	}

	// Verify the booking exists and belongs to the user
	booking, err := u.bookingRepo.GetByID(ctx, input.BookingID)
	if err != nil {
		return nil, errors.New("booking not found")
	}

	// Check if the booking belongs to this user
	if booking.UserID != nil && *booking.UserID != userID {
		return nil, errors.New("booking does not belong to this user")
	}

	// Check if the booking is for this trip
	if booking.TripID != input.TripID {
		return nil, errors.New("booking is not for this trip")
	}

	// Check if the booking is confirmed (completed)
	if booking.Status != entities.BookingStatusConfirmed {
		return nil, errors.New("can only review confirmed bookings")
	}

	// Check if the trip has ended (can only review after trip completion)
	if trip.EndTime.After(time.Now()) {
		return nil, errors.New("can only review after trip has completed")
	}

	// Check if user has already reviewed this booking
	existingReview, _ := u.reviewRepo.GetByBookingID(ctx, input.BookingID)
	if existingReview != nil {
		return nil, errors.New("you have already reviewed this booking")
	}

	// Create the review
	review := &entities.Review{
		TripID:    input.TripID,
		UserID:    userID,
		BookingID: input.BookingID,
		Rating:    input.Rating,
		Title:     input.Title,
		Comment:   input.Comment,
	}

	if err := u.reviewRepo.Create(ctx, review); err != nil {
		return nil, err
	}

	return review, nil
}

// GetTripReviewsInput holds input for fetching trip reviews
type GetTripReviewsInput struct {
	TripID   uuid.UUID
	Page     int
	PageSize int
}

// TripReviewsResponse holds paginated review response
type TripReviewsResponse struct {
	Reviews    []*entities.Review   `json:"reviews"`
	Stats      *entities.ReviewStats `json:"stats"`
	Total      int64                `json:"total"`
	Page       int                  `json:"page"`
	PageSize   int                  `json:"page_size"`
	TotalPages int                  `json:"total_pages"`
}

// GetTripReviews retrieves paginated reviews for a trip
func (u *ReviewUsecase) GetTripReviews(ctx context.Context, input GetTripReviewsInput) (*TripReviewsResponse, error) {
	// Set defaults
	if input.Page < 1 {
		input.Page = 1
	}
	if input.PageSize < 1 || input.PageSize > 50 {
		input.PageSize = 10
	}

	// Get paginated reviews
	reviews, total, err := u.reviewRepo.GetByTripID(ctx, input.TripID, input.Page, input.PageSize)
	if err != nil {
		return nil, err
	}

	// Get review stats
	stats, err := u.reviewRepo.GetTripStats(ctx, input.TripID)
	if err != nil {
		// Stats are optional, don't fail if error
		stats = &entities.ReviewStats{}
	}

	// Calculate total pages
	totalPages := int(total) / input.PageSize
	if int(total)%input.PageSize > 0 {
		totalPages++
	}

	return &TripReviewsResponse{
		Reviews:    reviews,
		Stats:      stats,
		Total:      total,
		Page:       input.Page,
		PageSize:   input.PageSize,
		TotalPages: totalPages,
	}, nil
}

// GetUserReviews retrieves all reviews by a user
func (u *ReviewUsecase) GetUserReviews(ctx context.Context, userID uuid.UUID) ([]*entities.Review, error) {
	return u.reviewRepo.GetByUserID(ctx, userID)
}

// GetReviewByID retrieves a specific review
func (u *ReviewUsecase) GetReviewByID(ctx context.Context, id uuid.UUID) (*entities.Review, error) {
	return u.reviewRepo.GetByID(ctx, id)
}

// UpdateReviewInput holds input for updating a review
type UpdateReviewInput struct {
	Rating  *int    `json:"rating"`
	Title   *string `json:"title"`
	Comment *string `json:"comment"`
}

// UpdateReview updates an existing review (only by the owner)
func (u *ReviewUsecase) UpdateReview(ctx context.Context, reviewID, userID uuid.UUID, input UpdateReviewInput) (*entities.Review, error) {
	review, err := u.reviewRepo.GetByID(ctx, reviewID)
	if err != nil {
		return nil, errors.New("review not found")
	}

	// Check ownership
	if review.UserID != userID {
		return nil, errors.New("you can only edit your own reviews")
	}

	// Update fields
	if input.Rating != nil {
		if *input.Rating < 1 || *input.Rating > 5 {
			return nil, errors.New("rating must be between 1 and 5")
		}
		review.Rating = *input.Rating
	}
	if input.Title != nil {
		review.Title = *input.Title
	}
	if input.Comment != nil {
		review.Comment = *input.Comment
	}

	if err := u.reviewRepo.Update(ctx, review); err != nil {
		return nil, err
	}

	return review, nil
}

// DeleteReview deletes a review (only by the owner)
func (u *ReviewUsecase) DeleteReview(ctx context.Context, reviewID, userID uuid.UUID) error {
	review, err := u.reviewRepo.GetByID(ctx, reviewID)
	if err != nil {
		return errors.New("review not found")
	}

	// Check ownership
	if review.UserID != userID {
		return errors.New("you can only delete your own reviews")
	}

	return u.reviewRepo.Delete(ctx, reviewID)
}

// GetTripAverageRating gets the average rating for a trip
func (u *ReviewUsecase) GetTripAverageRating(ctx context.Context, tripID uuid.UUID) (float64, error) {
	return u.reviewRepo.GetTripAverageRating(ctx, tripID)
}
