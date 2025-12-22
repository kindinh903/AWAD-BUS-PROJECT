# Test Gemini AI Chatbot HTTP Endpoints

$baseUrl = "http://localhost:8080/api/v1"

Write-Host "`n=== Testing AI Chatbot Endpoints ===" -ForegroundColor Cyan

# Test 1: Health Check
Write-Host "`n1. Testing Chatbot Health Endpoint..." -ForegroundColor Yellow
try {
    $health = Invoke-RestMethod -Uri "$baseUrl/chatbot/health" -Method Get
    Write-Host "✅ Health Check Response:" -ForegroundColor Green
    $health | ConvertTo-Json -Depth 5
} catch {
    Write-Host "❌ Health check failed: $_" -ForegroundColor Red
}

# Test 2: Simple greeting
Write-Host "`n2. Testing Simple Greeting..." -ForegroundColor Yellow
$greeting = @{
    message = "Hello! Can you help me book a bus ticket?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chatbot/message" -Method Post -Body $greeting -ContentType "application/json"
    Write-Host "✅ Chatbot Response:" -ForegroundColor Green
    Write-Host "Response: $($response.response)" -ForegroundColor White
    Write-Host "Provider: $($response.provider)" -ForegroundColor Cyan
    Write-Host "Tokens Used: $($response.tokens_used)" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

# Test 3: Ask about routes
Write-Host "`n3. Testing Route Question..." -ForegroundColor Yellow
$routeQuestion = @{
    message = "What buses go from Hanoi to Da Nang?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chatbot/message" -Method Post -Body $routeQuestion -ContentType "application/json"
    Write-Host "✅ Chatbot Response:" -ForegroundColor Green
    Write-Host "Response: $($response.response)" -ForegroundColor White
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

# Test 4: Ask about cancellation policy
Write-Host "`n4. Testing Policy Question..." -ForegroundColor Yellow
$policyQuestion = @{
    message = "What is your cancellation policy?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chatbot/message" -Method Post -Body $policyQuestion -ContentType "application/json"
    Write-Host "✅ Chatbot Response:" -ForegroundColor Green
    Write-Host "Response: $($response.response)" -ForegroundColor White
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

# Test 5: Ask about payment methods
Write-Host "`n5. Testing Payment Question..." -ForegroundColor Yellow
$paymentQuestion = @{
    message = "What payment methods do you accept?"
} | ConvertTo-Json

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chatbot/message" -Method Post -Body $paymentQuestion -ContentType "application/json"
    Write-Host "✅ Chatbot Response:" -ForegroundColor Green
    Write-Host "Response: $($response.response)" -ForegroundColor White
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

# Test 6: Conversation with history
Write-Host "`n6. Testing Conversation with History..." -ForegroundColor Yellow
$conversationRequest = @{
    message = "How much does it cost?"
    history = @(
        @{
            role = "user"
            content = "I want to go from Hanoi to Da Nang"
        },
        @{
            role = "assistant"
            content = "Great! We have regular bus services from Hanoi to Da Nang. The journey takes approximately 14-16 hours."
        }
    )
} | ConvertTo-Json -Depth 5

try {
    $response = Invoke-RestMethod -Uri "$baseUrl/chatbot/message" -Method Post -Body $conversationRequest -ContentType "application/json"
    Write-Host "✅ Chatbot Response:" -ForegroundColor Green
    Write-Host "Response: $($response.response)" -ForegroundColor White
} catch {
    Write-Host "❌ Request failed: $_" -ForegroundColor Red
}

Write-Host "`n=== All Tests Completed ===" -ForegroundColor Cyan
