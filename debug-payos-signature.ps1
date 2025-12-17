# Test PayOS Webhook with Real Signature Verification
# This script helps debug the signature verification issue

param(
    [string]$checksumKey = "c68e8c0f0f1a4479c503f9a642ba8854abcc69aa780e1c0708e1e9d11d94d3ff",
    [string]$orderCode = "1765985439"
)

Write-Host "=== PayOS Webhook Debug Test ===" -ForegroundColor Cyan
Write-Host ""

# PayOS webhook data structure (from your log)
$webhookData = @{
    accountNumber = "0334755751"
    amount = 5000
    code = "00"
    counterAccountBankId = "970422"
    counterAccountBankName = ""
    counterAccountName = $null
    counterAccountNumber = "2281072020614"
    currency = "VND"
    desc = "success"
    description = "Pay"
    orderCode = [int64]$orderCode  # Important: must be integer
    paymentLinkId = "5dca4ba029f44f78a8409a1054fb8bd7"
    reference = "FT25352694321405"
    transactionDateTime = "2025-12-17 22:32:21"
    virtualAccountName = ""
    virtualAccountNumber = ""
}

Write-Host "Step 1: Create signature string" -ForegroundColor Yellow
Write-Host ""

# Sort keys alphabetically
$sortedKeys = $webhookData.Keys | Sort-Object
Write-Host "Sorted Keys: $($sortedKeys -join ', ')" -ForegroundColor Green
Write-Host ""

# Build signature data string
$signatureParts = @()
foreach ($key in $sortedKeys) {
    $value = $webhookData[$key]
    
    # Format value properly
    if ($value -eq $null) {
        $valueStr = "null"
    } elseif ($value -is [int64]) {
        $valueStr = $value.ToString()
    } else {
        $valueStr = [string]$value
    }
    
    $signatureParts += "$key=$valueStr"
}

$signatureString = $signatureParts -join "&"
Write-Host "Signature String:" -ForegroundColor Green
Write-Host $signatureString
Write-Host ""

Write-Host "Step 2: Calculate HMAC-SHA256" -ForegroundColor Yellow
Write-Host ""

# Calculate HMAC-SHA256
$bytes = [System.Text.Encoding]::UTF8.GetBytes($signatureString)
$key = [System.Text.Encoding]::UTF8.GetBytes($checksumKey)
$hmac = New-Object System.Security.Cryptography.HMACSHA256($key)
$hash = $hmac.ComputeHash($bytes)
$calculatedSignature = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Calculated Signature:" -ForegroundColor Green
Write-Host $calculatedSignature
Write-Host ""

Write-Host "Received Signature:  " -ForegroundColor Yellow
Write-Host "596023ddc2554202de73dff55850e77bced3e326c0e726c42332b52c44d905db"
Write-Host ""

Write-Host "Match: " -ForegroundColor $(if ($calculatedSignature -eq "596023ddc2554202de73dff55850e77bced3e326c0e726c42332b52c44d905db") { "Green" } else { "Red" })

if ($calculatedSignature -ne "596023ddc2554202de73dff55850e77bced3e326c0e726c42332b52c44d905db") {
    Write-Host "SIGNATURE MISMATCH - Need to debug further" -ForegroundColor Red
} else {
    Write-Host "SIGNATURE MATCH - Verification successful!" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Debug Complete ===" -ForegroundColor Cyan
