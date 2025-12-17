# Advanced PayOS Signature Debug
# This script reverse-engineers the PayOS signature calculation

param(
    [string]$checksumKey = "c68e8c0f0f1a4479c503f9a642ba8854abcc69aa780e1c0708e1e9d11d94d3ff",
    [string]$receivedSignature = "6d303b21e4a3b1592f61dcead81478fbda29a18a4a17d9f8fdb24f6f12b7c986"
)

Write-Host "=== PayOS Signature Reverse Engineering ===" -ForegroundColor Cyan
Write-Host ""

# Data from the webhook (from the 'data' object only)
$data = @{
    accountNumber = "0334755751"
    amount = 5000
    description = "Pay"
    reference = "FT25352823340536"
    transactionDateTime = "2025-12-17 22:38:58"
    virtualAccountNumber = ""
    counterAccountBankId = "970422"
    counterAccountBankName = ""
    counterAccountName = $null
    counterAccountNumber = "2281072020614"
    virtualAccountName = ""
    currency = "VND"
    orderCode = 1765985867
    paymentLinkId = "b975be6542674da3a751707d04819499"
    code = "00"
    desc = "success"
}

Write-Host "Data Object Keys:" -ForegroundColor Yellow
$data.Keys | Sort-Object | ForEach-Object { Write-Host "  $_" }
Write-Host ""

Write-Host "Approach 1: Standard sorting (current code)" -ForegroundColor Yellow
Write-Host "==========================================" -ForegroundColor Yellow

$sortedKeys = $data.Keys | Sort-Object
$parts = @()

foreach ($key in $sortedKeys) {
    $value = $data[$key]
    
    if ($value -eq $null) {
        $valueStr = "null"
    } elseif ($value -is [int64] -or $value -is [int]) {
        $valueStr = $value.ToString()
    } else {
        $valueStr = [string]$value
    }
    
    $parts += "$key=$valueStr"
    Write-Host "  $key=$valueStr"
}

$signatureString1 = $parts -join "&"
Write-Host ""
Write-Host "Signature String:" -ForegroundColor Green
Write-Host $signatureString1
Write-Host ""

$bytes = [System.Text.Encoding]::UTF8.GetBytes($signatureString1)
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($checksumKey)
$hmac = New-Object System.Security.Cryptography.HMACSHA256(,$keyBytes)
$hash = $hmac.ComputeHash($bytes)
$calculated1 = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Calculated: $calculated1" -ForegroundColor Green
Write-Host "Received:   $receivedSignature" -ForegroundColor Yellow
Write-Host "Match: $(if ($calculated1 -eq $receivedSignature) { 'YES ✓' } else { 'NO ✗' })" -ForegroundColor $(if ($calculated1 -eq $receivedSignature) { "Green" } else { "Red" })
Write-Host ""

Write-Host "Approach 2: With null handling as empty string" -ForegroundColor Yellow
Write-Host "==============================================" -ForegroundColor Yellow

$parts2 = @()
foreach ($key in $sortedKeys) {
    $value = $data[$key]
    
    if ($value -eq $null) {
        $valueStr = ""  # Use empty string instead of "null"
    } elseif ($value -is [int64] -or $value -is [int]) {
        $valueStr = $value.ToString()
    } else {
        $valueStr = [string]$value
    }
    
    $parts2 += "$key=$valueStr"
}

$signatureString2 = $parts2 -join "&"
Write-Host "Signature String:" -ForegroundColor Green
Write-Host $signatureString2
Write-Host ""

$bytes = [System.Text.Encoding]::UTF8.GetBytes($signatureString2)
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($checksumKey)
$hmac = New-Object System.Security.Cryptography.HMACSHA256(,$keyBytes)
$hash = $hmac.ComputeHash($bytes)
$calculated2 = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Calculated: $calculated2" -ForegroundColor Green
Write-Host "Match: $(if ($calculated2 -eq $receivedSignature) { 'YES ✓' } else { 'NO ✗' })" -ForegroundColor $(if ($calculated2 -eq $receivedSignature) { "Green" } else { "Red" })
Write-Host ""

Write-Host "Approach 3: Excluding certain fields" -ForegroundColor Yellow
Write-Host "====================================" -ForegroundColor Yellow

$excludeFields = @("code", "desc")  # Don't include code/desc in signature
$parts3 = @()
foreach ($key in ($sortedKeys | Where-Object { $_ -notin $excludeFields })) {
    $value = $data[$key]
    
    if ($value -eq $null) {
        $valueStr = ""
    } elseif ($value -is [int64] -or $value -is [int]) {
        $valueStr = $value.ToString()
    } else {
        $valueStr = [string]$value
    }
    
    $parts3 += "$key=$valueStr"
}

$signatureString3 = $parts3 -join "&"
Write-Host "Signature String:" -ForegroundColor Green
Write-Host $signatureString3
Write-Host ""

$bytes = [System.Text.Encoding]::UTF8.GetBytes($signatureString3)
$keyBytes = [System.Text.Encoding]::UTF8.GetBytes($checksumKey)
$hmac = New-Object System.Security.Cryptography.HMACSHA256(,$keyBytes)
$hash = $hmac.ComputeHash($bytes)
$calculated3 = ($hash | ForEach-Object { $_.ToString("x2") }) -join ""

Write-Host "Calculated: $calculated3" -ForegroundColor Green
Write-Host "Match: $(if ($calculated3 -eq $receivedSignature) { 'YES ✓' } else { 'NO ✗' })" -ForegroundColor $(if ($calculated3 -eq $receivedSignature) { "Green" } else { "Red" })
Write-Host ""

Write-Host "=== Analysis Complete ===" -ForegroundColor Cyan
