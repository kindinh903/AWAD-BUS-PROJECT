package handlers

import (
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/yourusername/bus-booking-auth/internal/services"
)

// ChatbotHandler handles AI chatbot requests
type ChatbotHandler struct {
	chatbotService *services.ChatbotService
}

// NewChatbotHandler creates a new chatbot handler
func NewChatbotHandler(chatbotService *services.ChatbotService) *ChatbotHandler {
	return &ChatbotHandler{
		chatbotService: chatbotService,
	}
}

// ChatMessageRequest represents a chat message from the user
type ChatMessageRequest struct {
	Message string             `json:"message" binding:"required"`
	History []services.Message `json:"history,omitempty"`
}

// ChatMessageResponse represents the response to the user
type ChatMessageResponse struct {
	Reply      string    `json:"reply"`
	Provider   string    `json:"provider"`
	TokensUsed int       `json:"tokens_used,omitempty"`
	Timestamp  time.Time `json:"timestamp"`
}

// SendMessage handles chat message requests
// @Summary Send a message to the AI chatbot
// @Description Send a message to the AI assistant and receive a response
// @Tags chatbot
// @Accept json
// @Produce json
// @Param request body ChatMessageRequest true "Chat message"
// @Success 200 {object} ChatMessageResponse
// @Failure 400 {object} ErrorResponse
// @Failure 500 {object} ErrorResponse
// @Router /chatbot/message [post]
func (h *ChatbotHandler) SendMessage(c *gin.Context) {
	// Check if chatbot is enabled
	if !h.chatbotService.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, ErrorResponse{
			Error: "AI chatbot is currently unavailable",
		})
		return
	}

	var req ChatMessageRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Invalid request: " + err.Error(),
		})
		return
	}

	// Validate message
	if len(req.Message) == 0 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Message cannot be empty",
		})
		return
	}

	if len(req.Message) > 2000 {
		c.JSON(http.StatusBadRequest, ErrorResponse{
			Error: "Message too long (max 2000 characters)",
		})
		return
	}

	// Send message to chatbot service
	response, err := h.chatbotService.SendMessage(c.Request.Context(), req.Message, req.History)
	if err != nil {
		c.JSON(http.StatusInternalServerError, ErrorResponse{
			Error: "Failed to get chatbot response: " + err.Error(),
		})
		return
	}

	// Return response
	c.JSON(http.StatusOK, ChatMessageResponse{
		Reply:      response.Reply,
		Provider:   response.Provider,
		TokensUsed: response.TokensUsed,
		Timestamp:  response.Timestamp,
	})
}

// HealthCheck checks if the chatbot service is available
// @Summary Check chatbot health
// @Description Check if the AI chatbot service is available and configured
// @Tags chatbot
// @Produce json
// @Success 200 {object} map[string]interface{}
// @Failure 503 {object} ErrorResponse
// @Router /chatbot/health [get]
func (h *ChatbotHandler) HealthCheck(c *gin.Context) {
	if !h.chatbotService.IsEnabled() {
		c.JSON(http.StatusServiceUnavailable, ErrorResponse{
			Error: "Chatbot is disabled or not configured",
		})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"status":   "healthy",
		"provider": h.chatbotService.GetProviderName(),
		"enabled":  true,
	})
}
