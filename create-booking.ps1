# Quick script to create a booking for testing payment flow
$BaseUrl = "http://localhost:8080/api/v1"

# Login first
$loginUrl = "$BaseUrl/auth/login"
$loginBody = @{
    email = "user@busproject.com"
    password = "user123"
} | ConvertTo-Json

Write-Host "Step 1: Login..."
$loginResponse = Invoke-WebRequest -Uri $loginUrl `
    -Method Post `
    -ContentType "application/json" `
    -Body $loginBody `
    -UseBasicParsing

$loginData = $loginResponse.Content | ConvertFrom-Json
$token = $loginData.access_token
Write-Host "[OK] Logged in"

# Get available trips
Write-Host "Step 2: Searching for available trips..."
$today = (Get-Date).ToString("yyyy-MM-dd")
$searchUrl = "$BaseUrl/trips/search?origin=Ho+Chi+Minh+City&destination=Da+Nang&date=$today&limit=5"
$headers = @{
    "Authorization" = "Bearer $token"
}

$tripsResponse = Invoke-WebRequest -Uri $searchUrl `
    -Method Get `
    -Headers $headers `
    -UseBasicParsing `
    -ErrorAction SilentlyContinue

if ($null -eq $tripsResponse) {
    Write-Host "[ERROR] Request failed"
    exit 1
}

$tripsData = $tripsResponse.Content | ConvertFrom-Json
Write-Host "Response: $($tripsData | ConvertTo-Json)"
$trips = $tripsData.data

if ($trips.Count -eq 0) {
    Write-Host "[ERROR] No trips found"
    exit 1
}

$trip = $trips[0]
Write-Host "[OK] Found trip: $($trip.id)"
Write-Host "     Origin: $($trip.route.origin) -> Destination: $($trip.route.destination)"
Write-Host "     Departure: $($trip.departure_time)"

# Get available seats
Write-Host "Step 3: Getting available seats..."
$seatsUrl = "$BaseUrl/trips/$($trip.id)/seats"
$seatsResponse = Invoke-WebRequest -Uri $seatsUrl `
    -Method Get `
    -Headers $headers `
    -UseBasicParsing

$seatsData = $seatsResponse.Content | ConvertFrom-Json
$availableSeats = $seatsData.available_seats | Where-Object { $_.is_available -eq $true }

if ($availableSeats.Count -eq 0) {
    Write-Host "[ERROR] No available seats"
    exit 1
}

# Take first 2 seats
$selectedSeats = @($availableSeats[0].id, $availableSeats[1].id)
Write-Host "[OK] Selected $($selectedSeats.Count) seats: $($selectedSeats -join ', ')"

# Create booking
Write-Host "Step 4: Creating booking..."
$bookingUrl = "$BaseUrl/bookings"
$bookingBody = @{
    trip_id = $trip.id
    selected_seats = @($selectedSeats)
    passengers = @(
        @{
            seat_id = $selectedSeats[0]
            full_name = "John Doe"
            email = "john@example.com"
            phone = "0987654321"
            id_number = "123456789"
        },
        @{
            seat_id = $selectedSeats[1]
            full_name = "Jane Smith"
            email = "jane@example.com"
            phone = "0987654322"
            id_number = "987654321"
        }
    )
} | ConvertTo-Json -Depth 5

$bookingResponse = Invoke-WebRequest -Uri $bookingUrl `
    -Method Post `
    -Headers $headers `
    -Body $bookingBody `
    -ContentType "application/json" `
    -UseBasicParsing

$bookingData = $bookingResponse.Content | ConvertFrom-Json
$bookingId = $bookingData.booking.id
$totalPrice = $bookingData.booking.total_price

Write-Host "[OK] Booking created!"
Write-Host "     Booking ID: $bookingId"
Write-Host "     Total Price: $totalPrice"

Write-Host ""
Write-Host "=========================================="
Write-Host "Now you can test payment flow with:"
Write-Host "  Booking ID: $bookingId"
Write-Host "  Amount: $totalPrice"
Write-Host "=========================================="
