package postgres

import (
	"context"

	"github.com/google/uuid"
	"gorm.io/gorm"

	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// ReviewRepository implements the repositories.ReviewRepository interface
type ReviewRepository struct {
	db *gorm.DB
}

// NewReviewRepository creates a new review repository
func NewReviewRepository(db *gorm.DB) *ReviewRepository {
	return &ReviewRepository{db: db}
}

// Create creates a new review
func (r *ReviewRepository) Create(ctx context.Context, review *entities.Review) error {
	return r.db.WithContext(ctx).Create(review).Error
}

// GetByID retrieves a review by ID
func (r *ReviewRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Review, error) {
	var review entities.Review
	err := r.db.WithContext(ctx).
		Preload("User").
		Preload("Trip").
		First(&review, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

// GetByTripID retrieves reviews for a trip with pagination
func (r *ReviewRepository) GetByTripID(ctx context.Context, tripID uuid.UUID, page, pageSize int) ([]*entities.Review, int64, error) {
	var reviews []*entities.Review
	var total int64

	// Count total reviews for the trip
	if err := r.db.WithContext(ctx).
		Model(&entities.Review{}).
		Where("trip_id = ? AND deleted_at IS NULL", tripID).
		Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// Apply pagination
	offset := (page - 1) * pageSize
	if offset < 0 {
		offset = 0
	}

	err := r.db.WithContext(ctx).
		Preload("User").
		Where("trip_id = ? AND deleted_at IS NULL", tripID).
		Order("created_at DESC").
		Offset(offset).
		Limit(pageSize).
		Find(&reviews).Error
	if err != nil {
		return nil, 0, err
	}

	return reviews, total, nil
}

// GetByUserID retrieves all reviews by a user
func (r *ReviewRepository) GetByUserID(ctx context.Context, userID uuid.UUID) ([]*entities.Review, error) {
	var reviews []*entities.Review
	err := r.db.WithContext(ctx).
		Preload("Trip").
		Where("user_id = ? AND deleted_at IS NULL", userID).
		Order("created_at DESC").
		Find(&reviews).Error
	if err != nil {
		return nil, err
	}
	return reviews, nil
}

// GetByBookingID retrieves a review by booking ID (to check if already reviewed)
func (r *ReviewRepository) GetByBookingID(ctx context.Context, bookingID uuid.UUID) (*entities.Review, error) {
	var review entities.Review
	err := r.db.WithContext(ctx).
		Where("booking_id = ? AND deleted_at IS NULL", bookingID).
		First(&review).Error
	if err != nil {
		return nil, err
	}
	return &review, nil
}

// GetTripStats retrieves aggregated review statistics for a trip
func (r *ReviewRepository) GetTripStats(ctx context.Context, tripID uuid.UUID) (*entities.ReviewStats, error) {
	var stats entities.ReviewStats

	// Get total count and average rating
	err := r.db.WithContext(ctx).
		Model(&entities.Review{}).
		Select("COUNT(*) as total_reviews, COALESCE(AVG(rating), 0) as average_rating").
		Where("trip_id = ? AND deleted_at IS NULL", tripID).
		Scan(&stats).Error
	if err != nil {
		return nil, err
	}

	// Get rating distribution
	type RatingCount struct {
		Rating int
		Count  int64
	}
	var ratingCounts []RatingCount
	err = r.db.WithContext(ctx).
		Model(&entities.Review{}).
		Select("rating, COUNT(*) as count").
		Where("trip_id = ? AND deleted_at IS NULL", tripID).
		Group("rating").
		Scan(&ratingCounts).Error
	if err != nil {
		return nil, err
	}

	for _, rc := range ratingCounts {
		switch rc.Rating {
		case 5:
			stats.Rating5Count = rc.Count
		case 4:
			stats.Rating4Count = rc.Count
		case 3:
			stats.Rating3Count = rc.Count
		case 2:
			stats.Rating2Count = rc.Count
		case 1:
			stats.Rating1Count = rc.Count
		}
	}

	return &stats, nil
}

// GetTripAverageRating retrieves the average rating for a trip
func (r *ReviewRepository) GetTripAverageRating(ctx context.Context, tripID uuid.UUID) (float64, error) {
	var avgRating float64
	err := r.db.WithContext(ctx).
		Model(&entities.Review{}).
		Select("COALESCE(AVG(rating), 0)").
		Where("trip_id = ? AND deleted_at IS NULL", tripID).
		Scan(&avgRating).Error
	if err != nil {
		return 0, err
	}
	return avgRating, nil
}

// Update updates an existing review
func (r *ReviewRepository) Update(ctx context.Context, review *entities.Review) error {
	return r.db.WithContext(ctx).Save(review).Error
}

// Delete soft-deletes a review
func (r *ReviewRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).
		Model(&entities.Review{}).
		Where("id = ?", id).
		Update("deleted_at", gorm.Expr("NOW()")).Error
}
