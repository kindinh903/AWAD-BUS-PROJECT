# Test Gemini Chatbot API
# Run this script to test the chatbot without starting the full server

Write-Host "Testing Gemini Chatbot Integration..." -ForegroundColor Cyan
Write-Host ""

# Set environment variables
$env:GEMINI_API_KEY="AIzaSyBd0cgw8jF7VZaNrIhIjzkzeEejWkOlwc0"
$env:GEMINI_MODEL="gemini-1.5-flash"
$env:AI_PROVIDER="gemini"
$env:AI_ENABLED="true"

# Create test file
$testCode = @'
package main

import (
	"context"
	"fmt"
	"log"
	"os"
	"time"
	
	"github.com/yourusername/bus-booking-auth/internal/services"
)

func main() {
	// Set environment variables
	os.Setenv("GEMINI_API_KEY", "AIzaSyBd0cgw8jF7VZaNrIhIjzkzeEejWkOlwc0")
	os.Setenv("GEMINI_MODEL", "gemini-1.5-flash")
	os.Setenv("AI_PROVIDER", "gemini")
	os.Setenv("AI_ENABLED", "true")
	
	fmt.Println("=== Gemini Chatbot Test ===\n")
	
	// Initialize chatbot service
	fmt.Println("Initializing chatbot service...")
	chatbot, err := services.NewChatbotService()
	if err != nil {
		log.Fatalf("Failed to initialize chatbot: %v", err)
	}
	
	if !chatbot.IsEnabled() {
		log.Fatal("Chatbot is not enabled")
	}
	
	fmt.Printf("✓ Chatbot initialized with provider: %s\n\n", chatbot.GetProviderName())
	
	// Test 1: Simple greeting
	fmt.Println("Test 1: Simple Greeting")
	fmt.Println("User: Hello! How can you help me?")
	
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()
	
	response, err := chatbot.SendMessage(ctx, "Hello! How can you help me?", nil)
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}
	
	fmt.Printf("Assistant (%s): %s\n", response.Provider, response.Reply)
	fmt.Printf("Tokens used: %d\n\n", response.TokensUsed)
	
	// Test 2: Trip search query
	fmt.Println("Test 2: Trip Search Query")
	fmt.Println("User: I need to find a bus from Hanoi to Da Nang tomorrow")
	
	history := []services.Message{
		{Role: "user", Content: "Hello! How can you help me?"},
		{Role: "assistant", Content: response.Reply},
	}
	
	ctx2, cancel2 := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel2()
	
	response2, err := chatbot.SendMessage(ctx2, "I need to find a bus from Hanoi to Da Nang tomorrow", history)
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}
	
	fmt.Printf("Assistant (%s): %s\n", response2.Provider, response2.Reply)
	fmt.Printf("Tokens used: %d\n\n", response2.TokensUsed)
	
	// Test 3: Policy question
	fmt.Println("Test 3: Policy Question")
	fmt.Println("User: What is your cancellation policy?")
	
	ctx3, cancel3 := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel3()
	
	response3, err := chatbot.SendMessage(ctx3, "What is your cancellation policy?", nil)
	if err != nil {
		log.Fatalf("Failed to send message: %v", err)
	}
	
	fmt.Printf("Assistant (%s): %s\n", response3.Provider, response3.Reply)
	fmt.Printf("Tokens used: %d\n\n", response3.TokensUsed)
	
	fmt.Println("=== All Tests Passed! ===")
}
'@

# Save test file
Set-Content -Path ".\test_chatbot.go" -Value $testCode

Write-Host "Running chatbot test..." -ForegroundColor Yellow
Write-Host ""

# Run the test
go run test_chatbot.go

# Cleanup
Remove-Item ".\test_chatbot.go" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "Test completed!" -ForegroundColor Green
