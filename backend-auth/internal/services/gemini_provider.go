package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"strings"
	"time"
)

// GeminiProvider implements AIProvider for Google Gemini API
type GeminiProvider struct {
	apiKey      string
	model       string
	maxTokens   int
	temperature float32
	baseURL     string
	httpClient  *http.Client
}

// NewGeminiProvider creates a new Gemini AI provider
func NewGeminiProvider() (*GeminiProvider, error) {
	apiKey := os.Getenv("GEMINI_API_KEY")
	if apiKey == "" {
		return nil, fmt.Errorf("GEMINI_API_KEY not set")
	}

	// Use gemini-3-flash-preview as default (2025 latest model)
	model := getEnv("GEMINI_MODEL", "gemini-3-flash-preview")
	maxTokens := getEnvInt("GEMINI_MAX_TOKENS", 1024)
	temperature := getEnvFloat32("GEMINI_TEMPERATURE", 0.7)

	return &GeminiProvider{
		apiKey:      apiKey,
		model:       model,
		maxTokens:   maxTokens,
		temperature: temperature,
		baseURL:     "https://generativelanguage.googleapis.com/v1beta",
		httpClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}, nil
}

// SendMessage sends a message to Gemini API
func (g *GeminiProvider) SendMessage(ctx context.Context, request ChatRequest) (*ChatResponse, error) {
	// Build the prompt with conversation history
	var contents []map[string]interface{}

	// Add system instructions as first user message if provided
	if request.SystemPrompt != "" {
		contents = append(contents, map[string]interface{}{
			"role": "user",
			"parts": []map[string]string{
				{"text": request.SystemPrompt},
			},
		})
		contents = append(contents, map[string]interface{}{
			"role": "model",
			"parts": []map[string]string{
				{"text": "Understood. I'll assist users with the bus booking system according to these guidelines."},
			},
		})
	}

	// Add conversation history
	for _, msg := range request.ConversationHistory {
		role := "user"
		if msg.Role == "assistant" {
			role = "model"
		}
		contents = append(contents, map[string]interface{}{
			"role": role,
			"parts": []map[string]string{
				{"text": msg.Content},
			},
		})
	}

	// Add current message
	contents = append(contents, map[string]interface{}{
		"role": "user",
		"parts": []map[string]string{
			{"text": request.Message},
		},
	})

	// Prepare request body
	maxTokens := request.MaxTokens
	if maxTokens == 0 {
		maxTokens = g.maxTokens
	}

	temperature := request.Temperature
	if temperature == 0 {
		temperature = g.temperature
	}

	requestBody := map[string]interface{}{
		"contents": contents,
		"generationConfig": map[string]interface{}{
			"temperature":     temperature,
			"maxOutputTokens": maxTokens,
			"topK":            40,
			"topP":            0.95,
		},
	}

	// Convert to JSON
	jsonData, err := json.Marshal(requestBody)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal request: %w", err)
	}

	// Build URL - Correct format: BASE_URL/models/MODEL_NAME:generateContent?key=API_KEY
	url := fmt.Sprintf("%s/models/%s:generateContent?key=%s", g.baseURL, g.model, g.apiKey)

	// Create HTTP request
	req, err := http.NewRequestWithContext(ctx, "POST", url, strings.NewReader(string(jsonData)))
	if err != nil {
		return nil, fmt.Errorf("failed to create request: %w", err)
	}

	req.Header.Set("Content-Type", "application/json")

	// Send request
	resp, err := g.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("failed to send request: %w", err)
	}
	defer resp.Body.Close()

	// Read response
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("failed to read response: %w", err)
	}

	// Check for errors
	if resp.StatusCode != http.StatusOK {
		log.Printf("Gemini API error (status %d): %s", resp.StatusCode, string(body))
		return nil, fmt.Errorf("gemini API error: %s", string(body))
	}

	// Parse response
	var geminiResp struct {
		Candidates []struct {
			Content struct {
				Parts []struct {
					Text string `json:"text"`
				} `json:"parts"`
			} `json:"content"`
			FinishReason string `json:"finishReason"`
		} `json:"candidates"`
		UsageMetadata struct {
			PromptTokenCount     int `json:"promptTokenCount"`
			CandidatesTokenCount int `json:"candidatesTokenCount"`
			TotalTokenCount      int `json:"totalTokenCount"`
		} `json:"usageMetadata"`
	}

	if err := json.Unmarshal(body, &geminiResp); err != nil {
		return nil, fmt.Errorf("failed to parse response: %w", err)
	}

	// Extract reply
	if len(geminiResp.Candidates) == 0 || len(geminiResp.Candidates[0].Content.Parts) == 0 {
		return nil, fmt.Errorf("no response from Gemini")
	}

	reply := geminiResp.Candidates[0].Content.Parts[0].Text
	finishReason := geminiResp.Candidates[0].FinishReason

	return &ChatResponse{
		Reply:        reply,
		Provider:     "gemini",
		TokensUsed:   geminiResp.UsageMetadata.TotalTokenCount,
		FinishReason: finishReason,
		Timestamp:    time.Now(),
	}, nil
}

// GetProviderName returns the provider name
func (g *GeminiProvider) GetProviderName() string {
	return "gemini"
}

// IsAvailable checks if Gemini is configured
func (g *GeminiProvider) IsAvailable() bool {
	return g.apiKey != ""
}
