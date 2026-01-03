# Create test booking for user@busproject.com
$baseUrl = "http://localhost:8080/api/v1"

Write-Host "`n=== Creating Test Booking for Check-In Testing ===" -ForegroundColor Cyan

# Step 1: Login as user
Write-Host "`nStep 1: Logging in as user@busproject.com..." -ForegroundColor Yellow
$loginBody = @{
    email = "user@busproject.com"
    password = "user123"
} | ConvertTo-Json

try {
    $loginResponse = Invoke-RestMethod -Uri "$baseUrl/auth/login" -Method POST -Body $loginBody -ContentType "application/json" -SessionVariable session
    $userToken = $loginResponse.access_token
    $userId = $loginResponse.user.id
    Write-Host "Success - Login successful! User ID: $userId" -ForegroundColor Green
} catch {
    Write-Host "✗ Login failed. User might not exist." -ForegroundColor Red
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
    
    Write-Host "`nAttempting to register user..." -ForegroundColor Yellow
    $registerBody = @{
        email = "user@busproject.com"
        password = "user123"
        name = "Test User"
        phone = "0123456789"
    } | ConvertTo-Json
    
    try {
        $registerResponse = Invoke-RestMethod -Uri "$baseUrl/auth/register" -Method POST -Body $registerBody -ContentType "application/json"
        $userToken = $registerResponse.access_token
        $userId = $registerResponse.user.id
        Write-Host "Success - User registered successfully! User ID: $userId" -ForegroundColor Green
    } catch {
        Write-Host "✗ Registration failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# Step 2: Get available trips (search for tomorrow's trips since today might be empty)
Write-Host "`nStep 2: Finding available trips..." -ForegroundColor Yellow
$tomorrow = (Get-Date).AddDays(1).ToString("yyyy-MM-dd")

try {
    # Use trip search endpoint - date parameter is required
    $searchUrl = "$baseUrl/trips/search?date=$tomorrow"
    $tripsResponse = Invoke-RestMethod -Uri $searchUrl -Method GET
    $trips = $tripsResponse.data
    
    if ($trips.Count -eq 0) {
        Write-Host "Error - No trips found. Please create a trip first." -ForegroundColor Red
        exit 1
    }
    
    # Try to find a trip with available seats
    $foundTrip = $null
    foreach ($t in $trips) {
        try {
            $seatsCheck = Invoke-RestMethod -Uri "$baseUrl/trips/$($t.id)/seats" -Method GET
            $hasSeats = $seatsCheck.data | Where-Object { $_.is_bookable -eq $true } | Measure-Object | Select-Object -ExpandProperty Count
            if ($hasSeats -gt 0) {
                $foundTrip = $t
                break
            }
        } catch {
            continue
        }
    }
    
    if ($null -eq $foundTrip) {
        Write-Host "Error - All trips are fully booked. Please wait or create new trips." -ForegroundColor Red
        exit 1
    }
    
    $trip = $foundTrip
    Write-Host "Success - Found trip: $($trip.route.origin) -> $($trip.route.destination)" -ForegroundColor Green
    Write-Host "  Trip ID: $($trip.id)" -ForegroundColor Gray
    Write-Host "  Departure: $($trip.start_time)" -ForegroundColor Gray
    Write-Host "  Price: $($trip.price) VND" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to fetch trips: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 3: Get available seats for the trip
Write-Host "`nStep 3: Getting available seats..." -ForegroundColor Yellow
try {
    $seatsResponse = Invoke-RestMethod -Uri "$baseUrl/trips/$($trip.id)/seats" -Method GET
    $availableSeats = $seatsResponse.data | Where-Object { $_.is_bookable -eq $true } | Select-Object -First 2
    
    if ($availableSeats.Count -eq 0) {
        Write-Host "✗ No available seats on this trip" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "Success - Found $($availableSeats.Count) available seats" -ForegroundColor Green
    $availableSeats | ForEach-Object {
        Write-Host "  Seat: $($_.seat_number) ($($_.seat_type))" -ForegroundColor Gray
    }
} catch {
    Write-Host "✗ Failed to fetch seats: $($_.Exception.Message)" -ForegroundColor Red
    exit 1
}

# Step 4: Create booking
Write-Host "`nStep 4: Creating booking..." -ForegroundColor Yellow

$passengers = @(
    @{
        seat_id = $availableSeats[0].id
        full_name = "Test User"
        phone = "0123456789"
        email = "user@busproject.com"
    }
)

if ($availableSeats.Count -gt 1) {
    $passengers += @{
        seat_id = $availableSeats[1].id
        full_name = "Test Passenger 2"
        phone = "0987654321"
        email = "passenger2@test.com"
    }
}

$bookingBody = @{
    trip_id = $trip.id
    passengers = $passengers
} | ConvertTo-Json -Depth 10

$headers = @{
    "Authorization" = "Bearer $userToken"
    "Content-Type" = "application/json"
}

try {
    $bookingResponse = Invoke-RestMethod -Uri "$baseUrl/bookings" -Method POST -Body $bookingBody -Headers $headers
    Write-Host "Success - Booking created successfully!" -ForegroundColor Green
    Write-Host "  Booking ID: $($bookingResponse.booking.id)" -ForegroundColor Gray
    Write-Host "  Status: $($bookingResponse.booking.status)" -ForegroundColor Gray
    Write-Host "  Total Seats: $($bookingResponse.booking.total_seats)" -ForegroundColor Gray
    Write-Host "  Total Amount: $($bookingResponse.booking.total_amount) VND" -ForegroundColor Gray
} catch {
    Write-Host "✗ Failed to create booking: $($_.Exception.Message)" -ForegroundColor Red
    Write-Host "Response: $($_.ErrorDetails.Message)" -ForegroundColor Red
    exit 1
}

# Step 5: Confirm the booking (simulate payment)
Write-Host "`nStep 5: Confirming booking (simulating payment)..." -ForegroundColor Yellow

$confirmBody = @{
    payment_method = "bank_transfer"
} | ConvertTo-Json

try {
    $confirmResponse = Invoke-RestMethod -Uri "$baseUrl/bookings/$($bookingResponse.booking.id)/confirm" -Method POST -Body $confirmBody -Headers $headers
    Write-Host "Success - Booking confirmed!" -ForegroundColor Green
    Write-Host "  Status: $($confirmResponse.booking.status)" -ForegroundColor Gray
    Write-Host "  Payment Status: $($confirmResponse.booking.payment_status)" -ForegroundColor Gray
} catch {
    Write-Host "⚠ Could not confirm booking automatically. You may need to complete payment." -ForegroundColor Yellow
    Write-Host "  Error: $($_.Exception.Message)" -ForegroundColor Gray
}

Write-Host "`n=== Summary ===" -ForegroundColor Cyan
Write-Host "Success - User: user@busproject.com" -ForegroundColor Green
Write-Host "Success - Trip: $($trip.route.origin) -> $($trip.route.destination)" -ForegroundColor Green
Write-Host "Success - Departure: $($trip.departure_time)" -ForegroundColor Green
Write-Host "Success - Passengers: $($passengers.Count)" -ForegroundColor Green
Write-Host "Success - Seats: $($availableSeats[0].seat_number)" -ForegroundColor Green
if ($availableSeats.Count -gt 1) {
    Write-Host "          $($availableSeats[1].seat_number)" -ForegroundColor Green
}

Write-Host "`nYou can now test check-in in the Admin Dashboard!" -ForegroundColor Cyan
Write-Host "Go to: Trips -> Manage & Check-In -> Select the trip" -ForegroundColor White
