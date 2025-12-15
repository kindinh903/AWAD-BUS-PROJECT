package services

import (
	"bytes"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strings"
	"time"

	"github.com/google/uuid"
)

// PaymentProvider is an interface that can be implemented by different payment gateways
// This allows us to swap between mock and real implementations easily
type PaymentProvider interface {
	CreatePaymentLink(req CreatePaymentRequest) (*PaymentLinkResponse, error)
	VerifyWebhookSignature(payload []byte, signature string) (bool, error)
	GetPaymentStatus(paymentID string) (*PaymentStatusResponse, error)
	CancelPayment(paymentID string) error
}

// CreatePaymentRequest represents a payment link creation request
type CreatePaymentRequest struct {
	OrderCode   string  `json:"orderCode"`
	Amount      float64 `json:"amount"`
	Description string  `json:"description"`
	ReturnURL   string  `json:"returnUrl"`
	CancelURL   string  `json:"cancelUrl"`
	BuyerName   string  `json:"buyerName,omitempty"`
	BuyerEmail  string  `json:"buyerEmail,omitempty"`
	BuyerPhone  string  `json:"buyerPhone,omitempty"`
	ExpiresAt   int64   `json:"expiredAt,omitempty"` // Unix timestamp
}

// PaymentLinkResponse represents the response from payment link creation
type PaymentLinkResponse struct {
	PaymentLinkID string `json:"payment_link_id"`
	OrderCode     string `json:"order_code"`
	CheckoutURL   string `json:"checkout_url"`
	QRCodeURL     string `json:"qr_code_url,omitempty"`
	ExpiresAt     int64  `json:"expires_at"`
}

// PaymentStatusResponse represents payment status check response
type PaymentStatusResponse struct {
	OrderCode     string     `json:"order_code"`
	Status        string     `json:"status"` // PENDING, PAID, CANCELLED, EXPIRED
	Amount        float64    `json:"amount"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	TransactionID string     `json:"transaction_id,omitempty"`
}

// PayOSService implements PaymentProvider for PayOS gateway
// This is a real implementation that can be used in production
type PayOSService struct {
	clientID    string
	apiKey      string
	checksumKey string
	baseURL     string
	httpClient  *http.Client
}

// NewPayOSService creates a new PayOS service
func NewPayOSService(clientID, apiKey, checksumKey string) PaymentProvider {
	return &PayOSService{
		clientID:    clientID,
		apiKey:      apiKey,
		checksumKey: checksumKey,
		baseURL:     getEnv("PAYOS_BASE_URL", "https://api-merchant.payos.vn"),
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// CreatePaymentLink creates a new payment link via PayOS API
func (s *PayOSService) CreatePaymentLink(req CreatePaymentRequest) (*PaymentLinkResponse, error) {
	// Build request payload
	payload := map[string]interface{}{
		"orderCode":   req.OrderCode,
		"amount":      int(req.Amount * 100), // Convert to cents
		"description": req.Description,
		"returnUrl":   req.ReturnURL,
		"cancelUrl":   req.CancelURL,
	}

	if req.BuyerName != "" {
		payload["buyerName"] = req.BuyerName
	}
	if req.BuyerEmail != "" {
		payload["buyerEmail"] = req.BuyerEmail
	}
	if req.BuyerPhone != "" {
		payload["buyerPhone"] = req.BuyerPhone
	}
	if req.ExpiresAt > 0 {
		payload["expiredAt"] = req.ExpiresAt
	}

	// Generate signature for request
	signature := s.generateSignature(payload)

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Make API request
	request, err := http.NewRequest("POST", s.baseURL+"/v2/payment-requests", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("x-client-id", s.clientID)
	request.Header.Set("x-api-key", s.apiKey)
	request.Header.Set("x-signature", signature)

	resp, err := s.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("PayOS API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp struct {
		Code    int    `json:"code"`
		Message string `json:"message"`
		Data    struct {
			PaymentLinkID string `json:"paymentLinkId"`
			OrderCode     string `json:"orderCode"`
			CheckoutURL   string `json:"checkoutUrl"`
			QRCodeURL     string `json:"qrCode"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if apiResp.Code != 0 {
		return nil, fmt.Errorf("PayOS error: %s", apiResp.Message)
	}

	return &PaymentLinkResponse{
		PaymentLinkID: apiResp.Data.PaymentLinkID,
		OrderCode:     apiResp.Data.OrderCode,
		CheckoutURL:   apiResp.Data.CheckoutURL,
		QRCodeURL:     apiResp.Data.QRCodeURL,
		ExpiresAt:     req.ExpiresAt,
	}, nil
}

// VerifyWebhookSignature verifies the webhook signature from PayOS
func (s *PayOSService) VerifyWebhookSignature(payload []byte, signature string) (bool, error) {
	// PayOS uses HMAC-SHA256 for webhook signature
	mac := hmac.New(sha256.New, []byte(s.checksumKey))
	mac.Write(payload)
	expectedSignature := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(signature), []byte(expectedSignature)), nil
}

// GetPaymentStatus retrieves payment status from PayOS
func (s *PayOSService) GetPaymentStatus(paymentID string) (*PaymentStatusResponse, error) {
	request, err := http.NewRequest("GET", s.baseURL+"/v2/payment-requests/"+paymentID, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	request.Header.Set("x-client-id", s.clientID)
	request.Header.Set("x-api-key", s.apiKey)

	resp, err := s.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	var apiResp struct {
		Code int `json:"code"`
		Data struct {
			OrderCode     string  `json:"orderCode"`
			Status        string  `json:"status"`
			Amount        float64 `json:"amount"`
			TransactionID string  `json:"transactionId"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	return &PaymentStatusResponse{
		OrderCode:     apiResp.Data.OrderCode,
		Status:        apiResp.Data.Status,
		Amount:        apiResp.Data.Amount / 100, // Convert from cents
		TransactionID: apiResp.Data.TransactionID,
	}, nil
}

// CancelPayment cancels a payment via PayOS
func (s *PayOSService) CancelPayment(paymentID string) error {
	request, err := http.NewRequest("DELETE", s.baseURL+"/v2/payment-requests/"+paymentID, nil)
	if err != nil {
		return fmt.Errorf("failed to create request: %w", err)
	}

	request.Header.Set("x-client-id", s.clientID)
	request.Header.Set("x-api-key", s.apiKey)

	resp, err := s.httpClient.Do(request)
	if err != nil {
		return fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("PayOS API error: %s", string(body))
	}

	return nil
}

// generateSignature creates HMAC signature for PayOS requests
func (s *PayOSService) generateSignature(data map[string]interface{}) string {
	// Sort keys
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build signature string
	var parts []string
	for _, k := range keys {
		parts = append(parts, fmt.Sprintf("%s=%v", k, data[k]))
	}
	signatureData := strings.Join(parts, "&")

	// Generate HMAC
	mac := hmac.New(sha256.New, []byte(s.checksumKey))
	mac.Write([]byte(signatureData))
	return hex.EncodeToString(mac.Sum(nil))
}

// MockPaymentService is a mock implementation for testing/development
// This can be used when PayOS credentials are not available
type MockPaymentService struct {
	mockPayments map[string]*PaymentStatusResponse // paymentID -> status
}

// NewMockPaymentService creates a new mock payment service
func NewMockPaymentService() PaymentProvider {
	return &MockPaymentService{
		mockPayments: make(map[string]*PaymentStatusResponse),
	}
}

// CreatePaymentLink creates a mock payment link
func (m *MockPaymentService) CreatePaymentLink(req CreatePaymentRequest) (*PaymentLinkResponse, error) {
	paymentID := uuid.New().String()

	// Store mock payment
	m.mockPayments[paymentID] = &PaymentStatusResponse{
		OrderCode: req.OrderCode,
		Status:    "PENDING",
		Amount:    req.Amount,
	}

	// Return mock URL with payment ID as query param
	checkoutURL := fmt.Sprintf("http://localhost:5173/payment/mock?payment_id=%s&order_code=%s&amount=%.2f",
		paymentID, req.OrderCode, req.Amount)

	return &PaymentLinkResponse{
		PaymentLinkID: paymentID,
		OrderCode:     req.OrderCode,
		CheckoutURL:   checkoutURL,
		QRCodeURL:     "",
		ExpiresAt:     time.Now().Add(30 * time.Minute).Unix(),
	}, nil
}

// VerifyWebhookSignature always returns true for mock
func (m *MockPaymentService) VerifyWebhookSignature(payload []byte, signature string) (bool, error) {
	return true, nil
}

// GetPaymentStatus retrieves mock payment status
func (m *MockPaymentService) GetPaymentStatus(paymentID string) (*PaymentStatusResponse, error) {
	status, ok := m.mockPayments[paymentID]
	if !ok {
		return nil, fmt.Errorf("payment not found")
	}
	return status, nil
}

// CancelPayment cancels a mock payment
func (m *MockPaymentService) CancelPayment(paymentID string) error {
	if status, ok := m.mockPayments[paymentID]; ok {
		status.Status = "CANCELLED"
		return nil
	}
	return fmt.Errorf("payment not found")
}

// SimulatePaymentSuccess simulates a successful payment (for testing)
func (m *MockPaymentService) SimulatePaymentSuccess(paymentID string) error {
	if status, ok := m.mockPayments[paymentID]; ok {
		status.Status = "PAID"
		now := time.Now()
		status.PaidAt = &now
		status.TransactionID = "MOCK_TX_" + uuid.New().String()[:8]
		return nil
	}
	return fmt.Errorf("payment not found")
}
