// Package handlers provides HTTP request handlers for payment operations.
package handlers

import (
	"encoding/json"
	"net/http"
	"os"
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/yourusername/bus-booking-auth/internal/entities"
	"github.com/yourusername/bus-booking-auth/internal/usecases"
)

// PaymentHandler handles HTTP requests for payment operations
type PaymentHandler struct {
	paymentUsecase *usecases.PaymentUsecase
}

// NewPaymentHandler creates a new payment handler
func NewPaymentHandler(paymentUsecase *usecases.PaymentUsecase) *PaymentHandler {
	return &PaymentHandler{
		paymentUsecase: paymentUsecase,
	}
}

// CreatePaymentRequest represents the request body for creating a payment
// BookingID accepts string UUID format for proper compatibility
type CreatePaymentRequest struct {
	BookingID string  `json:"booking_id" binding:"required"`
	ReturnURL string  `json:"return_url,omitempty"`
	CancelURL string  `json:"cancel_url,omitempty"`
}

// CreatePayment handles POST /api/v1/payments
// Creates a new payment and returns the payment link
func (h *PaymentHandler) CreatePayment(c *gin.Context) {
	var req CreatePaymentRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	// Parse BookingID as UUID
	bookingID, err := uuid.Parse(req.BookingID)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid booking_id format",
			"details": "booking_id must be a valid UUID",
		})
		return
	}

	// Build return URLs, default to frontend payment result pages
	baseURL := os.Getenv("FRONTEND_URL")
	if baseURL == "" {
		baseURL = "http://localhost:5173"
	}
	returnURL := req.ReturnURL
	if returnURL == "" {
		returnURL = baseURL + "/payment/success"
	}
	cancelURL := req.CancelURL
	if cancelURL == "" {
		cancelURL = baseURL + "/payment/failed"
	}

	// Create payment request for usecase
	paymentReq := usecases.CreatePaymentRequest{
		BookingID:   bookingID,
		Method:      entities.PaymentMethodBankTransfer, // Default method
		ReturnURL:   returnURL,
		CancelURL:   cancelURL,
		Description: "Bus Ticket Payment",
	}

	// Call usecase to create payment
	response, err := h.paymentUsecase.CreatePayment(c.Request.Context(), paymentReq)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to create payment",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusCreated, gin.H{
		"payment":      response.Payment,
		"checkout_url": response.CheckoutURL,
		"qr_code_url":  response.QRCodeURL,
	})
}

// GetPayment handles GET /api/v1/payments/:id
// Retrieves payment details by ID
func (h *PaymentHandler) GetPayment(c *gin.Context) {
	idParam := c.Param("id")
	paymentID, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid payment ID format",
			"details": "payment_id must be a valid UUID",
		})
		return
	}

	payment, err := h.paymentUsecase.GetPaymentByID(c.Request.Context(), paymentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Payment not found",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payment": payment,
	})
}

// GetPaymentsByBooking handles GET /api/v1/bookings/:id/payments
// Retrieves all payments for a booking
func (h *PaymentHandler) GetPaymentsByBooking(c *gin.Context) {
	idParam := c.Param("id")
	bookingID, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid booking ID format",
			"details": "booking_id must be a valid UUID",
		})
		return
	}

	payments, err := h.paymentUsecase.GetPaymentByBookingID(c.Request.Context(), bookingID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{
			"error":   "Failed to retrieve payments",
			"details": err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"payments": payments,
		"count":    len(payments),
	})
}

// PayOSWebhookRequest represents the webhook payload from PayOS
// Structure follows PayOS documentation
type PayOSWebhookRequest struct {
	Code      string                 `json:"code"`
	Desc      string                 `json:"desc"`
	Success   bool                   `json:"success"`
	Data      map[string]interface{} `json:"data"`
	Signature string                 `json:"signature"`
}

// ProcessPayOSWebhook handles POST /api/v1/webhooks/payos
// Processes payment status updates from PayOS gateway
// This endpoint is called by PayOS and should NOT require authentication
func (h *PaymentHandler) ProcessPayOSWebhook(c *gin.Context) {
	// Read raw body for signature verification
	bodyBytes, err := c.GetRawData()
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to read request body"})
		return
	}

	// Parse webhook payload
	var webhookReq PayOSWebhookRequest
	if err := json.Unmarshal(bodyBytes, &webhookReq); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid JSON payload"})
		return
	}

	// Extract signature from header (PayOS sends it in X-Signature header)
	signature := c.GetHeader("X-Signature")
	if signature == "" {
		// Fallback to signature in body if header not present
		signature = webhookReq.Signature
	}

	if signature == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Missing signature"})
		return
	}

	// Extract external payment ID from webhook data
	externalPaymentID, ok := webhookReq.Data["orderCode"].(string)
	if !ok {
		// Try alternate field name
		if orderCode, exists := webhookReq.Data["order_code"].(float64); exists {
			externalPaymentID = strconv.FormatFloat(orderCode, 'f', 0, 64)
		} else {
			c.JSON(http.StatusBadRequest, gin.H{"error": "Missing orderCode in webhook data"})
			return
		}
	}

	// Determine event type from webhook data
	eventType := "unknown"
	if webhookReq.Success {
		if status, ok := webhookReq.Data["status"].(string); ok {
			switch status {
			case "PAID":
				eventType = "payment.success"
			case "CANCELLED":
				eventType = "payment.cancelled"
			case "EXPIRED":
				eventType = "payment.expired"
			}
		}
	} else {
		eventType = "payment.failed"
	}

	// Process webhook through usecase
	if err := h.paymentUsecase.ProcessWebhook(c.Request.Context(), externalPaymentID, eventType, string(bodyBytes), signature); err != nil {
		// Even if processing fails, return 200 to prevent PayOS from retrying
		// Errors are logged in the webhook log table for manual review
		c.JSON(http.StatusOK, gin.H{
			"status":  "received",
			"message": "Webhook received but processing failed. Will be retried.",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Webhook processed successfully",
	})
}

// MockPaymentCallbackRequest represents the callback from mock payment page
// Used for development/testing without real payment gateway
type MockPaymentCallbackRequest struct {
	PaymentID string `json:"payment_id" binding:"required"`
	Status    string `json:"status" binding:"required"` // success, failed, cancelled
}

// MockPaymentCallback handles POST /api/v1/mock-payment/callback
// Simulates payment gateway callback for development/testing
// Only available when USE_MOCK_PAYMENT=true
func (h *PaymentHandler) MockPaymentCallback(c *gin.Context) {
	var req MockPaymentCallbackRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid request",
			"details": err.Error(),
		})
		return
	}

	// Map status to event type
	eventType := ""
	switch req.Status {
	case "success":
		eventType = "payment.success"
	case "failed":
		eventType = "payment.failed"
	case "cancelled":
		eventType = "payment.cancelled"
	default:
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid status"})
		return
	}

	// Create mock webhook payload
	webhookPayload := map[string]interface{}{
		"orderCode": req.PaymentID,
		"status":    req.Status,
		"timestamp": "mock",
	}
	payloadBytes, _ := json.Marshal(webhookPayload)

	// Process with mock signature (empty for mock)
	if err := h.paymentUsecase.ProcessWebhook(c.Request.Context(), req.PaymentID, eventType, string(payloadBytes), "mock-signature"); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":  "success",
		"message": "Mock payment processed successfully",
	})
}

// CheckPaymentStatus handles GET /api/v1/payments/:id/status
// Polls payment status for real-time updates on payment page
func (h *PaymentHandler) CheckPaymentStatus(c *gin.Context) {
	idParam := c.Param("id")
	paymentID, err := uuid.Parse(idParam)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{
			"error":   "Invalid payment ID format",
			"details": "payment_id must be a valid UUID",
		})
		return
	}

	payment, err := h.paymentUsecase.GetPaymentByID(c.Request.Context(), paymentID)
	if err != nil {
		c.JSON(http.StatusNotFound, gin.H{
			"error":   "Payment not found",
			"details": err.Error(),
		})
		return
	}

	// Return only status-related fields for efficient polling
	c.JSON(http.StatusOK, gin.H{
		"payment_id":  payment.ID,
		"status":      payment.Status,
		"is_paid":     payment.Status == entities.PaymentTransactionCompleted,
		"updated_at":  payment.UpdatedAt,
		"expires_at":  payment.ExpiresAt,
		"payment_url": payment.PaymentURL,
	})
}

// RegisterPaymentRoutes registers all payment-related routes
func RegisterPaymentRoutes(router *gin.RouterGroup, handler *PaymentHandler, authMiddleware gin.HandlerFunc) {
	// Protected routes (require authentication)
	payments := router.Group("/payments")
	payments.Use(authMiddleware)
	{
		payments.POST("", handler.CreatePayment)
		payments.GET("/:id", handler.GetPayment)
		payments.GET("/:id/status", handler.CheckPaymentStatus)
	}

	bookings := router.Group("/bookings")
	bookings.Use(authMiddleware)
	{
		bookings.GET("/:id/payments", handler.GetPaymentsByBooking)
	}

	// Public routes (no authentication)
	webhooks := router.Group("/webhooks")
	{
		// PayOS webhook endpoint (called by payment gateway)
		webhooks.POST("/payos", handler.ProcessPayOSWebhook)

		// Mock payment callback (for development only)
		// TODO: Disable in production via environment variable check
		webhooks.POST("/mock-payment", handler.MockPaymentCallback)
	}
}
