package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type notificationRepository struct {
	db *gorm.DB
}

// NewNotificationRepository creates a new notification repository
func NewNotificationRepository(db *gorm.DB) repositories.NotificationRepository {
	return &notificationRepository{db: db}
}

func (r *notificationRepository) Create(ctx context.Context, notification *entities.Notification) error {
	return r.db.WithContext(ctx).Create(notification).Error
}

func (r *notificationRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Notification, error) {
	var notif entities.Notification
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&notif).Error
	if err != nil {
		return nil, err
	}
	return &notif, nil
}

func (r *notificationRepository) GetByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Notification, error) {
	var notifs []*entities.Notification
	query := r.db.WithContext(ctx).
		Where("user_id = ?", userID).
		Order("created_at DESC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&notifs).Error
	return notifs, err
}

func (r *notificationRepository) GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Notification, error) {
	var notifs []*entities.Notification
	err := r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Order("created_at DESC").
		Find(&notifs).Error
	return notifs, err
}

func (r *notificationRepository) Update(ctx context.Context, notification *entities.Notification) error {
	return r.db.WithContext(ctx).Save(notification).Error
}

func (r *notificationRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.Notification{}, "id = ?", id).Error
}

func (r *notificationRepository) GetPending(ctx context.Context, limit int) ([]*entities.Notification, error) {
	var notifs []*entities.Notification
	query := r.db.WithContext(ctx).
		Where("status IN ?", []string{
			string(entities.NotificationStatusPending),
			string(entities.NotificationStatusQueued),
		}).
		Where("(scheduled_for IS NULL OR scheduled_for <= ?)", time.Now()).
		Order("created_at ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&notifs).Error
	return notifs, err
}

func (r *notificationRepository) GetScheduled(ctx context.Context, beforeTime time.Time, limit int) ([]*entities.Notification, error) {
	var notifs []*entities.Notification
	query := r.db.WithContext(ctx).
		Where("status = ?", string(entities.NotificationStatusPending)).
		Where("scheduled_for IS NOT NULL AND scheduled_for <= ?", beforeTime).
		Order("scheduled_for ASC")

	if limit > 0 {
		query = query.Limit(limit)
	}

	err := query.Find(&notifs).Error
	return notifs, err
}

func (r *notificationRepository) DeleteOlderThan(ctx context.Context, cutoffTime time.Time) error {
	return r.db.WithContext(ctx).
		Where("status = ? AND created_at < ?", string(entities.NotificationStatusSent), cutoffTime).
		Delete(&entities.Notification{}).Error
}

func (r *notificationRepository) MarkAsSent(ctx context.Context, id uuid.UUID) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entities.Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":  string(entities.NotificationStatusSent),
			"sent_at": now,
		}).Error
}

func (r *notificationRepository) MarkAsFailed(ctx context.Context, id uuid.UUID, errorMsg string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entities.Notification{}).
		Where("id = ?", id).
		Updates(map[string]interface{}{
			"status":        string(entities.NotificationStatusFailed),
			"failed_at":     now,
			"error_message": errorMsg,
		}).Error
}

// Notification preference repository
type notificationPreferenceRepository struct {
	db *gorm.DB
}

// NewNotificationPreferenceRepository creates a new notification preference repository
func NewNotificationPreferenceRepository(db *gorm.DB) repositories.NotificationPreferenceRepository {
	return &notificationPreferenceRepository{db: db}
}

func (r *notificationPreferenceRepository) Create(ctx context.Context, pref *entities.NotificationPreference) error {
	return r.db.WithContext(ctx).Create(pref).Error
}

func (r *notificationPreferenceRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.NotificationPreference, error) {
	var pref entities.NotificationPreference
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&pref).Error
	if err != nil {
		return nil, err
	}
	return &pref, nil
}

func (r *notificationPreferenceRepository) GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.NotificationPreference, error) {
	var pref entities.NotificationPreference
	err := r.db.WithContext(ctx).Where("user_id = ?", userID).First(&pref).Error
	if err != nil {
		return nil, err
	}
	return &pref, nil
}

func (r *notificationPreferenceRepository) Update(ctx context.Context, pref *entities.NotificationPreference) error {
	return r.db.WithContext(ctx).Save(pref).Error
}

func (r *notificationPreferenceRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.NotificationPreference{}, "id = ?", id).Error
}

func (r *notificationPreferenceRepository) CreateDefault(ctx context.Context, userID uuid.UUID) (*entities.NotificationPreference, error) {
	pref := &entities.NotificationPreference{
		UserID:              userID,
		EmailEnabled:        true,
		BookingConfirmation: true,
		PaymentReceipts:     true,
		TripReminders:       true,
		CancellationNotices: true,
		SMSEnabled:          false,
		SMSBookingConfirm:   false,
		SMSTripReminders:    false,
		PromotionalEmails:   true,
		Newsletter:          false,
	}

	err := r.db.WithContext(ctx).Create(pref).Error
	if err != nil {
		return nil, err
	}

	return pref, nil
}
