package postgres

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"gorm.io/gorm"
)

type ticketRepository struct {
	db *gorm.DB
}

// NewTicketRepository creates a new ticket repository
func NewTicketRepository(db *gorm.DB) repositories.TicketRepository {
	return &ticketRepository{db: db}
}

func (r *ticketRepository) Create(ctx context.Context, ticket *entities.Ticket) error {
	return r.db.WithContext(ctx).Create(ticket).Error
}

func (r *ticketRepository) GetByID(ctx context.Context, id uuid.UUID) (*entities.Ticket, error) {
	var ticket entities.Ticket
	err := r.db.WithContext(ctx).
		Preload("Booking").
		Preload("Passenger").
		Preload("Trip").
		First(&ticket, "id = ?", id).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *ticketRepository) GetByTicketNumber(ctx context.Context, ticketNumber string) (*entities.Ticket, error) {
	var ticket entities.Ticket
	err := r.db.WithContext(ctx).
		Preload("Booking").
		Preload("Passenger").
		Preload("Trip").
		First(&ticket, "ticket_number = ?", ticketNumber).Error
	if err != nil {
		return nil, err
	}
	return &ticket, nil
}

func (r *ticketRepository) GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Ticket, error) {
	var tickets []*entities.Ticket
	err := r.db.WithContext(ctx).
		Preload("Passenger").
		Where("booking_id = ?", bookingID).
		Find(&tickets).Error
	return tickets, err
}

func (r *ticketRepository) BulkCreate(ctx context.Context, tickets []*entities.Ticket) error {
	if len(tickets) == 0 {
		return nil
	}
	return r.db.WithContext(ctx).Create(&tickets).Error
}

func (r *ticketRepository) Update(ctx context.Context, ticket *entities.Ticket) error {
	return r.db.WithContext(ctx).Save(ticket).Error
}

func (r *ticketRepository) MarkAsUsed(ctx context.Context, ticketNumber string) error {
	now := time.Now()
	return r.db.WithContext(ctx).
		Model(&entities.Ticket{}).
		Where("ticket_number = ?", ticketNumber).
		Updates(map[string]interface{}{
			"is_used": true,
			"used_at": now,
		}).Error
}
