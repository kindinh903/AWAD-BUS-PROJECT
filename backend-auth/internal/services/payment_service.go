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
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
)

// PaymentProvider is an interface that can be implemented by different payment gateways
type PaymentProvider interface {
	CreatePaymentLink(req CreatePaymentRequest) (*PaymentLinkResponse, error)
	VerifyWebhookSignature(payload []byte, signature string) (bool, error)
	GetPaymentStatus(paymentID string) (*PaymentStatusResponse, error)
	CancelPayment(paymentID string) error
}

// CreatePaymentRequest represents a payment link creation request
type CreatePaymentRequest struct {
	OrderCode   int64       `json:"orderCode"`
	Amount      float64     `json:"amount"`
	Description string      `json:"description"`
	ReturnURL   string      `json:"returnUrl"`
	CancelURL   string      `json:"cancelUrl"`
	BuyerName   string      `json:"buyerName,omitempty"`
	BuyerEmail  string      `json:"buyerEmail,omitempty"`
	BuyerPhone  string      `json:"buyerPhone,omitempty"`
	ExpiresAt   int64       `json:"expiredAt,omitempty"`
	Items       []PayOSItem `json:"items"`
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
	Status        string     `json:"status"`
	Amount        float64    `json:"amount"`
	PaidAt        *time.Time `json:"paid_at,omitempty"`
	TransactionID string     `json:"transaction_id,omitempty"`
}

// PayOSService implements PaymentProvider for PayOS gateway
type PayOSService struct {
	clientID    string
	apiKey      string
	checksumKey string
	baseURL     string
	httpClient  *http.Client
}

type PayOSItem struct {
	Name     string `json:"name"`
	Quantity int    `json:"quantity"`
	Price    int    `json:"price"`
}

// NewPayOSService creates a new PayOS service
func NewPayOSService(clientID, apiKey, checksumKey string) PaymentProvider {
	fmt.Printf("=== PayOS Service Init ===\n")
	fmt.Printf("Client ID: %s\n", clientID)
	fmt.Printf("API Key: %s\n", apiKey)
	fmt.Printf("Checksum Key: %s\n", checksumKey)
	fmt.Printf("==========================\n")

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
	// Build signature data (only required fields as per PayOS doc)
	signatureData := map[string]interface{}{
		"amount":      int(req.Amount),
		"cancelUrl":   req.CancelURL,
		"description": req.Description,
		"orderCode":   req.OrderCode,
		"returnUrl":   req.ReturnURL,
	}

	// Generate signature for required fields only
	signature := s.generateSignature(signatureData)

	// Build full request payload with ALL fields (required + optional)
	payload := map[string]interface{}{
		"orderCode":   req.OrderCode,
		"amount":      int(req.Amount),
		"description": req.Description,
		"cancelUrl":   req.CancelURL,
		"returnUrl":   req.ReturnURL,
		"signature":   signature, // CRITICAL: signature goes in BODY, not header
	}

	// Add optional buyer information
	if req.BuyerName != "" {
		payload["buyerName"] = req.BuyerName
	}
	if req.BuyerEmail != "" {
		payload["buyerEmail"] = req.BuyerEmail
	}
	if req.BuyerPhone != "" {
		// Clean phone number
		cleanedPhone := cleanPhoneForPayOS(req.BuyerPhone)
		if cleanedPhone != "" {
			payload["buyerPhone"] = cleanedPhone
		}
	}

	// Add expiration time if provided
	if req.ExpiresAt > 0 {
		payload["expiredAt"] = req.ExpiresAt
	}

	// Add items array if provided
	if len(req.Items) > 0 {
		payload["items"] = req.Items
	}

	jsonPayload, err := json.Marshal(payload)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal payload: %w", err)
	}

	// Debug logging
	fmt.Printf("=== PayOS Request Debug ===\n")
	fmt.Printf("OrderCode: %v\n", req.OrderCode)
	fmt.Printf("Amount: %v VND\n", int(req.Amount))
	fmt.Printf("Signature: %s\n", signature)
	fmt.Printf("JSON Payload: %s\n", string(jsonPayload))
	fmt.Printf("=========================\n")

	// Make API request
	request, err := http.NewRequest("POST", s.baseURL+"/v2/payment-requests", bytes.NewBuffer(jsonPayload))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	// Set headers (NO signature in header!)
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("x-client-id", s.clientID)
	request.Header.Set("x-api-key", s.apiKey)

	resp, err := s.httpClient.Do(request)
	if err != nil {
		return nil, fmt.Errorf("failed to make request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response body: %w", err)
	}

	fmt.Printf("PayOS Response Status: %d\n", resp.StatusCode)
	fmt.Printf("PayOS Response Body: %s\n", string(body))

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("PayOS API error (status %d): %s", resp.StatusCode, string(body))
	}

	var apiResp struct {
		Code    interface{} `json:"code"`
		Desc    string      `json:"desc"`
		Message string      `json:"message"`
		Data    struct {
			PaymentLinkID string `json:"paymentLinkId"`
			OrderCode     int64  `json:"orderCode"`
			CheckoutURL   string `json:"checkoutUrl"`
			QRCodeURL     string `json:"qrCode"`
		} `json:"data"`
	}

	if err := json.Unmarshal(body, &apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	// Check success code (PayOS returns code "00" for success)
	codeValue := 1
	if code, ok := apiResp.Code.(float64); ok {
		codeValue = int(code)
	} else if code, ok := apiResp.Code.(string); ok {
		if code == "0" || code == "00" {
			codeValue = 0
		}
	}

	if codeValue != 0 {
		errMsg := apiResp.Desc
		if errMsg == "" {
			errMsg = apiResp.Message
		}
		return nil, fmt.Errorf("PayOS error (code: %v): %s", apiResp.Code, errMsg)
	}

	return &PaymentLinkResponse{
		PaymentLinkID: apiResp.Data.PaymentLinkID,
		OrderCode:     strconv.FormatInt(apiResp.Data.OrderCode, 10),
		CheckoutURL:   apiResp.Data.CheckoutURL,
		QRCodeURL:     apiResp.Data.QRCodeURL,
		ExpiresAt:     req.ExpiresAt,
	}, nil
}

// cleanPhoneForPayOS formats phone number for PayOS requirements
func cleanPhoneForPayOS(phone string) string {
	// Remove all non-digit characters
	cleaned := ""
	for _, c := range phone {
		if c >= '0' && c <= '9' {
			cleaned += string(c)
		}
	}
	
	if cleaned == "" {
		return ""
	}
	
	// Handle different formats
	if strings.HasPrefix(cleaned, "84") {
		// Already has country code (84xxxxxxxxx)
		withoutCode := strings.TrimPrefix(cleaned, "84")
		
		// Vietnamese mobile: 9-10 digits after 84
		if len(withoutCode) >= 9 && len(withoutCode) <= 10 {
			// Valid prefixes: 3, 5, 7, 8, 9
			firstDigit := withoutCode[0]
			if firstDigit == '3' || firstDigit == '5' || firstDigit == '7' || 
			   firstDigit == '8' || firstDigit == '9' {
				return "84" + withoutCode
			}
		}
	} else if strings.HasPrefix(cleaned, "0") {
		// Local format (0xxxxxxxxx)
		withoutZero := strings.TrimPrefix(cleaned, "0")
		
		// Must be 9 digits after removing leading 0
		if len(withoutZero) == 9 {
			firstDigit := withoutZero[0]
			if firstDigit == '3' || firstDigit == '5' || firstDigit == '7' || 
			   firstDigit == '8' || firstDigit == '9' {
				return "84" + withoutZero
			}
		}
	}
	
	// Invalid format - return empty to skip this field
	fmt.Printf("Warning: Invalid phone format '%s', skipping buyerPhone\n", phone)
	return ""
}

// VerifyWebhookSignature verifies the webhook signature from PayOS
// According to PayOS documentation, signature is generated from the "data" object
// signature = HMAC-SHA256(data_string, checksumKey)
// where data_string is sorted key=value pairs joined by "&"
func (s *PayOSService) VerifyWebhookSignature(payload []byte, signature string) (bool, error) {
	fmt.Printf("=== Webhook Signature Verification ===\n")
	fmt.Printf("Received Signature: %s\n", signature)
	fmt.Printf("Payload: %s\n", string(payload))
	
	// PayOS webhook signature verification
	var webhookData map[string]interface{}
	if err := json.Unmarshal(payload, &webhookData); err != nil {
		return false, fmt.Errorf("failed to parse webhook payload: %w", err)
	}

	// Extract data section - PayOS sends the data object
	data, ok := webhookData["data"].(map[string]interface{})
	if !ok {
		// If no data object, try to use entire payload
		fmt.Println("Warning: No 'data' object found, attempting to verify entire payload")
		data = webhookData
	}

	// Generate expected signature from data
	expectedSignature := s.generateSignature(data)
	fmt.Printf("Expected Signature: %s\n", expectedSignature)
	fmt.Printf("Signature Match: %v\n", hmac.Equal([]byte(signature), []byte(expectedSignature)))
	fmt.Printf("======================================\n")
	
	return hmac.Equal([]byte(signature), []byte(expectedSignature)), nil
}

// GetPaymentStatus retrieves payment status from PayOS
func (s *PayOSService) GetPaymentStatus(orderCode string) (*PaymentStatusResponse, error) {
	url := fmt.Sprintf("%s/v2/payment-requests/%s", s.baseURL, orderCode)
	request, err := http.NewRequest("GET", url, nil)
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
		Code int    `json:"code"`
		Desc string `json:"desc"`
		Data struct {
			OrderCode     int64   `json:"orderCode"`
			Status        string  `json:"status"`
			Amount        int     `json:"amount"`
			TransactionID *string `json:"transactions,omitempty"`
		} `json:"data"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&apiResp); err != nil {
		return nil, fmt.Errorf("failed to decode response: %w", err)
	}

	if apiResp.Code != 0 {
		return nil, fmt.Errorf("PayOS error: %s", apiResp.Desc)
	}

	transactionID := ""
	if apiResp.Data.TransactionID != nil {
		transactionID = *apiResp.Data.TransactionID
	}

	return &PaymentStatusResponse{
		OrderCode:     strconv.FormatInt(apiResp.Data.OrderCode, 10),
		Status:        apiResp.Data.Status,
		Amount:        float64(apiResp.Data.Amount),
		TransactionID: transactionID,
	}, nil
}

// CancelPayment cancels a payment via PayOS
func (s *PayOSService) CancelPayment(orderCode string) error {
	url := fmt.Sprintf("%s/v2/payment-requests/%s", s.baseURL, orderCode)
	request, err := http.NewRequest("PUT", url, nil)
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

// generateSignature creates HMAC-SHA256 signature for PayOS requests
// According to PayOS docs: sort keys alphabetically and format as key1=value1&key2=value2
// IMPORTANT: Numbers must be formatted as integers (not scientific notation)
func (s *PayOSService) generateSignature(data map[string]interface{}) string {
	// Sort keys alphabetically
	keys := make([]string, 0, len(data))
	for k := range data {
		keys = append(keys, k)
	}
	sort.Strings(keys)

	// Build signature string: key1=value1&key2=value2&...
	var parts []string
	for _, k := range keys {
		value := data[k]
		
		// Convert value to string based on type
		var strValue string
		switch v := value.(type) {
		case string:
			strValue = v
		case bool:
			strValue = fmt.Sprintf("%v", v)
		case float64:
			// CRITICAL: Format as integer if it's a whole number to avoid scientific notation
			// This is needed for orderCode and amount fields
			if v == float64(int64(v)) {
				strValue = fmt.Sprintf("%d", int64(v))
			} else {
				strValue = fmt.Sprintf("%f", v)
			}
		case int, int64:
			strValue = fmt.Sprintf("%d", v)
		case []PayOSItem:
			// Convert items array to JSON string
			jsonBytes, err := json.Marshal(v)
			if err != nil {
				strValue = fmt.Sprintf("%v", v)
			} else {
				strValue = string(jsonBytes)
			}
		case []interface{}:
			// Handle generic array
			jsonBytes, err := json.Marshal(v)
			if err != nil {
				strValue = fmt.Sprintf("%v", v)
			} else {
				strValue = string(jsonBytes)
			}
		case nil:
			strValue = "null"
		default:
			// Fallback for other types
			jsonBytes, err := json.Marshal(v)
			if err != nil {
				strValue = fmt.Sprintf("%v", v)
			} else {
				strValue = string(jsonBytes)
			}
		}
		
		parts = append(parts, fmt.Sprintf("%s=%s", k, strValue))
	}
	signatureData := strings.Join(parts, "&")

	fmt.Printf("[Signature] Data: %s\n", signatureData)

	// Generate HMAC-SHA256
	mac := hmac.New(sha256.New, []byte(s.checksumKey))
	mac.Write([]byte(signatureData))
	signature := hex.EncodeToString(mac.Sum(nil))
	fmt.Printf("[Signature] Generated: %s\n", signature)
	return signature
}

// MockPaymentService is a mock implementation for testing/development
type MockPaymentService struct {
	mockPayments map[string]*PaymentStatusResponse
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
	orderCodeStr := strconv.FormatInt(req.OrderCode, 10)

	m.mockPayments[paymentID] = &PaymentStatusResponse{
		OrderCode: orderCodeStr,
		Status:    "PENDING",
		Amount:    req.Amount,
	}

	checkoutURL := fmt.Sprintf("http://localhost:5173/payment/mock?payment_id=%s&order_code=%d&amount=%.0f",
		paymentID, req.OrderCode, req.Amount)

	return &PaymentLinkResponse{
		PaymentLinkID: paymentID,
		OrderCode:     orderCodeStr,
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
func (m *MockPaymentService) GetPaymentStatus(orderCode string) (*PaymentStatusResponse, error) {
	status, ok := m.mockPayments[orderCode]
	if !ok {
		return nil, fmt.Errorf("payment not found")
	}
	return status, nil
}

// CancelPayment cancels a mock payment
func (m *MockPaymentService) CancelPayment(orderCode string) error {
	if status, ok := m.mockPayments[orderCode]; ok {
		status.Status = "CANCELLED"
		return nil
	}
	return fmt.Errorf("payment not found")
}

// Helper function to get environment variable with default
// func getEnv(key, defaultValue string) string {
// 	// This is a placeholder - in real implementation, use os.Getenv
// 	return defaultValue
// }