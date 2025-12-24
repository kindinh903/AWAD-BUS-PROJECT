package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

type BookingHandler struct {
	bookingUsecase *usecases.BookingUsecase
}

func NewBookingHandler(bookingUsecase *usecases.BookingUsecase) *BookingHandler {
	return &BookingHandler{
		bookingUsecase: bookingUsecase,
	}
}

// DownloadTicket downloads a ticket PDF
// @Summary Download ticket
// @Description Download e-ticket PDF by ticket ID
// @Tags Booking
// @Accept json
// @Produce application/pdf
// @Param id path string true "Ticket ID"
// @Success 200 {file} application/pdf
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /tickets/{id}/download [get]
func (h *BookingHandler) DownloadTicket(c *gin.Context) {
	idStr := c.Param("id")
	ticketID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid ticket ID"})
		return
	}

	pdfBytes, filename, err := h.bookingUsecase.GenerateTicketPDF(c.Request.Context(), ticketID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// DownloadBookingTickets downloads all tickets for a booking
// @Summary Download all booking tickets
// @Description Download all e-tickets for a booking as a single PDF
// @Tags Booking
// @Accept json
// @Produce application/pdf
// @Param id path string true "Booking ID"
// @Success 200 {file} application/pdf
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /bookings/{id}/tickets/download [get]
func (h *BookingHandler) DownloadBookingTickets(c *gin.Context) {
	idStr := c.Param("id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	pdfBytes, filename, err := h.bookingUsecase.GenerateBookingTicketsPDF(c.Request.Context(), bookingID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.Header("Content-Type", "application/pdf")
	c.Header("Content-Disposition", "attachment; filename="+filename)
	c.Data(http.StatusOK, "application/pdf", pdfBytes)
}

// ResendTicketEmail resends ticket email
// @Summary Resend ticket email
// @Description Resend e-ticket to the booking contact email
// @Tags Booking
// @Accept json
// @Produce json
// @Param id path string true "Booking ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /bookings/{id}/resend-tickets [post]
func (h *BookingHandler) ResendTicketEmail(c *gin.Context) {
	idStr := c.Param("id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	if err := h.bookingUsecase.ResendTicketEmails(c.Request.Context(), bookingID); err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Tickets resent successfully",
	})
}

// ReserveSeats temporarily locks seats during checkout
// @Summary Reserve seats
// @Description Temporarily lock seats for a user session during checkout (10 min expiry)
// @Tags Booking
// @Accept json
// @Produce json
// @Param input body usecases.ReserveSeatInput true "Reservation details"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse "Seats not available"
// @Router /bookings/reserve [post]
func (h *BookingHandler) ReserveSeats(c *gin.Context) {
	var input usecases.ReserveSeatInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.bookingUsecase.ReserveSeats(c.Request.Context(), input); err != nil {
		c.JSON(http.StatusConflict, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Seats reserved successfully",
	})
}

// ReleaseSeats releases temporary seat locks
// @Summary Release seat reservations
// @Description Release temporary seat locks for a session
// @Tags Booking
// @Accept json
// @Produce json
// @Param session_id query string true "Session ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Router /bookings/release [delete]
func (h *BookingHandler) ReleaseSeats(c *gin.Context) {
	sessionID := c.Query("session_id")
	if sessionID == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "session_id is required"})
		return
	}

	if err := h.bookingUsecase.ReleaseSeats(c.Request.Context(), sessionID); err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Seats released successfully",
	})
}

// CreateBooking creates a new booking
// @Summary Create booking
// @Description Create a new booking with passenger details
// @Tags Booking
// @Accept json
// @Produce json
// @Param input body usecases.CreateBookingInput true "Booking details"
// @Success 201 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 409 {object} ErrorResponse "Seats not available"
// @Router /bookings [post]
func (h *BookingHandler) CreateBooking(c *gin.Context) {
	var input usecases.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	// Get user ID from context if authenticated
	if userID, exists := c.Get("user_id"); exists {
		if userIDStr, ok := userID.(string); ok {
			if uid, err := uuid.Parse(userIDStr); err == nil {
				input.UserID = &uid
			}
		}
	}

	result, err := h.bookingUsecase.CreateBooking(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusConflict, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Message: "Booking created successfully",
		Data:    result,
	})
}

// ConfirmBooking confirms a booking after payment
// @Summary Confirm booking
// @Description Confirm a booking after successful payment
// @Tags Booking
// @Accept json
// @Produce json
// @Param id path string true "Booking ID"
// @Param input body object true "Payment details"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /bookings/{id}/confirm [post]
func (h *BookingHandler) ConfirmBooking(c *gin.Context) {
	idStr := c.Param("id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	var input struct {
		PaymentMethod    string `json:"payment_method" binding:"required"`
		PaymentReference string `json:"payment_reference"`
	}

	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	if err := h.bookingUsecase.ConfirmBooking(c.Request.Context(), bookingID, input.PaymentMethod, input.PaymentReference); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Booking confirmed successfully",
	})
}

// CancelBooking cancels a booking
// @Summary Cancel booking
// @Description Cancel an existing booking
// @Tags Booking
// @Accept json
// @Produce json
// @Param id path string true "Booking ID"
// @Param input body object false "Cancellation details"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /bookings/{id}/cancel [post]
func (h *BookingHandler) CancelBooking(c *gin.Context) {
	idStr := c.Param("id")
	bookingID, err := uuid.Parse(idStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	var input struct {
		Reason string `json:"reason"`
	}
	_ = c.ShouldBindJSON(&input)

	if err := h.bookingUsecase.CancelBooking(c.Request.Context(), bookingID, input.Reason); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Booking cancelled successfully",
	})
}

// GetBookingByReference retrieves a booking by reference
// @Summary Get booking by reference
// @Description Get booking details by booking reference number
// @Tags Booking
// @Accept json
// @Produce json
// @Param reference path string true "Booking Reference"
// @Success 200 {object} SuccessResponse
// @Failure 404 {object} ErrorResponse
// @Router /bookings/ref/{reference} [get]
func (h *BookingHandler) GetBookingByReference(c *gin.Context) {
	reference := c.Param("reference")

	result, err := h.bookingUsecase.GetBookingByReference(c.Request.Context(), reference)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Booking retrieved successfully",
		Data:    result,
	})
}

// GetUserBookings retrieves user's booking history
// @Summary Get user bookings
// @Description Get authenticated user's booking history
// @Tags Booking
// @Accept json
// @Produce json
// @Param page query int false "Page number" default(1)
// @Param page_size query int false "Page size" default(10)
// @Success 200 {object} SuccessResponse
// @Failure 401 {object} ErrorResponse
// @Security BearerAuth
// @Router /bookings/my-bookings [get]
func (h *BookingHandler) GetUserBookings(c *gin.Context) {
	userIDStr, exists := c.Get("user_id")
	if !exists {
		c.JSON(http.StatusUnauthorized, ErrorResponse{Error: "Unauthorized"})
		return
	}

	userID, err := uuid.Parse(userIDStr.(string))
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid user ID"})
		return
	}

	page := 1
	pageSize := 10

	if pageStr := c.Query("page"); pageStr != "" {
		if p, err := strconv.Atoi(pageStr); err == nil && p > 0 {
			page = p
		}
	}

	if sizeStr := c.Query("page_size"); sizeStr != "" {
		if s, err := strconv.Atoi(sizeStr); err == nil && s > 0 && s <= 100 {
			pageSize = s
		}
	}

	bookings, total, err := h.bookingUsecase.GetUserBookings(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"data":        bookings,
		"total":       total,
		"page":        page,
		"page_size":   pageSize,
		"total_pages": (int(total) + pageSize - 1) / pageSize,
	})
}

// GetGuestBookings retrieves guest bookings
// @Summary Get guest bookings
// @Description Get bookings for guest users by email or phone
// @Tags Booking
// @Accept json
// @Produce json
// @Param email query string false "Email"
// @Param phone query string false "Phone"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Router /bookings/guest [get]
func (h *BookingHandler) GetGuestBookings(c *gin.Context) {
	email := c.Query("email")
	phone := c.Query("phone")

	if email == "" && phone == "" {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Email or phone is required"})
		return
	}

	bookings, err := h.bookingUsecase.GetGuestBookings(c.Request.Context(), email, phone)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Guest bookings retrieved successfully",
		Data:    bookings,
	})
}

// GetAvailableSeats gets available seats for a trip
// @Summary Get available seats
// @Description Get list of available seats for a specific trip
// @Tags Booking
// @Accept json
// @Produce json
// @Param id path string true "Trip ID"
// @Success 200 {object} SuccessResponse
// @Failure 400 {object} ErrorResponse
// @Failure 404 {object} ErrorResponse
// @Router /trips/{id}/seats [get]
func (h *BookingHandler) GetAvailableSeats(c *gin.Context) {
	tripIDStr := c.Param("id")
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trip ID"})
		return
	}

	seats, err := h.bookingUsecase.GetAvailableSeats(c.Request.Context(), tripID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Available seats retrieved successfully",
		Data:    seats,
	})
}

// GetSeatsWithStatus handles GET /api/v1/trips/:id/seats/status
// Returns all seats for a trip with their booking status (available, booked, reserved)
func (h *BookingHandler) GetSeatsWithStatus(c *gin.Context) {
	tripIDStr := c.Param("id")
	tripID, err := uuid.Parse(tripIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid trip ID"})
		return
	}

	seats, err := h.bookingUsecase.GetSeatsWithStatus(c.Request.Context(), tripID)
	if err != nil {
		c.JSON(http.StatusNotFound, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Seats with status retrieved successfully",
		Data:    seats,
	})
}

// UpdatePassengerInfo handles PUT /api/v1/bookings/:id/passengers/:passenger_id
// Updates passenger information for a booking
func (h *BookingHandler) UpdatePassengerInfo(c *gin.Context) {
	// Parse booking ID
	bookingIDStr := c.Param("id")
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	// Parse passenger ID
	passengerIDStr := c.Param("passenger_id")
	passengerID, err := uuid.Parse(passengerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid passenger ID"})
		return
	}

	// Parse request body
	var input usecases.UpdatePassengerInfoInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Update passenger info
	if err := h.bookingUsecase.UpdatePassengerInfo(c.Request.Context(), bookingID, passengerID, input); err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "can only update passenger info for confirmed bookings" ||
			err.Error() == "cannot update passenger info after trip departure" {
			statusCode = http.StatusBadRequest
		} else if err.Error() == "passenger not found" || err.Error() == "booking not found" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "passenger does not belong to this booking" {
			statusCode = http.StatusForbidden
		}

		c.JSON(statusCode, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Passenger information updated successfully",
	})
}

// ChangeSeat handles PUT /api/v1/bookings/:id/passengers/:passenger_id/seat
// Changes a passenger's seat assignment
func (h *BookingHandler) ChangeSeat(c *gin.Context) {
	// Parse booking ID
	bookingIDStr := c.Param("id")
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	// Parse passenger ID
	passengerIDStr := c.Param("passenger_id")
	passengerID, err := uuid.Parse(passengerIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid passenger ID"})
		return
	}

	// Parse request body
	var input usecases.ChangeSeatInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Change seat
	if err := h.bookingUsecase.ChangeSeat(c.Request.Context(), bookingID, passengerID, input); err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "can only change seats for confirmed bookings" ||
			err.Error() == "cannot change seats within 24 hours of trip departure" ||
			err.Error() == "new seat is the same as current seat" ||
			err.Error() == "new seat is not bookable" ||
			err.Error() == "new seat is not available" {
			statusCode = http.StatusBadRequest
		} else if err.Error() == "passenger not found" || err.Error() == "booking not found" || err.Error() == "new seat not found" {
			statusCode = http.StatusNotFound
		} else if err.Error() == "passenger does not belong to this booking" {
			statusCode = http.StatusForbidden
		}

		c.JSON(statusCode, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusOK, SuccessResponse{
		Message: "Seat changed successfully. Price adjustment applied if applicable.",
	})
}

// AddPassenger handles POST /api/v1/bookings/:id/passengers
// Adds a new passenger to an existing booking
func (h *BookingHandler) AddPassenger(c *gin.Context) {
	// Parse booking ID
	bookingIDStr := c.Param("id")
	bookingID, err := uuid.Parse(bookingIDStr)
	if err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid booking ID"})
		return
	}

	// Parse request body
	var input usecases.PassengerInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{Error: "Invalid request body"})
		return
	}

	// Add passenger
	passenger, ticket, err := h.bookingUsecase.AddPassengerToBooking(c.Request.Context(), bookingID, input)
	if err != nil {
		statusCode := http.StatusInternalServerError
		if err.Error() == "can only add passengers to confirmed bookings" ||
			err.Error() == "cannot add passengers within 24 hours of trip departure" ||
			err.Error() == "seat is not bookable" ||
			err.Error() == "seat is not available" {
			statusCode = http.StatusBadRequest
		} else if err.Error() == "booking not found" || err.Error() == "seat not found" {
			statusCode = http.StatusNotFound
		}

		c.JSON(statusCode, ErrorResponse{Error: err.Error()})
		return
	}

	c.JSON(http.StatusCreated, SuccessResponse{
		Message: "Passenger added successfully",
		Data: gin.H{
			"passenger": passenger,
			"ticket":    ticket,
		},
	})
}
