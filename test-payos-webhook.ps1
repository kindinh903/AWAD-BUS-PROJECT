# Test PayOS Webhook Integration
# This script simulates PayOS sending webhook callbacks to test the implementation

param(
    [string]$baseUrl = "http://localhost:8080",
    [string]$orderCode = "1734438000",  # Unix timestamp as order code
    [string]$status = "PAID",  # PAID, FAILED, CANCELLED, EXPIRED
    [bool]$useSignature = $false  # Set to true to include signature verification
)

Write-Host "=== PayOS Webhook Test ===" -ForegroundColor Cyan
Write-Host "Base URL: $baseUrl"
Write-Host "Order Code: $orderCode"
Write-Host "Status: $status"
Write-Host ""

# 1. Create webhook payload
$webhookPayload = @{
    code = "00"
    desc = "Success"
    success = $status -eq "PAID"
    data = @{
        orderCode = $orderCode
        status = $status
        amount = 500000
        accountNumber = "0123456789"
        reference = "ABC123"
        transactionDateTime = (Get-Date -Format "yyyy-MM-dd HH:mm:ss")
    }
    signature = ""  # Will be set if needed
} | ConvertTo-Json

Write-Host "Webhook Payload:" -ForegroundColor Yellow
Write-Host $webhookPayload
Write-Host ""

# 2. Send webhook to endpoint
$webhookUrl = "$baseUrl/api/v1/webhooks/payos"

Write-Host "Sending webhook to: $webhookUrl" -ForegroundColor Yellow

try {
    $response = Invoke-WebRequest `
        -Uri $webhookUrl `
        -Method POST `
        -Headers @{
            "Content-Type" = "application/json"
            "X-Signature" = ""  # PayOS would send signature here
        } `
        -Body $webhookPayload `
        -ErrorAction Continue

    Write-Host "Response Status: $($response.StatusCode)" -ForegroundColor Green
    Write-Host "Response:" -ForegroundColor Green
    Write-Host ($response.Content | ConvertFrom-Json | ConvertTo-Json -Depth 10)
}
catch {
    Write-Host "Error sending webhook: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response:" -ForegroundColor Yellow
    Write-Host $_.Exception.Response.Content
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
