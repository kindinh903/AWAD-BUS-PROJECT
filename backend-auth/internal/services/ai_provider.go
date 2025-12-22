package services

import (
	"context"
	"time"
)

// AIProvider defines the interface for AI chat providers (Gemini, OpenAI, etc.)
type AIProvider interface {
	// SendMessage sends a message to the AI and returns the response
	SendMessage(ctx context.Context, request ChatRequest) (*ChatResponse, error)

	// GetProviderName returns the name of the AI provider
	GetProviderName() string

	// IsAvailable checks if the provider is configured and ready
	IsAvailable() bool
}

// ChatRequest represents a chat message request
type ChatRequest struct {
	Message             string    `json:"message"`
	ConversationHistory []Message `json:"conversation_history,omitempty"`
	SystemPrompt        string    `json:"system_prompt,omitempty"`
	MaxTokens           int       `json:"max_tokens,omitempty"`
	Temperature         float32   `json:"temperature,omitempty"`
}

// Message represents a single message in the conversation
type Message struct {
	Role      string    `json:"role"` // "user" or "assistant"
	Content   string    `json:"content"`
	Timestamp time.Time `json:"timestamp,omitempty"`
}

// ChatResponse represents the AI's response
type ChatResponse struct {
	Reply        string    `json:"reply"`
	Provider     string    `json:"provider"`
	TokensUsed   int       `json:"tokens_used,omitempty"`
	FinishReason string    `json:"finish_reason,omitempty"`
	Timestamp    time.Time `json:"timestamp"`
}

// TripSearchContext extracted from conversation
type TripSearchContext struct {
	Origin      string `json:"origin,omitempty"`
	Destination string `json:"destination,omitempty"`
	Date        string `json:"date,omitempty"`
	Passengers  int    `json:"passengers,omitempty"`
	Intent      string `json:"intent,omitempty"` // "search", "booking", "faq", etc.
}
