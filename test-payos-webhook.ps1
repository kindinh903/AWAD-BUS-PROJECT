# Test PayOS Webhook
# Replace these values with actual data from a real payment

$backendUrl = "http://localhost:8080"  # Or your deployed URL
$orderCode = "1234567890"  # Replace with actual order code from payment

$webhookPayload = @{
    code = "00"
    desc = "Success"
    success = $true
    data = @{
        orderCode = $orderCode
        status = "PAID"
        amount = 10000
    }
    signature = "test-signature"
} | ConvertTo-Json

Write-Host "Testing PayOS webhook..." -ForegroundColor Yellow
Write-Host "URL: $backendUrl/api/v1/webhooks/payos" -ForegroundColor Cyan
Write-Host "Order Code: $orderCode" -ForegroundColor Cyan
Write-Host ""

try {
    $response = Invoke-RestMethod -Uri "$backendUrl/api/v1/webhooks/payos" `
        -Method Post `
        -Body $webhookPayload `
        -ContentType "application/json" `
        -Headers @{
            "X-Signature" = "test-signature"
        }
    
    Write-Host "✓ Webhook received successfully!" -ForegroundColor Green
    Write-Host "Response: $($response | ConvertTo-Json)" -ForegroundColor Green
} catch {
    Write-Host "✗ Webhook failed!" -ForegroundColor Red
    Write-Host "Error: $_" -ForegroundColor Red
}
