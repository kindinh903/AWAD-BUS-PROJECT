package postgres

import (
	"context"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type paymentRepository struct {
	db *gorm.DB
}

// NewPaymentRepository creates a new payment repository
func NewPaymentRepository(db *gorm.DB) repositories.PaymentRepository {
	return &paymentRepository{db: db}
}

func (r *paymentRepository) Create(ctx context.Context, payment *entities.Payment) error {
	return r.db.WithContext(ctx).Create(payment).Error
}

func (r *paymentRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Payment, error) {
	var payment entities.Payment
	err := r.db.WithContext(ctx).
		Preload("Booking").
		Where("id = ?", id).
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Payment, error) {
	var payments []*entities.Payment
	err := r.db.WithContext(ctx).
		Where("booking_id = ?", bookingID).
		Order("created_at DESC").
		Find(&payments).Error
	return payments, err
}

func (r *paymentRepository) GetByExternalID(ctx context.Context, externalID string) (*entities.Payment, error) {
	var payment entities.Payment
	err := r.db.WithContext(ctx).
		Preload("Booking").
		Where("external_payment_id = ?", externalID).
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) GetByOrderCode(ctx context.Context, orderCode string) (*entities.Payment, error) {
	var payment entities.Payment
	err := r.db.WithContext(ctx).
		Preload("Booking").
		Where("external_order_code = ?", orderCode).
		First(&payment).Error
	if err != nil {
		return nil, err
	}
	return &payment, nil
}

func (r *paymentRepository) Update(ctx context.Context, payment *entities.Payment) error {
	return r.db.WithContext(ctx).Save(payment).Error
}

func (r *paymentRepository) Delete(ctx context.Context, id uuid.UUID) error {
	return r.db.WithContext(ctx).Delete(&entities.Payment{}, "id = ?", id).Error
}

func (r *paymentRepository) GetPendingPayments(ctx context.Context) ([]*entities.Payment, error) {
	var payments []*entities.Payment
	err := r.db.WithContext(ctx).
		Where("status IN ?", []string{
			string(entities.PaymentTransactionPending),
			string(entities.PaymentTransactionProcessing),
		}).
		Find(&payments).Error
	return payments, err
}

func (r *paymentRepository) GetExpiredPayments(ctx context.Context) ([]*entities.Payment, error) {
	var payments []*entities.Payment
	err := r.db.WithContext(ctx).
		Where("status = ? AND expires_at < NOW()", string(entities.PaymentTransactionPending)).
		Find(&payments).Error
	return payments, err
}

// Webhook log repository
type paymentWebhookLogRepository struct {
	db *gorm.DB
}

// NewPaymentWebhookLogRepository creates a new payment webhook log repository
func NewPaymentWebhookLogRepository(db *gorm.DB) repositories.PaymentWebhookLogRepository {
	return &paymentWebhookLogRepository{db: db}
}

func (r *paymentWebhookLogRepository) Create(ctx context.Context, log *entities.PaymentWebhookLog) error {
	return r.db.WithContext(ctx).Create(log).Error
}

func (r *paymentWebhookLogRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.PaymentWebhookLog, error) {
	var log entities.PaymentWebhookLog
	err := r.db.WithContext(ctx).Where("id = ?", id).First(&log).Error
	if err != nil {
		return nil, err
	}
	return &log, nil
}

func (r *paymentWebhookLogRepository) GetByPaymentID(ctx context.Context, paymentID uuid.UUID) ([]*entities.PaymentWebhookLog, error) {
	var logs []*entities.PaymentWebhookLog
	err := r.db.WithContext(ctx).
		Where("payment_id = ?", paymentID).
		Order("created_at DESC").
		Find(&logs).Error
	return logs, err
}

func (r *paymentWebhookLogRepository) GetByExternalPaymentID(ctx context.Context, externalID string) ([]*entities.PaymentWebhookLog, error) {
	var logs []*entities.PaymentWebhookLog
	err := r.db.WithContext(ctx).
		Where("external_payment_id = ?", externalID).
		Order("created_at DESC").
		Find(&logs).Error
	return logs, err
}

func (r *paymentWebhookLogRepository) Update(ctx context.Context, log *entities.PaymentWebhookLog) error {
	return r.db.WithContext(ctx).Save(log).Error
}

func (r *paymentWebhookLogRepository) GetPendingLogs(ctx context.Context) ([]*entities.PaymentWebhookLog, error) {
	var logs []*entities.PaymentWebhookLog
	err := r.db.WithContext(ctx).
		Where("processed_status = ? AND retry_count < 3", "pending").
		Order("created_at ASC").
		Limit(100).
		Find(&logs).Error
	return logs, err
}
