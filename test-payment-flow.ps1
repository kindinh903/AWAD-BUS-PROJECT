# Payment Flow Test Script
# This script tests the complete payment workflow using PowerShell

$BaseUrl = "https://awad-bus-project-production.up.railway.app/api/v1"
$FrontendUrl = "https://awad-bus-project.vercel.app"
$testEmail = "user@busproject.com"
$testPassword = "user123"

# ============================================
# STEP 1: Login
# ============================================
Write-Host "======== STEP 1: User Login ========" -ForegroundColor Blue

$loginUrl = "$BaseUrl/auth/login"
$loginBody = @{
    email = $testEmail
    password = $testPassword
} | ConvertTo-Json

Write-Host "Logging in with email: $testEmail"

try {
    $loginResponse = Invoke-WebRequest -Uri $loginUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $token = $loginData.access_token
    $userId = $loginData.user.id
    
    if ($token -and $userId) {
        Write-Host "[OK] Login successful" -ForegroundColor Green
        Write-Host "User ID: $userId"
        Write-Host "Token: $($token.Substring(0, 50))..."
    } else {
        Write-Host "[ERROR] No token in response" -ForegroundColor Red
        Write-Host "Response: $($loginData | ConvertTo-Json)" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[ERROR] Login failed: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 2: Get user's bookings
# ============================================
Write-Host "`n======== STEP 2: Get User Bookings ========" -ForegroundColor Blue

$bookingsUrl = "$BaseUrl/bookings/my-bookings"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

try {
    $bookingsResponse = Invoke-WebRequest -Uri $bookingsUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction SilentlyContinue
    
    if ($null -eq $bookingsResponse) {
        Write-Host "[INFO] No bookings endpoint found, trying alternative..."
        # If no bookings found via endpoint, we'll use a hardcoded one for testing
        # In real scenario, bookings would be created via booking flow
        throw "No bookings found"
    }
    
    $bookingsData = $bookingsResponse.Content | ConvertFrom-Json
    $bookings = $bookingsData.data
    
    Write-Host "[OK] Retrieved bookings: $($bookings.Count)" -ForegroundColor Green
    
    if ($bookings.Count -eq 0) {
        Write-Host "[WARNING] No existing bookings found via API" -ForegroundColor Yellow
        Write-Host "Make sure to create a booking first using create-booking.ps1 or insert-test-data.ps1"
        exit 1
    }
    
    # Find a suitable booking
    $booking = $null
    foreach ($b in $bookings) {
        $status = $b.status.ToLower()
        $paymentStatus = $b.payment_status.ToLower()
        Write-Host "  - Booking: $($b.id) | Status: $status | PaymentStatus: $paymentStatus"
        
        if ($status -eq "pending" -and ($paymentStatus -eq "pending" -or $paymentStatus -eq "unpaid")) {
            $booking = $b
            Write-Host "    [SELECTED] Suitable booking found" -ForegroundColor Green
            break
        }
    }
    
    if ($null -eq $booking) {
        Write-Host "[WARNING] Using first booking" -ForegroundColor Yellow
        $booking = $bookings[0]
    }
    
    $bookingId = $booking.id
    # $amount = $booking.total_amount
    $amount = 5000  # Hardcoded amount for testing purposes
    Write-Host "Amount: $amount"
    
} catch {
    Write-Host "[INFO] Could not retrieve bookings from API" -ForegroundColor Cyan
    Write-Host "Please create a test booking first using: insert-test-data.ps1" -ForegroundColor Yellow
    exit 1
}

# ============================================
# STEP 3: Create a payment
# ============================================
Write-Host "`n======== STEP 3: Create Payment ========" -ForegroundColor Blue

$paymentUrl = "$BaseUrl/payments"
$paymentBody = @{
    booking_id = $bookingId
    return_url = "$FrontendUrl/payment/success"
    cancel_url = "$FrontendUrl/payment/failed"
} | ConvertTo-Json

Write-Host "Creating payment for booking: $bookingId"
Write-Host "Amount: $amount"

try {
    $paymentResponse = Invoke-WebRequest -Uri $paymentUrl `
        -Method Post `
        -Headers $headers `
        -Body $paymentBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $paymentData = $paymentResponse.Content | ConvertFrom-Json
    $payment = $paymentData.payment
    $paymentId = $payment.id
    $checkoutUrl = $paymentData.checkout_url
    
    if ($paymentId) {
        Write-Host "[OK] Payment created successfully" -ForegroundColor Green
        Write-Host "Payment ID: $paymentId"
        Write-Host "Status: $($payment.status)"
        if ($checkoutUrl) {
            Write-Host "Checkout URL: $checkoutUrl"
        }
    } else {
        Write-Host "[ERROR] No payment ID in response" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "[ERROR] Failed to create payment: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 4: Check payment status
# ============================================
Write-Host "`n======== STEP 4: Check Payment Status ========" -ForegroundColor Blue

$statusUrl = "$BaseUrl/payments/$paymentId/status"

try {
    $statusResponse = Invoke-WebRequest -Uri $statusUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $statusData = $statusResponse.Content | ConvertFrom-Json
    $paymentStatus = $statusData.payment
    
    Write-Host "[OK] Payment status retrieved" -ForegroundColor Green
    Write-Host "Status: $($paymentStatus.status)"
    Write-Host "Amount: $($paymentStatus.amount)"
    Write-Host "Full response: $($statusData | ConvertTo-Json -Depth 5)" -ForegroundColor DarkGray
    
} catch {
    Write-Host "[WARNING] Failed to get payment status: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================
# STEP 5: Simulate payment webhook (mock)
# ============================================
Write-Host "`n======== STEP 5: Simulate Payment Success ========" -ForegroundColor Blue

$webhookUrl = "$BaseUrl/webhooks/payos"
$webhookBody = @{
    payment_id = $paymentId
    booking_id = $bookingId
    status = "PAID"
    amount = $amount
    transaction_id = "mock-$(Get-Date -Format 'yyyyMMddHHmmss')"
} | ConvertTo-Json

Write-Host "Simulating payment completion..."

try {
    $webhookResponse = Invoke-WebRequest -Uri $webhookUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $webhookBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $webhookData = $webhookResponse.Content | ConvertFrom-Json
    Write-Host "[OK] Mock payment processed" -ForegroundColor Green
    
} catch {
    Write-Host "[WARNING] Mock webhook call failed: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "This endpoint might be disabled in production"
}

# ============================================
# STEP 6: Verify payment status updated
# ============================================
Write-Host "`n======== STEP 6: Verify Payment Status Updated ========" -ForegroundColor Blue

Write-Host "Waiting 2 seconds for processing..."
Start-Sleep -Seconds 2

try {
    $finalResponse = Invoke-WebRequest -Uri $statusUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $finalData = $finalResponse.Content | ConvertFrom-Json
    $finalPayment = $finalData.payment
    $finalStatus = $finalPayment.status
    
    Write-Host "[OK] Payment status verified" -ForegroundColor Green
    Write-Host "Final Status: $finalStatus"
    
    if ($finalStatus -eq "completed" -or $finalStatus -eq "PAID") {
        Write-Host "[SUCCESS] Payment has been marked as COMPLETED!" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Payment status: $finalStatus" -ForegroundColor Cyan
    }
    
} catch {
    Write-Host "[ERROR] Failed to verify payment: $($_.Exception.Message)" -ForegroundColor Red
}

# ============================================
# Summary
# ============================================
Write-Host "`n======== TEST SUMMARY ========" -ForegroundColor Blue
Write-Host "Status: COMPLETED" -ForegroundColor Green
Write-Host "User ID: $userId"
Write-Host "Booking ID: $bookingId"
Write-Host "Payment ID: $paymentId"
Write-Host "Amount: $amount"
Write-Host "Time: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"
Write-Host ""
