# Script to create a booking for payment testing
# This script should be run BEFORE test-payment-flow.ps1
# Usage: powershell -ExecutionPolicy Bypass -File create-booking-for-payment.ps1

$BaseUrl = "https://awad-bus-project-production-aecc.up.railway.app/api/v1"
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
# STEP 2: Search for available trips
# ============================================
Write-Host "`n======== STEP 2: Search for Available Trips ========" -ForegroundColor Blue

$today = (Get-Date).ToString("yyyy-MM-dd")
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")

# Try searching for tomorrow first (when we just created the trip)
$searchUrl = "$BaseUrl/trips/search?origin=Ho%20Chi%20Minh%20City&destination=Da%20Nang&date=$tomorrow&limit=10"
$headers = @{
    "Authorization" = "Bearer $token"
    "Content-Type" = "application/json"
}

Write-Host "Searching for trips from Ho Chi Minh City to Da Nang on $tomorrow"

try {
    $tripsResponse = Invoke-WebRequest -Uri $searchUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $tripsData = $tripsResponse.Content | ConvertFrom-Json
    $trips = $tripsData.data
    
    if ($null -eq $trips -or $trips.Count -eq 0) {
        Write-Host "[WARNING] No trips found for tomorrow" -ForegroundColor Yellow
        Write-Host "Trying to search for today ($today)..."
        
        $searchUrl = "$BaseUrl/trips/search?origin=Ho%20Chi%20Minh%20City&destination=Da%20Nang&date=$today&limit=10"
        $tripsResponse = Invoke-WebRequest -Uri $searchUrl `
            -Method Get `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop
        
        $tripsData = $tripsResponse.Content | ConvertFrom-Json
        $trips = $tripsData.data
        
        if ($null -eq $trips -or $trips.Count -eq 0) {
            Write-Host "[ERROR] No trips found for either date" -ForegroundColor Red
            Write-Host "Please ensure trips exist in the system" -ForegroundColor Yellow
            exit 1
        }
    }
    
    Write-Host "[OK] Found $($trips.Count) available trip(s)" -ForegroundColor Green
    
    # Display trip options
    for ($i = 0; $i -lt [Math]::Min($trips.Count, 5); $i++) {
        $trip = $trips[$i]
        Write-Host "  [$i] Trip ID: $($trip.id)" -ForegroundColor Cyan
        Write-Host "      Route: $($trip.route.origin) -> $($trip.route.destination)"
        Write-Host "      Departure: $($trip.departure_time) | Duration: $($trip.duration)"
        Write-Host "      Price: $($trip.price) | Available Seats: $($trip.available_seats_count)"
        Write-Host ""
    }
    
    # Select the first trip with available seats
    $trip = $null
    foreach ($t in $trips) {
        # First try to check if we can get seats from this trip
        $availableSeatsCount = 0
        
        if ($null -ne $t.available_seats_count) {
            $availableSeatsCount = $t.available_seats_count
        }
        
        # If seat count is not in the trip object, try to fetch seats for this trip
        if ($availableSeatsCount -le 1) {
            $testSeatsUrl = "$BaseUrl/trips/$($t.id)/seats"
            try {
                $testSeatsResponse = Invoke-WebRequest -Uri $testSeatsUrl `
                    -Method Get `
                    -Headers $headers `
                    -UseBasicParsing `
                    -ErrorAction SilentlyContinue
                
                if ($testSeatsResponse) {
                    $testSeatsData = $testSeatsResponse.Content | ConvertFrom-Json
                    if ($null -ne $testSeatsData.data) {
                        $availableSeatsCount = ($testSeatsData.data | Measure-Object).Count
                    }
                }
            } catch {}
        }
        
        if ($availableSeatsCount -gt 1) {
            $trip = $t
            Write-Host "    [SELECTED] Trip ID $($t.id) has $availableSeatsCount available seats" -ForegroundColor Green
            break
        }
    }
    
    if ($null -eq $trip) {
        # If no trip with explicit seat count, just use the first one
        # The system might still have seats but not reporting the count
        Write-Host "[WARNING] No trips reported available seat counts" -ForegroundColor Yellow
        Write-Host "Using first trip anyway - will check seats in next step" -ForegroundColor Cyan
        $trip = $trips[0]
    }
    
    $tripId = $trip.id
    Write-Host "[SELECTED] Trip ID: $tripId" -ForegroundColor Green
    Write-Host "Available Seats: $($trip.available_seats_count)" -ForegroundColor Green
    
} catch {
    Write-Host "[ERROR] Failed to search trips: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "URL: $searchUrl" -ForegroundColor DarkGray
    exit 1
}

# ============================================
# STEP 3: Get available seats
# ============================================
Write-Host "`n======== STEP 3: Get Available Seats ========" -ForegroundColor Blue

$seatsUrl = "$BaseUrl/trips/$tripId/seats"

Write-Host "Fetching seats for trip: $tripId"

try {
    $seatsResponse = Invoke-WebRequest -Uri $seatsUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $seatsData = $seatsResponse.Content | ConvertFrom-Json
    
    # Handle different response formats
    $availableSeats = $null
    
    # Try different response formats
    if ($null -ne $seatsData.data -and $seatsData.data -is [System.Object[]]) {
        $availableSeats = $seatsData.data
    } elseif ($null -ne $seatsData.available_seats) {
        $availableSeats = $seatsData.available_seats
    } elseif ($null -ne $seatsData.seats) {
        $availableSeats = $seatsData.seats | Where-Object { $_.is_available -eq $true -or $_.status -eq "available" }
    } elseif ($seatsData -is [System.Object[]]) {
        $availableSeats = $seatsData
    }
    
    if ($null -eq $availableSeats -or $availableSeats.Count -eq 0) {
        Write-Host "[ERROR] No available seats found" -ForegroundColor Red
        Write-Host "Response: $($seatsData | ConvertTo-Json -Depth 3)" -ForegroundColor DarkGray
        exit 1
    }
    
    Write-Host "[OK] Found $($availableSeats.Count) available seat(s)" -ForegroundColor Green
    
    # Select seats (minimum 2 for testing)
    $selectedSeats = @()
    $selectedSeatIds = @()
    
    for ($i = 0; $i -lt [Math]::Min(2, $availableSeats.Count); $i++) {
        $seat = $availableSeats[$i]
        $seatId = if ($null -ne $seat.id) { $seat.id } else { $seat }
        $selectedSeats += $seat
        $selectedSeatIds += $seatId
        Write-Host "  - Selected Seat $i`: $($seat.seat_number) (ID: $seatId)"
    }
    
    Write-Host "[OK] Selected $($selectedSeatIds.Count) seats" -ForegroundColor Green
    
} catch {
    Write-Host "[ERROR] Failed to get seats: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# ============================================
# STEP 4: Create booking
# ============================================
Write-Host "`n======== STEP 4: Create Booking ========" -ForegroundColor Blue

$bookingUrl = "$BaseUrl/bookings"

# Prepare passenger data
$passengers = @()
$passengerNames = @("John Doe", "Jane Smith", "Mike Johnson", "Sarah Williams")
$passengerEmails = @("john@busproject.com", "jane@busproject.com", "mike@busproject.com", "sarah@busproject.com")
$passengerPhones = @("0901234567", "0902345678", "0903456789", "0904567890")

for ($i = 0; $i -lt $selectedSeatIds.Count; $i++) {
    $passenger = @{
        seat_id = $selectedSeatIds[$i]
        full_name = $passengerNames[$i]
        email = $passengerEmails[$i]
        phone = $passengerPhones[$i]
        id_number = "123456789$i"
    }
    $passengers += $passenger
}

$bookingBody = @{
    trip_id = $tripId
    selected_seats = @($selectedSeatIds)
    passengers = @($passengers)
} | ConvertTo-Json -Depth 5

Write-Host "Creating booking with $($selectedSeatIds.Count) seat(s)..."
Write-Host "Request body: $bookingBody" -ForegroundColor DarkGray

try {
    $bookingResponse = Invoke-WebRequest -Uri $bookingUrl `
        -Method Post `
        -Headers $headers `
        -Body $bookingBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $bookingData = $bookingResponse.Content | ConvertFrom-Json
    
    # Handle different response formats
    $booking = if ($null -ne $bookingData.data.booking) { 
        $bookingData.data.booking 
    } elseif ($null -ne $bookingData.booking) { 
        $bookingData.booking 
    } elseif ($null -ne $bookingData.data) { 
        $bookingData.data 
    } else { 
        $bookingData 
    }
    
    $bookingId = $booking.id
    $totalAmount = $booking.total_amount
    $bookingStatus = $booking.status
    $paymentStatus = $booking.payment_status
    
    if ($bookingId) {
        Write-Host "[OK] Booking created successfully!" -ForegroundColor Green
        Write-Host "Booking ID: $bookingId" -ForegroundColor Cyan
        Write-Host "Status: $bookingStatus"
        Write-Host "Payment Status: $paymentStatus"
        Write-Host "Total Amount: $totalAmount"
        Write-Host "Seats: $($selectedSeatIds -join ', ')"
    } else {
        Write-Host "[ERROR] No booking ID in response" -ForegroundColor Red
        Write-Host "Response: $($bookingData | ConvertTo-Json -Depth 3)" -ForegroundColor Red
        exit 1
    }
    
} catch {
    Write-Host "[ERROR] Failed to create booking: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Status Code: $($_.Exception.Response.StatusCode)" -ForegroundColor Red
    
    # Try to get error details
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Details: $errorContent" -ForegroundColor DarkGray
    } catch {}
    
    exit 1
}

# ============================================
# STEP 5: Verify booking
# ============================================
Write-Host "`n======== STEP 5: Verify Booking ========" -ForegroundColor Blue

$verifyUrl = "$BaseUrl/bookings/$bookingId"

try {
    $verifyResponse = Invoke-WebRequest -Uri $verifyUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $verifyData = $verifyResponse.Content | ConvertFrom-Json
    $verifiedBooking = if ($null -ne $verifyData.booking) {
        $verifyData.booking
    } else {
        $verifyData.data
    }
    
    Write-Host "[OK] Booking verified" -ForegroundColor Green
    Write-Host "ID: $($verifiedBooking.id)"
    Write-Host "Status: $($verifiedBooking.status)"
    Write-Host "Payment Status: $($verifiedBooking.payment_status)"
    Write-Host "Amount: $($verifiedBooking.total_amount)"
    
} catch {
    Write-Host "[WARNING] Could not verify booking: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================
# Summary
# ============================================
Write-Host "`n======== BOOKING CREATED SUCCESSFULLY ========" -ForegroundColor Green
Write-Host ""
Write-Host "Booking Details:" -ForegroundColor Cyan
Write-Host "  - Booking ID: $bookingId"
Write-Host "  - Trip ID: $tripId"
Write-Host "  - User ID: $userId"
Write-Host "  - Total Amount: $totalAmount"
Write-Host "  - Seats: $($selectedSeatIds -join ', ')"
Write-Host "  - Status: $bookingStatus"
Write-Host "  - Payment Status: $paymentStatus"
Write-Host ""
Write-Host "Next Step:" -ForegroundColor Cyan
Write-Host "  Run: powershell -ExecutionPolicy Bypass -File test-payment-flow.ps1"
Write-Host ""
Write-Host "This will test the payment flow for the booking you just created."
Write-Host "=========================================="
