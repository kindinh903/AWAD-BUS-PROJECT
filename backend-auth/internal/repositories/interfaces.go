package repositories

import (
	"context"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
)

// UserRepository defines the interface for user data operations
type UserRepository interface {
	Create(ctx context.Context, user *entities.User) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.User, error)
	GetByEmail(ctx context.Context, email string) (*entities.User, error)
	GetByOAuthID(ctx context.Context, oauthID string, provider string) (*entities.User, error)
	Update(ctx context.Context, user *entities.User) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// RefreshTokenRepository defines the interface for refresh token operations
type RefreshTokenRepository interface {
	Create(ctx context.Context, token *entities.RefreshToken) error
	GetByToken(ctx context.Context, token string) (*entities.RefreshToken, error)
	Revoke(ctx context.Context, token string) error
	RevokeAllForUser(ctx context.Context, userID uuid.UUID) error
	DeleteExpired(ctx context.Context) error
}

// BusRepository defines the interface for bus data operations
type BusRepository interface {
	Create(ctx context.Context, bus *entities.Bus) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Bus, error)
	GetAll(ctx context.Context) ([]*entities.Bus, error)
	GetAvailable(ctx context.Context, startTime, endTime time.Time) ([]*entities.Bus, error)
	Update(ctx context.Context, bus *entities.Bus) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// RouteRepository defines the interface for route data operations
type RouteRepository interface {
	Create(ctx context.Context, route *entities.Route) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Route, error)
	GetAll(ctx context.Context) ([]*entities.Route, error)
	GetActiveRoutes(ctx context.Context) ([]*entities.Route, error)
	Update(ctx context.Context, route *entities.Route) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// TripRepository defines the interface for trip data operations
type TripRepository interface {
	Create(ctx context.Context, trip *entities.Trip) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Trip, error)
	GetAll(ctx context.Context) ([]*entities.Trip, error)
	GetByBusID(ctx context.Context, busID uuid.UUID, startTime, endTime time.Time) ([]*entities.Trip, error)
	AssignBus(ctx context.Context, tripID, busID uuid.UUID) error
	Update(ctx context.Context, trip *entities.Trip) error
	Delete(ctx context.Context, id uuid.UUID) error
	SearchTrips(ctx context.Context, options TripSearchOptions) (*PaginatedTrips, error)
}

// TripSearchOptions holds optional search filters for trips
type TripSearchOptions struct {
	Origin      string
	Destination string
	Date        time.Time
	BusType     *string
	Status      *string
	MinPrice    *float64
	MaxPrice    *float64
	// Sorting options
	SortBy    string // "price", "time", "duration", "departure"
	SortOrder string // "asc", "desc"
	// Pagination options
	Page     int // 1-based page number
	PageSize int // Items per page (default 10, max 100)
}

// PaginatedTrips represents a paginated response for trip searches
type PaginatedTrips struct {
	Data       []*entities.Trip `json:"data"`
	Total      int64            `json:"total"`
	Page       int              `json:"page"`
	PageSize   int              `json:"page_size"`
	TotalPages int              `json:"total_pages"`
}

// SearchTrips searches trips joined with route and bus information using filters
type TripSearchRepository interface {
	SearchTrips(ctx context.Context, opts TripSearchOptions) (*PaginatedTrips, error)
}

// SeatMapRepository defines the interface for seat map data operations
type SeatMapRepository interface {
	Create(ctx context.Context, seatMap *entities.SeatMap) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error)
	GetAll(ctx context.Context) ([]*entities.SeatMap, error)
	Update(ctx context.Context, seatMap *entities.SeatMap) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetWithSeats(ctx context.Context, id uuid.UUID) (*entities.SeatMap, error)
	CreateSeat(ctx context.Context, seat *entities.Seat) error
	UpdateSeat(ctx context.Context, seat *entities.Seat) error
	DeleteSeat(ctx context.Context, id uuid.UUID) error
	GetSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) ([]*entities.Seat, error)
	BulkCreateSeats(ctx context.Context, seats []*entities.Seat) error
	DeleteSeatsByMapID(ctx context.Context, seatMapID uuid.UUID) error
}

// RouteStopRepository defines the interface for route stop data operations
type RouteStopRepository interface {
	Create(ctx context.Context, stop *entities.RouteStop) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.RouteStop, error)
	GetByRouteID(ctx context.Context, routeID uuid.UUID) ([]*entities.RouteStop, error)
	GetByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) ([]*entities.RouteStop, error)
	Update(ctx context.Context, stop *entities.RouteStop) error
	Delete(ctx context.Context, id uuid.UUID) error
	ReorderStops(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) error
	CountByRouteIDAndType(ctx context.Context, routeID uuid.UUID, stopType entities.RouteStopType) (int64, error)
}

// BookingRepository defines the interface for booking data operations
type BookingRepository interface {
	Create(ctx context.Context, booking *entities.Booking) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Booking, error)
	GetByReference(ctx context.Context, reference string) (*entities.Booking, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*entities.Booking, int64, error)
	GetByGuestContact(ctx context.Context, email, phone string) ([]*entities.Booking, error)
	GetByTripID(ctx context.Context, tripID uuid.UUID) ([]*entities.Booking, error)
	Update(ctx context.Context, booking *entities.Booking) error
	Delete(ctx context.Context, id uuid.UUID) error
	ExpirePendingBookings(ctx context.Context) error
	GetWithDetails(ctx context.Context, id uuid.UUID) (*entities.Booking, error)
	// GetByStatus retrieves bookings by their status (e.g., confirmed, pending)
	// Used by background jobs for trip reminders and analytics
	GetByStatus(ctx context.Context, status entities.BookingStatus) ([]*entities.Booking, error)
	// GetByDateRange retrieves bookings within a time range
	// Used for analytics and reporting
	GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*entities.Booking, error)
}

// PassengerRepository defines the interface for passenger data operations
type PassengerRepository interface {
	Create(ctx context.Context, passenger *entities.Passenger) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Passenger, error)
	GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Passenger, error)
	BulkCreate(ctx context.Context, passengers []*entities.Passenger) error
	Update(ctx context.Context, passenger *entities.Passenger) error
	Delete(ctx context.Context, id uuid.UUID) error
}

// SeatReservationRepository defines the interface for seat reservation data operations
type SeatReservationRepository interface {
	Create(ctx context.Context, reservation *entities.SeatReservation) error
	GetByTripAndSeat(ctx context.Context, tripID, seatID uuid.UUID) (*entities.SeatReservation, error)
	GetBySessionID(ctx context.Context, sessionID string) ([]*entities.SeatReservation, error)
	GetByTripID(ctx context.Context, tripID uuid.UUID) ([]*entities.SeatReservation, error)
	DeleteExpired(ctx context.Context) error
	DeleteBySessionID(ctx context.Context, sessionID string) error
	Delete(ctx context.Context, id uuid.UUID) error
	IsSeatsAvailable(ctx context.Context, tripID uuid.UUID, seatIDs []uuid.UUID) (bool, error)
}

// TicketRepository defines the interface for ticket data operations
type TicketRepository interface {
	Create(ctx context.Context, ticket *entities.Ticket) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Ticket, error)
	GetByTicketNumber(ctx context.Context, ticketNumber string) (*entities.Ticket, error)
	GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Ticket, error)
	BulkCreate(ctx context.Context, tickets []*entities.Ticket) error
	Update(ctx context.Context, ticket *entities.Ticket) error
	MarkAsUsed(ctx context.Context, ticketNumber string) error
}

// PaymentRepository defines the interface for payment data operations
type PaymentRepository interface {
	Create(ctx context.Context, payment *entities.Payment) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Payment, error)
	GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Payment, error)
	GetByExternalID(ctx context.Context, externalID string) (*entities.Payment, error)
	GetByOrderCode(ctx context.Context, orderCode string) (*entities.Payment, error)
	Update(ctx context.Context, payment *entities.Payment) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetPendingPayments(ctx context.Context) ([]*entities.Payment, error)
	GetExpiredPayments(ctx context.Context) ([]*entities.Payment, error)
}

// PaymentWebhookLogRepository defines the interface for payment webhook log operations
type PaymentWebhookLogRepository interface {
	Create(ctx context.Context, log *entities.PaymentWebhookLog) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.PaymentWebhookLog, error)
	GetByPaymentID(ctx context.Context, paymentID uuid.UUID) ([]*entities.PaymentWebhookLog, error)
	GetByExternalPaymentID(ctx context.Context, externalID string) ([]*entities.PaymentWebhookLog, error)
	Update(ctx context.Context, log *entities.PaymentWebhookLog) error
	GetPendingLogs(ctx context.Context) ([]*entities.PaymentWebhookLog, error)
}

// NotificationRepository defines the interface for notification data operations
type NotificationRepository interface {
	Create(ctx context.Context, notification *entities.Notification) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.Notification, error)
	GetByUserID(ctx context.Context, userID uuid.UUID, limit int) ([]*entities.Notification, error)
	GetByBookingID(ctx context.Context, bookingID uuid.UUID) ([]*entities.Notification, error)
	Update(ctx context.Context, notification *entities.Notification) error
	Delete(ctx context.Context, id uuid.UUID) error
	GetPending(ctx context.Context, limit int) ([]*entities.Notification, error)
	GetScheduled(ctx context.Context, beforeTime time.Time, limit int) ([]*entities.Notification, error)
	DeleteOlderThan(ctx context.Context, cutoffTime time.Time) error
	MarkAsSent(ctx context.Context, id uuid.UUID) error
	MarkAsFailed(ctx context.Context, id uuid.UUID, errorMsg string) error
}

// NotificationPreferenceRepository defines the interface for notification preference operations
type NotificationPreferenceRepository interface {
	Create(ctx context.Context, pref *entities.NotificationPreference) error
	GetByID(ctx context.Context, id uuid.UUID) (*entities.NotificationPreference, error)
	GetByUserID(ctx context.Context, userID uuid.UUID) (*entities.NotificationPreference, error)
	Update(ctx context.Context, pref *entities.NotificationPreference) error
	Delete(ctx context.Context, id uuid.UUID) error
	CreateDefault(ctx context.Context, userID uuid.UUID) (*entities.NotificationPreference, error)
}

// BookingAnalyticsRepository defines the interface for booking analytics operations
type BookingAnalyticsRepository interface {
	Create(ctx context.Context, analytics *entities.BookingAnalytics) error
	GetByDate(ctx context.Context, date time.Time) (*entities.BookingAnalytics, error)
	GetByDateRange(ctx context.Context, startDate, endDate time.Time) ([]*entities.BookingAnalytics, error)
	Update(ctx context.Context, analytics *entities.BookingAnalytics) error
	CreateOrUpdate(ctx context.Context, analytics *entities.BookingAnalytics) error
}

// RouteAnalyticsRepository defines the interface for route analytics operations
type RouteAnalyticsRepository interface {
	Create(ctx context.Context, analytics *entities.RouteAnalytics) error
	GetByRouteAndDate(ctx context.Context, routeID uuid.UUID, date time.Time) (*entities.RouteAnalytics, error)
	GetByRouteIDAndDateRange(ctx context.Context, routeID uuid.UUID, startDate, endDate time.Time) ([]*entities.RouteAnalytics, error)
	GetTopRoutesByRevenue(ctx context.Context, startDate, endDate time.Time, limit int) ([]*entities.RouteAnalytics, error)
	GetTopRoutesByBookings(ctx context.Context, startDate, endDate time.Time, limit int) ([]*entities.RouteAnalytics, error)
	Update(ctx context.Context, analytics *entities.RouteAnalytics) error
	CreateOrUpdate(ctx context.Context, analytics *entities.RouteAnalytics) error
}
