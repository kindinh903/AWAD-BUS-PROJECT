package services

import (
	"context"
	"fmt"
	"log"
	"os"
	"strings"
)

// ChatbotService provides AI-powered chat assistance
type ChatbotService struct {
	provider     AIProvider
	systemPrompt string
	enabled      bool
}

// NewChatbotService creates a new chatbot service
func NewChatbotService() (*ChatbotService, error) {
	enabled := os.Getenv("AI_ENABLED") == "true"

	if !enabled {
		log.Println("AI Chatbot is disabled")
		return &ChatbotService{enabled: false}, nil
	}

	// Determine which provider to use
	providerType := os.Getenv("AI_PROVIDER")
	if providerType == "" {
		providerType = "gemini" // default
	}

	var provider AIProvider
	var err error

	switch strings.ToLower(providerType) {
	case "gemini":
		provider, err = NewGeminiProvider()
		if err != nil {
			return nil, fmt.Errorf("failed to initialize Gemini provider: %w", err)
		}
	case "openai":
		// Future: Add OpenAI provider
		return nil, fmt.Errorf("OpenAI provider not yet implemented")
	default:
		return nil, fmt.Errorf("unsupported AI provider: %s", providerType)
	}

	log.Printf("AI Chatbot initialized with provider: %s", provider.GetProviderName())

	return &ChatbotService{
		provider:     provider,
		systemPrompt: getSystemPrompt(),
		enabled:      true,
	}, nil
}

// SendMessage sends a message to the AI chatbot
func (s *ChatbotService) SendMessage(ctx context.Context, message string, history []Message) (*ChatResponse, error) {
	if !s.enabled {
		return nil, fmt.Errorf("chatbot is disabled")
	}

	request := ChatRequest{
		Message:             message,
		ConversationHistory: history,
		SystemPrompt:        s.systemPrompt,
	}

	response, err := s.provider.SendMessage(ctx, request)
	if err != nil {
		return nil, fmt.Errorf("failed to get AI response: %w", err)
	}

	return response, nil
}

// IsEnabled returns whether the chatbot is enabled
func (s *ChatbotService) IsEnabled() bool {
	return s.enabled && s.provider != nil && s.provider.IsAvailable()
}

// GetProviderName returns the name of the AI provider
func (s *ChatbotService) GetProviderName() string {
	if s.provider == nil {
		return "none"
	}
	return s.provider.GetProviderName()
}

// getSystemPrompt returns the system prompt for the chatbot
func getSystemPrompt() string {
	return `You are a helpful AI assistant for a bus ticket booking system in Vietnam.

Your capabilities:
1. Help users search for bus trips between cities
2. Answer questions about booking policies, cancellation, and refunds
3. Provide information about available routes and schedules
4. Assist with booking-related questions
5. Guide users through the booking process

Key policies and information:
- Cancellation allowed up to 24 hours before departure for full refund
- Partial refund (50%) available between 24-48 hours before departure
- Seat selection is first-come-first-served
- Payment methods: Credit card, VNPay, MoMo, PayOS
- E-tickets are sent via email immediately after payment
- Booking confirmation includes QR code for check-in
- Passengers must arrive 15 minutes before departure

Popular routes in Vietnam:
- Hanoi ↔ Ha Long, Da Nang, Ho Chi Minh City, Sapa
- Ho Chi Minh City ↔ Da Lat, Nha Trang, Phan Thiet, Mui Ne
- Da Nang ↔ Hoi An, Hue

When users ask about trips, try to extract:
- Origin city (departure location)
- Destination city (arrival location)
- Departure date
- Number of passengers (if mentioned)

Be conversational, friendly, and concise. Always provide accurate information based on the policies above. If you're unsure about something specific, suggest the user contact customer support or check the website for real-time information.

For trip searches, encourage users to use the search form on the homepage for the most up-to-date availability and pricing.`
}
