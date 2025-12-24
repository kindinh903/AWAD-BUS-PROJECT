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
	bookingRepo     repositories.BookingRepository
	passengerRepo   repositories.PassengerRepository
	reservationRepo repositories.SeatReservationRepository
	ticketRepo      repositories.TicketRepository
	tripRepo        repositories.TripRepository
	seatMapRepo     repositories.SeatMapRepository
	ticketService   *services.TicketService
	emailService    *services.EmailService
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
	TripID       uuid.UUID        `json:"trip_id"`
	UserID       *uuid.UUID       `json:"user_id,omitempty"`
	ContactEmail string           `json:"contact_email"`
	ContactPhone string           `json:"contact_phone"`
	ContactName  string           `json:"contact_name"`
	Passengers   []PassengerInput `json:"passengers"`
	SessionID    string           `json:"session_id"` // For seat reservation
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
	Booking    *entities.Booking     `json:"booking"`
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

// SeatWithStatus represents a seat with its booking status
type SeatWithStatus struct {
	*entities.Seat
	Status           string  `json:"status"` // available, booked, reserved, unavailable
	BookingReference *string `json:"booking_reference,omitempty"`
	PassengerName    *string `json:"passenger_name,omitempty"`
}

// GetSeatsWithStatus gets all seats for a trip with their booking status
func (uc *BookingUsecase) GetSeatsWithStatus(ctx context.Context, tripID uuid.UUID) ([]*SeatWithStatus, error) {
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

	// Get booked seats with booking info
	bookings, err := uc.bookingRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	bookedSeatsInfo := make(map[uuid.UUID]struct {
		BookingRef    string
		PassengerName string
	})

	for _, booking := range bookings {
		// Only include confirmed or pending bookings
		if booking.Status == "cancelled" {
			continue
		}

		passengers, _ := uc.passengerRepo.GetByBookingID(ctx, booking.ID)
		for _, p := range passengers {
			bookedSeatsInfo[p.SeatID] = struct {
				BookingRef    string
				PassengerName string
			}{
				BookingRef:    booking.BookingReference,
				PassengerName: p.FullName,
			}
		}
	}

	// Get reserved seats
	reservations, err := uc.reservationRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get reservations: %w", err)
	}

	reservedSeatIDs := make(map[uuid.UUID]bool)
	for _, r := range reservations {
		if !r.IsExpired() {
			reservedSeatIDs[r.SeatID] = true
		}
	}

	// Build seats with status
	seatsWithStatus := make([]*SeatWithStatus, 0, len(seatMap.Seats))
	for _, seat := range seatMap.Seats {
		seatStatus := &SeatWithStatus{
			Seat: seat,
		}

		// Determine status
		if !seat.IsBookable || seat.SeatType == entities.SeatTypeAisle {
			seatStatus.Status = "unavailable"
		} else if bookingInfo, isBooked := bookedSeatsInfo[seat.ID]; isBooked {
			seatStatus.Status = "booked"
			seatStatus.BookingReference = &bookingInfo.BookingRef
			seatStatus.PassengerName = &bookingInfo.PassengerName
		} else if reservedSeatIDs[seat.ID] {
			seatStatus.Status = "reserved"
		} else {
			seatStatus.Status = "available"
		}

		seatsWithStatus = append(seatsWithStatus, seatStatus)
	}

	return seatsWithStatus, nil
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

// UpdatePassengerInfoInput represents data for updating passenger information
type UpdatePassengerInfoInput struct {
	FullName     *string `json:"full_name,omitempty"`
	IDNumber     *string `json:"id_number,omitempty"`
	Phone        *string `json:"phone,omitempty"`
	Email        *string `json:"email,omitempty"`
	Age          *int    `json:"age,omitempty"`
	Gender       *string `json:"gender,omitempty"`
	SpecialNeeds *string `json:"special_needs,omitempty"`
}

// UpdatePassengerInfo updates passenger information
// Only allowed for confirmed bookings before trip departure
func (uc *BookingUsecase) UpdatePassengerInfo(ctx context.Context, bookingID, passengerID uuid.UUID, input UpdatePassengerInfoInput) error {
	// Get booking to verify status and ownership
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	// Only confirmed bookings can be modified
	if booking.Status != entities.BookingStatusConfirmed {
		return errors.New("can only update passenger info for confirmed bookings")
	}

	// Get trip to check departure time
	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		return fmt.Errorf("trip not found: %w", err)
	}

	// Cannot modify after trip departure
	if time.Now().After(trip.StartTime) {
		return errors.New("cannot update passenger info after trip departure")
	}

	// Get passenger
	passenger, err := uc.passengerRepo.GetByID(ctx, passengerID)
	if err != nil {
		return fmt.Errorf("passenger not found: %w", err)
	}

	// Verify passenger belongs to this booking
	if passenger.BookingID != bookingID {
		return errors.New("passenger does not belong to this booking")
	}

	// Update fields if provided
	if input.FullName != nil {
		passenger.FullName = *input.FullName
	}
	if input.IDNumber != nil {
		passenger.IDNumber = input.IDNumber
	}
	if input.Phone != nil {
		passenger.Phone = input.Phone
	}
	if input.Email != nil {
		passenger.Email = input.Email
	}
	if input.Age != nil {
		passenger.Age = input.Age
	}
	if input.Gender != nil {
		passenger.Gender = input.Gender
	}
	if input.SpecialNeeds != nil {
		passenger.SpecialNeeds = input.SpecialNeeds
	}

	// Save updated passenger
	if err := uc.passengerRepo.Update(ctx, passenger); err != nil {
		return fmt.Errorf("failed to update passenger: %w", err)
	}

	// Update ticket with new passenger name
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, bookingID)
	if err == nil && len(tickets) > 0 {
		// Find ticket for this passenger
		for _, ticket := range tickets {
			if ticket.PassengerID == passengerID {
				ticket.PassengerName = passenger.FullName
				_ = uc.ticketRepo.Update(ctx, ticket)
				break
			}
		}
	}

	return nil
}

// ChangeSeatInput represents data for changing a passenger's seat
type ChangeSeatInput struct {
	NewSeatID uuid.UUID `json:"new_seat_id"`
}

// ChangeSeat changes a passenger's assigned seat
// Only allowed for confirmed bookings before trip departure
// Verifies new seat availability and adjusts pricing if different seat type
func (uc *BookingUsecase) ChangeSeat(ctx context.Context, bookingID, passengerID uuid.UUID, input ChangeSeatInput) error {
	// Get booking
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return fmt.Errorf("booking not found: %w", err)
	}

	// Only confirmed bookings can have seats changed
	if booking.Status != entities.BookingStatusConfirmed {
		return errors.New("can only change seats for confirmed bookings")
	}

	// Get trip
	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		return fmt.Errorf("trip not found: %w", err)
	}

	// Cannot change seats within 24 hours of departure
	if time.Until(trip.StartTime) < 24*time.Hour {
		return errors.New("cannot change seats within 24 hours of trip departure")
	}

	// Get passenger
	passenger, err := uc.passengerRepo.GetByID(ctx, passengerID)
	if err != nil {
		return fmt.Errorf("passenger not found: %w", err)
	}

	// Verify passenger belongs to this booking
	if passenger.BookingID != bookingID {
		return errors.New("passenger does not belong to this booking")
	}

	// Cannot change to same seat
	if passenger.SeatID == input.NewSeatID {
		return errors.New("new seat is the same as current seat")
	}

	// Get seat map and verify new seat exists
	if trip.Bus == nil || trip.Bus.SeatMapID == nil {
		return errors.New("bus or seat map not assigned to trip")
	}

	seatMap, err := uc.seatMapRepo.GetWithSeats(ctx, *trip.Bus.SeatMapID)
	if err != nil {
		return fmt.Errorf("failed to get seat map: %w", err)
	}

	var newSeat *entities.Seat
	for _, seat := range seatMap.Seats {
		if seat.ID == input.NewSeatID {
			newSeat = seat
			break
		}
	}

	if newSeat == nil {
		return errors.New("new seat not found")
	}

	if !newSeat.IsBookable {
		return errors.New("new seat is not bookable")
	}

	// Check if new seat is available
	available, err := uc.reservationRepo.IsSeatsAvailable(ctx, booking.TripID, []uuid.UUID{input.NewSeatID})
	if err != nil {
		return fmt.Errorf("failed to check seat availability: %w", err)
	}

	if !available {
		// Check if the seat is occupied by another passenger in same booking
		passengers, err := uc.passengerRepo.GetByBookingID(ctx, bookingID)
		if err != nil {
			return fmt.Errorf("failed to get passengers: %w", err)
		}

		seatInSameBooking := false
		for _, p := range passengers {
			if p.SeatID == input.NewSeatID && p.ID != passengerID {
				seatInSameBooking = true
				break
			}
		}

		if !seatInSameBooking {
			return errors.New("new seat is not available")
		}
	}

	// Calculate price difference
	oldPrice := passenger.SeatPrice
	newPrice := trip.Price * newSeat.PriceMultiplier
	priceDifference := newPrice - oldPrice

	// Update passenger seat information
	passenger.SeatID = input.NewSeatID
	passenger.SeatNumber = newSeat.SeatNumber
	passenger.SeatType = newSeat.SeatType
	passenger.SeatPrice = newPrice

	if err := uc.passengerRepo.Update(ctx, passenger); err != nil {
		return fmt.Errorf("failed to update passenger: %w", err)
	}

	// Update booking total amount
	booking.TotalAmount += priceDifference
	if err := uc.bookingRepo.Update(ctx, booking); err != nil {
		return fmt.Errorf("failed to update booking amount: %w", err)
	}

	// Update ticket
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, bookingID)
	if err == nil && len(tickets) > 0 {
		// Find ticket for this passenger
		for _, ticket := range tickets {
			if ticket.PassengerID == passengerID {
				ticket.SeatNumber = newSeat.SeatNumber

				// Regenerate QR code with new seat info
				if qrCode, err := uc.ticketService.GenerateQRCode(ticket); err == nil {
					ticket.QRCode = &qrCode
				}

				_ = uc.ticketRepo.Update(ctx, ticket)
				break
			}
		}
	} // Send notification about seat change and price adjustment
	// TODO: Integrate with notification service when available
	if priceDifference != 0 {
		// If price increased, may need to process additional payment
		// If price decreased, may need to process partial refund
		// For now, just log this
		fmt.Printf("Seat change for booking %s: price difference = %.2f\n", booking.BookingReference, priceDifference)
	}

	return nil
}

// AddPassengerToBooking adds a new passenger to an existing booking
// Only allowed if trip has available seats and before departure
func (uc *BookingUsecase) AddPassengerToBooking(ctx context.Context, bookingID uuid.UUID, input PassengerInput) (*entities.Passenger, *entities.Ticket, error) {
	// Get booking
	booking, err := uc.bookingRepo.GetByID(ctx, bookingID)
	if err != nil {
		return nil, nil, fmt.Errorf("booking not found: %w", err)
	}

	// Only confirmed bookings can add passengers
	if booking.Status != entities.BookingStatusConfirmed {
		return nil, nil, errors.New("can only add passengers to confirmed bookings")
	}

	// Get trip
	trip, err := uc.tripRepo.GetByID(ctx, booking.TripID)
	if err != nil {
		return nil, nil, fmt.Errorf("trip not found: %w", err)
	}

	// Cannot add passengers within 24 hours of departure
	if time.Until(trip.StartTime) < 24*time.Hour {
		return nil, nil, errors.New("cannot add passengers within 24 hours of trip departure")
	}

	// Get seat map
	if trip.Bus == nil || trip.Bus.SeatMapID == nil {
		return nil, nil, errors.New("bus or seat map not assigned to trip")
	}

	seatMap, err := uc.seatMapRepo.GetWithSeats(ctx, *trip.Bus.SeatMapID)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to get seat map: %w", err)
	}

	// Find requested seat
	var seat *entities.Seat
	for _, s := range seatMap.Seats {
		if s.ID == input.SeatID {
			seat = s
			break
		}
	}

	if seat == nil {
		return nil, nil, errors.New("seat not found")
	}

	if !seat.IsBookable {
		return nil, nil, errors.New("seat is not bookable")
	}

	// Check seat availability
	available, err := uc.reservationRepo.IsSeatsAvailable(ctx, booking.TripID, []uuid.UUID{input.SeatID})
	if err != nil {
		return nil, nil, fmt.Errorf("failed to check seat availability: %w", err)
	}

	if !available {
		return nil, nil, errors.New("seat is not available")
	}

	// Create new passenger
	passenger := &entities.Passenger{
		BookingID:    booking.ID,
		SeatID:       input.SeatID,
		SeatNumber:   seat.SeatNumber,
		FullName:     input.FullName,
		IDNumber:     input.IDNumber,
		Phone:        input.Phone,
		Email:        input.Email,
		Age:          input.Age,
		Gender:       input.Gender,
		SeatType:     seat.SeatType,
		SeatPrice:    trip.Price * seat.PriceMultiplier,
		SpecialNeeds: input.SpecialNeeds,
	}

	if err := uc.passengerRepo.Create(ctx, passenger); err != nil {
		return nil, nil, fmt.Errorf("failed to create passenger: %w", err)
	}

	// Create ticket
	existingPassengers, _ := uc.passengerRepo.GetByBookingID(ctx, bookingID)
	ticketNumber := generateTicketNumber(booking.BookingReference, len(existingPassengers))

	ticket := &entities.Ticket{
		TicketNumber:  ticketNumber,
		BookingID:     booking.ID,
		PassengerID:   passenger.ID,
		TripID:        trip.ID,
		SeatNumber:    passenger.SeatNumber,
		PassengerName: passenger.FullName,
	}

	// Generate QR code
	if qrCode, err := uc.ticketService.GenerateQRCode(ticket); err == nil {
		ticket.QRCode = &qrCode
	}

	// Generate barcode
	barcode := uc.ticketService.GenerateBarcode(ticketNumber)
	ticket.Barcode = &barcode

	if err := uc.ticketRepo.Create(ctx, ticket); err != nil {
		return nil, nil, fmt.Errorf("failed to create ticket: %w", err)
	}

	// Update booking totals
	booking.TotalSeats += 1
	booking.TotalAmount += passenger.SeatPrice

	if err := uc.bookingRepo.Update(ctx, booking); err != nil {
		return nil, nil, fmt.Errorf("failed to update booking: %w", err)
	}

	// Send ticket email for new passenger
	// TODO: Integrate with notification service

	return passenger, ticket, nil
}

// TripPassengerInfo represents a passenger with their ticket and check-in status
type TripPassengerInfo struct {
	PassengerID      uuid.UUID  `json:"passenger_id"`
	BookingID        uuid.UUID  `json:"booking_id"`
	BookingReference string     `json:"booking_reference"`
	FullName         string     `json:"full_name"`
	SeatNumber       string     `json:"seat_number"`
	SeatType         string     `json:"seat_type"`
	Phone            *string    `json:"phone,omitempty"`
	Email            *string    `json:"email,omitempty"`
	TicketID         uuid.UUID  `json:"ticket_id"`
	TicketNumber     string     `json:"ticket_number"`
	CheckedIn        bool       `json:"checked_in"`
	CheckedInAt      *time.Time `json:"checked_in_at,omitempty"`
	ContactName      string     `json:"contact_name"`
	ContactEmail     string     `json:"contact_email"`
	ContactPhone     string     `json:"contact_phone"`
}

// GetTripPassengers retrieves all passengers for a specific trip with their check-in status
func (uc *BookingUsecase) GetTripPassengers(ctx context.Context, tripID uuid.UUID) ([]*TripPassengerInfo, error) {
	// Get all confirmed bookings for this trip
	bookings, err := uc.bookingRepo.GetByTripID(ctx, tripID)
	if err != nil {
		return nil, fmt.Errorf("failed to get bookings: %w", err)
	}

	var passengerInfos []*TripPassengerInfo

	for _, booking := range bookings {
		// Only include confirmed bookings
		if booking.Status != entities.BookingStatusConfirmed {
			continue
		}

		// Get passengers for this booking
		passengers, err := uc.passengerRepo.GetByBookingID(ctx, booking.ID)
		if err != nil {
			continue
		}

		// Get tickets for this booking
		tickets, err := uc.ticketRepo.GetByBookingID(ctx, booking.ID)
		if err != nil {
			continue
		}

		// Create a map of passenger ID to ticket
		ticketMap := make(map[uuid.UUID]*entities.Ticket)
		for _, ticket := range tickets {
			ticketMap[ticket.PassengerID] = ticket
		}

		// Build passenger info list
		for _, passenger := range passengers {
			ticket := ticketMap[passenger.ID]
			if ticket == nil {
				continue
			}

			info := &TripPassengerInfo{
				PassengerID:      passenger.ID,
				BookingID:        booking.ID,
				BookingReference: booking.BookingReference,
				FullName:         passenger.FullName,
				SeatNumber:       passenger.SeatNumber,
				SeatType:         string(passenger.SeatType),
				Phone:            passenger.Phone,
				Email:            passenger.Email,
				TicketID:         ticket.ID,
				TicketNumber:     ticket.TicketNumber,
				CheckedIn:        ticket.IsUsed,
				CheckedInAt:      ticket.UsedAt,
				ContactName:      booking.ContactName,
				ContactEmail:     booking.ContactEmail,
				ContactPhone:     booking.ContactPhone,
			}
			passengerInfos = append(passengerInfos, info)
		}
	}

	return passengerInfos, nil
}

// CheckInPassenger marks a passenger as checked in by marking their ticket as used
func (uc *BookingUsecase) CheckInPassenger(ctx context.Context, tripID, passengerID uuid.UUID) error {
	// Get the ticket for this passenger and trip
	tickets, err := uc.ticketRepo.GetByBookingID(ctx, uuid.Nil)
	if err != nil {
		// Need to find ticket by passenger ID directly
		// Get all bookings for the trip first
		bookings, err := uc.bookingRepo.GetByTripID(ctx, tripID)
		if err != nil {
			return fmt.Errorf("failed to get bookings: %w", err)
		}

		for _, booking := range bookings {
			tickets, err := uc.ticketRepo.GetByBookingID(ctx, booking.ID)
			if err != nil {
				continue
			}
			for _, ticket := range tickets {
				if ticket.PassengerID == passengerID {
					if ticket.IsUsed {
						return errors.New("passenger already checked in")
					}
					return uc.ticketRepo.MarkAsUsed(ctx, ticket.TicketNumber)
				}
			}
		}
		return errors.New("ticket not found for passenger")
	}

	for _, ticket := range tickets {
		if ticket.PassengerID == passengerID && ticket.TripID == tripID {
			if ticket.IsUsed {
				return errors.New("passenger already checked in")
			}
			return uc.ticketRepo.MarkAsUsed(ctx, ticket.TicketNumber)
		}
	}

	return errors.New("ticket not found for passenger")
}
