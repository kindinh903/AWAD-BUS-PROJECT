package usecases

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/repositories"
	"github.com/yourusername/bus-booking-auth/internal/services"
)

type BookingUsecase struct {
	bookingRepo      repositories.BookingRepository
	passengerRepo    repositories.PassengerRepository
	reservationRepo  repositories.SeatReservationRepository
	ticketRepo       repositories.TicketRepository
	tripRepo         repositories.TripRepository
	seatMapRepo      repositories.SeatMapRepository
	ticketService    *services.TicketService
	emailService     *services.EmailService
}

func NewBookingUsecase(
	bookingRepo repositories.BookingRepository,
	passengerRepo repositories.PassengerRepository,
	reservationRepo repositories.SeatReservationRepository,
	ticketRepo repositories.TicketRepository,
	tripRepo repositories.TripRepository,
	seatMapRepo repositories.SeatMapRepository,
) *BookingUsecase {
	return &BookingUsecase{
		bookingRepo:     bookingRepo,
		passengerRepo:   passengerRepo,
		reservationRepo: reservationRepo,
		ticketRepo:      ticketRepo,
		tripRepo:        tripRepo,
		seatMapRepo:     seatMapRepo,
		ticketService:   services.NewTicketService(),
		emailService:    services.NewEmailService(),
	}
}

type CreateBookingInput struct {
	TripID       uuid.UUID          `json:"trip_id"`
	UserID       *uuid.UUID         `json:"user_id,omitempty"`
	ContactEmail string             `json:"contact_email"`
	ContactPhone string             `json:"contact_phone"`
	ContactName  string             `json:"contact_name"`
	Passengers   []PassengerInput   `json:"passengers"`
	SessionID    string             `json:"session_id"` // For seat reservation
}

type PassengerInput struct {
	SeatID       uuid.UUID `json:"seat_id"`
	FullName     string    `json:"full_name"`
	IDNumber     *string   `json:"id_number,omitempty"`
	Phone        *string   `json:"phone,omitempty"`
	Email        *string   `json:"email,omitempty"`
	Age          *int      `json:"age,omitempty"`
	Gender       *string   `json:"gender,omitempty"`
	SpecialNeeds *string   `json:"special_needs,omitempty"`
}

type ReserveSeatInput struct {
	TripID    uuid.UUID   `json:"trip_id"`
	SeatIDs   []uuid.UUID `json:"seat_ids"`
	SessionID string      `json:"session_id"`
}

type BookingResponse struct {
	Booking    *entities.Booking    `json:"booking"`
	Passengers []*entities.Passenger `json:"passengers"`
	Tickets    []*entities.Ticket    `json:"tickets"`
}

// ReserveSeats temporarily locks seats for checkout
func (uc *BookingUsecase) ReserveSeats(ctx context.Context, input ReserveSeatInput) error {
	// Check if seats are available
	available, err := uc.reservationRepo.IsSeatsAvailable(ctx, input.TripID, input.SeatIDs)
	if err != nil {
		return fmt.Errorf("failed to check seat availability: %w", err)
	}
	if !available {
		return errors.New("one or more seats are not available")
	}

	// Create reservations (expires in 10 minutes)
	expiresAt := time.Now().Add(10 * time.Minute)
	for _, seatID := range input.SeatIDs {
		reservation := &entities.SeatReservation{
			TripID:    input.TripID,
			SeatID:    seatID,
			SessionID: input.SessionID,
			ExpiresAt: expiresAt,
		}
		if err := uc.reservationRepo.Create(ctx, reservation); err != nil {
			return fmt.Errorf("failed to create reservation: %w", err)
		}
	}

	return nil
}

// ReleaseSeats releases temporary seat locks
func (uc *BookingUsecase) ReleaseSeats(ctx context.Context, sessionID string) error {
	return uc.reservationRepo.DeleteBySessionID(ctx, sessionID)
}

// CreateBooking creates a new booking with passengers and tickets
func (uc *BookingUsecase) CreateBooking(ctx context.Context, input CreateBookingInput) (*BookingResponse, error) {
	// Validate input
	if len(input.Passengers) == 0 {
		return nil, errors.New("at least one passenger is required")
	}

	// Get trip details
	trip, err := uc.tripRepo.GetByID(ctx, input.TripID)
	if err != nil {
		return nil, fmt.Errorf("trip not found: %w", err)
	}

	// Get seat map with seats
	if trip.Bus == nil || trip.Bus.SeatMapID == nil {
		return nil, errors.New("bus or seat map not assigned to trip")
	}

	seatMap, err := uc.seatMapRepo.GetWithSeats(ctx, *trip.Bus.SeatMapID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seat map: %w", err)
	}

	// Create seat lookup map
	seatLookup := make(map[uuid.UUID]*entities.Seat)
	for _, seat := range seatMap.Seats {
		seatLookup[seat.ID] = seat
	}

	// Calculate total amount and validate seats
	var totalAmount float64
	seatIDs := make([]uuid.UUID, len(input.Passengers))
	for i, p := range input.Passengers {
		seat, exists := seatLookup[p.SeatID]
		if !exists {
			return nil, fmt.Errorf("invalid seat ID: %s", p.SeatID)
		}
		if !seat.IsBookable {
			return nil, fmt.Errorf("seat %s is not bookable", seat.SeatNumber)
		}
		totalAmount += trip.Price * seat.PriceMultiplier
		seatIDs[i] = p.SeatID
	}

	// Verify seats are still available
	available, err := uc.reservationRepo.IsSeatsAvailable(ctx, input.TripID, seatIDs)
	if err != nil {
		return nil, fmt.Errorf("failed to check seat availability: %w", err)
	}
	if !available {
		return nil, errors.New("one or more seats are no longer available")
	}

	// Generate booking reference
	bookingRef := generateBookingReference()

	// Create booking
	expiresAt := time.Now().Add(30 * time.Minute) // 30 min to complete payment
	booking := &entities.Booking{
		BookingReference: bookingRef,
		TripID:           input.TripID,
		UserID:           input.UserID,
		ContactEmail:     input.ContactEmail,
		ContactPhone:     input.ContactPhone,
		ContactName:      input.ContactName,
		TotalSeats:       len(input.Passengers),
		TotalAmount:      totalAmount,
		Status:           entities.BookingStatusPending,
		PaymentStatus:    entities.PaymentStatusPending,
		IsGuestBooking:   input.UserID == nil,
		ExpiresAt:        &expiresAt,
	}

	if err := uc.bookingRepo.Create(ctx, booking); err != nil {
		return nil, fmt.Errorf("failed to create booking: %w", err)
	}

	// Create passengers
	passengers := make([]*entities.Passenger, len(input.Passengers))
	for i, p := range input.Passengers {
		seat := seatLookup[p.SeatID]
		passengers[i] = &entities.Passenger{
			BookingID:    booking.ID,
			SeatID:       p.SeatID,
			SeatNumber:   seat.SeatNumber,
			FullName:     p.FullName,
			IDNumber:     p.IDNumber,
			Phone:        p.Phone,
			Email:        p.Email,
			Age:          p.Age,
			Gender:       p.Gender,
			SeatType:     seat.SeatType,
			SeatPrice:    trip.Price * seat.PriceMultiplier,
			SpecialNeeds: p.SpecialNeeds,
		}
	}

	if err := uc.passengerRepo.BulkCreate(ctx, passengers); err != nil {
		return nil, fmt.Errorf("failed to create passengers: %w", err)
	}

	// Create tickets with QR codes
	tickets := make([]*entities.Ticket, len(passengers))
	for i, passenger := range passengers {
		ticketNumber := generateTicketNumber(booking.BookingReference, i+1)
		
		ticket := &entities.Ticket{
			TicketNumber:  ticketNumber,
			BookingID:     booking.ID,
			PassengerID:   passenger.ID,
			TripID:        input.TripID,
			SeatNumber:    passenger.SeatNumber,
			PassengerName: passenger.FullName,
		}
		
		// Generate QR code for ticket
		if qrCode, err := uc.ticketService.GenerateQRCode(ticket); err == nil {
			ticket.QRCode = &qrCode
		}
		
		// Generate barcode
		barcode := uc.ticketService.GenerateBarcode(ticketNumber)
		ticket.Barcode = &barcode
		
		tickets[i] = ticket
	}

	if err := uc.ticketRepo.BulkCreate(ctx, tickets); err != nil {
		return nil, fmt.Errorf("failed to create tickets: %w", err)
	}

	// Release temporary seat reservations
	if input.SessionID != "" {
		_ = uc.reservationRepo.DeleteBySessionID(ctx, input.SessionID)
	}

	return &BookingResponse{
		Booking:    booking,
		Passengers: passengers,
		Tickets:    tickets,
	}, nil
}

// ConfirmBooking confirms a booking after payment
func (uc *BookingUsecase) ConfirmBooking(ctx context.Context, bookingID uuid.UUID, paymentMethod, paymentReference string) error {
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	if booking.Status != entities.BookingStatusPending {
		return errors.New("only pending bookings can be confirmed")
	}

	now := time.Now()
	booking.Status = entities.BookingStatusConfirmed
	booking.PaymentStatus = entities.PaymentStatusCompleted
	booking.PaymentMethod = &paymentMethod
	booking.PaymentReference = &paymentReference
	booking.ConfirmedAt = &now

	if err := uc.bookingRepo.Update(ctx, booking); err != nil {
		return err
	}

	// Send confirmation email with tickets
	go func() {
		// Use background context for async email sending
		bgCtx := context.Background()
		if err := uc.sendTicketEmails(bgCtx, bookingID); err != nil {
			fmt.Printf("Failed to send ticket emails for booking %s: %v\n", bookingID, err)
		}
	}()

	return nil
}

// CancelBooking cancels a booking
func (uc *BookingUsecase) CancelBooking(ctx context.Context, bookingID uuid.UUID, reason string) error {
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	if !booking.CanBeCancelled() {
		return errors.New("booking cannot be cancelled")
	}

	now := time.Now()
	booking.Status = entities.BookingStatusCancelled
	booking.CancelledAt = &now
	booking.CancellationReason = &reason

	return uc.bookingRepo.Update(ctx, booking)
}

// GetBookingByReference retrieves booking by reference with all details
func (uc *BookingUsecase) GetBookingByReference(ctx context.Context, reference string) (*BookingResponse, error) {
	booking, err := uc.bookingRepo.GetByReference(ctx, reference)
	if err != nil {
		return nil, fmt.Errorf("booking not found: %w", err)
	}

	// Get passengers
	passengers, err := uc.passengerRepo.GetByBookingID(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get passengers: %w", err)
	}

	// Get tickets
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, booking.ID)
	if err != nil {
		return nil, fmt.Errorf("failed to get tickets: %w", err)
	}

	return &BookingResponse{
		Booking:    booking,
		Passengers: passengers,
		Tickets:    tickets,
	}, nil
}

// GetUserBookings retrieves user's booking history
func (uc *BookingUsecase) GetUserBookings(ctx context.Context, userID uuid.UUID, page, pageSize int) ([]*entities.Booking, int64, error) {
	return uc.bookingRepo.GetByUserID(ctx, userID, page, pageSize)
}

// GetGuestBookings retrieves guest bookings by contact info
func (uc *BookingUsecase) GetGuestBookings(ctx context.Context, email, phone string) ([]*entities.Booking, error) {
	return uc.bookingRepo.GetByGuestContact(ctx, email, phone)
}

// GetAvailableSeats gets available seats for a trip
func (uc *BookingUsecase) GetAvailableSeats(ctx context.Context, tripID uuid.UUID) ([]*entities.Seat, error) {
	// Get trip
	trip, err := uc.tripRepo.GetByID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("trip not found: %w", err)
	}

	if trip.Bus == nil || trip.Bus.SeatMapID == nil {
		return nil, errors.New("bus or seat map not assigned to trip")
	}

	// Get seat map with all seats
	seatMap, err := uc.seatMapRepo.GetWithSeats(ctx, *trip.Bus.SeatMapID)
	if err != nil {
		return nil, fmt.Errorf("failed to get seat map: %w", err)
	}

	// Get booked seats
	bookings, err := uc.bookingRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	bookedSeatIDs := make(map[uuid.UUID]bool)
	for _, booking := range bookings {
		passengers, _ := uc.passengerRepo.GetByBookingID(ctx, booking.ID)
		for _, p := range passengers {
			bookedSeatIDs[p.SeatID] = true
		}
	}

	// Get reserved seats
	reservations, err := uc.reservationRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get reservations: %w", err)
	}

	for _, r := range reservations {
		if !r.IsExpired() {
			bookedSeatIDs[r.SeatID] = true
		}
	}

	// Filter available seats
	availableSeats := make([]*entities.Seat, 0)
	for _, seat := range seatMap.Seats {
		if seat.IsBookable && !bookedSeatIDs[seat.ID] {
			availableSeats = append(availableSeats, seat)
		}
	}

	return availableSeats, nil
}

// Helper functions
func generateBookingReference() string {
	now := time.Now()
	uuid := uuid.New().String()[:8]
	return fmt.Sprintf("BK%s%s", now.Format("20060102"), uuid)
}

func generateTicketNumber(bookingRef string, sequence int) string {
	return fmt.Sprintf("%s-T%02d", bookingRef, sequence)
}

// sendTicketEmails sends e-ticket emails to passengers
func (uc *BookingUsecase) sendTicketEmails(ctx context.Context, bookingID uuid.UUID) error {
	// Get booking with all details
	booking, err := uc.bookingRepo.GetWithDetails(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("failed to get booking: %w", err)
	}

	// Get trip details
	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		return fmt.Errorf("failed to get trip: %w", err)
	}

	// Get passengers
	passengers, err := uc.passengerRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("failed to get passengers: %w", err)
	}

	// Get tickets
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("failed to get tickets: %w", err)
	}

	// Send email for each ticket
	for i, ticket := range tickets {
		if i >= len(passengers) {
			break
		}
		passenger := passengers[i]

		// Generate PDF for this ticket
		pdfBytes, err := uc.ticketService.GenerateTicketPDF(ticket, booking, trip, passenger)
		if err != nil {
			fmt.Printf("Failed to generate PDF for ticket %s: %v\n", ticket.TicketNumber, err)
			continue
		}

		// Send email with PDF attachment
		if err := uc.emailService.SendTicketEmail(
			booking.ContactEmail,
			booking.ContactName,
			booking.BookingReference,
			ticket.TicketNumber,
			pdfBytes,
		); err != nil {
			fmt.Printf("Failed to send email for ticket %s: %v\n", ticket.TicketNumber, err)
		}
	}

	return nil
}

// GenerateTicketPDF generates a PDF for a single ticket
func (uc *BookingUsecase) GenerateTicketPDF(ctx context.Context, ticketID uuid.UUID) ([]byte, string, error) {
	ticket, err := uc.ticketRepo.GetByID(ctx, ticketID)
	if err != nil {
		return nil, "", fmt.Errorf("ticket not found: %w", err)
	}

	booking, err := uc.bookingRepo.GetByID(ctx, ticket.BookingID)
	if err != nil {
		return nil, "", fmt.Errorf("booking not found: %w", err)
	}

	trip, err := uc.tripRepo.GetByID(ctx, ticket.TripID)
	if err != nil {
		return nil, "", fmt.Errorf("trip not found: %w", err)
	}

	passenger, err := uc.passengerRepo.GetByID(ctx, ticket.PassengerID)
	if err != nil {
		return nil, "", fmt.Errorf("passenger not found: %w", err)
	}

	pdfBytes, err := uc.ticketService.GenerateTicketPDF(ticket, booking, trip, passenger)
	if err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("ticket-%s.pdf", ticket.TicketNumber)
	return pdfBytes, filename, nil
}

// GenerateBookingTicketsPDF generates a combined PDF for all tickets in a booking
func (uc *BookingUsecase) GenerateBookingTicketsPDF(ctx context.Context, bookingID uuid.UUID) ([]byte, string, error) {
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return nil, "", fmt.Errorf("booking not found: %w", err)
	}

	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		return nil, "", fmt.Errorf("trip not found: %w", err)
	}

	passengers, err := uc.passengerRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get passengers: %w", err)
	}

	tickets, err := uc.ticketRepo.GetByBookingID(ctx, bookingID)
	if err != nil {
		return nil, "", fmt.Errorf("failed to get tickets: %w", err)
	}

	if len(tickets) == 0 {
		return nil, "", errors.New("no tickets found for this booking")
	}

	// For simplicity, generate PDF for the first ticket
	// In production, you might want to combine multiple PDFs
	pdfBytes, err := uc.ticketService.GenerateTicketPDF(tickets[0], booking, trip, passengers[0])
	if err != nil {
		return nil, "", err
	}

	filename := fmt.Sprintf("booking-%s-tickets.pdf", booking.BookingReference)
	return pdfBytes, filename, nil
}

// ResendTicketEmails resends ticket emails for a booking
func (uc *BookingUsecase) ResendTicketEmails(ctx context.Context, bookingID uuid.UUID) error {
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	if booking.Status != entities.BookingStatusConfirmed {
		return errors.New("can only resend tickets for confirmed bookings")
	}

	return uc.sendTicketEmails(ctx, bookingID)
}
