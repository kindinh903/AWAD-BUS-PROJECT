# Script to insert test data directly into database for payment testing
$tripId = "$(New-Guid)"
$routeId = "$(New-Guid)"  
$busId = "$(New-Guid)"
$userId = "e1d057fe-2a52-4db4-9f9c-f0bb6e2d2139"  # user@busproject.com
$bookingId = "$(New-Guid)"

$futureDate = (Get-Date).AddDays(5)
$startTime = $futureDate.ToString("yyyy-MM-dd HH:mm:ss")

Write-Host "Creating test data for payment testing..."
Write-Host "Trip ID: $tripId"
Write-Host "Booking ID: $bookingId"

# Get first existing route and bus
$routeSql = @"
SELECT id FROM routes LIMIT 1;
"@

$busSql = @"
SELECT id FROM buses LIMIT 1;
"@

$existingRoute = docker exec -i bus_auth_postgres psql -U postgres -d bus_booking -t -c $routeSql
$existingBus = docker exec -i bus_auth_postgres  psql -U postgres -d bus_booking -t -c $busSql

$routeId = $existingRoute.Trim() -split '\s+' | Select-Object -First 1
$busId = $existingBus.Trim() -split '\s+' | Select-Object -First 1

Write-Host "Using existing Route ID: $routeId"
Write-Host "Using existing Bus ID: $busId"

if ([string]::IsNullOrEmpty($routeId) -or [string]::IsNullOrEmpty($busId)) {
    Write-Host "ERROR: Could not find route or bus"
    exit 1
}

# Create trip
$tripSql = "INSERT INTO trips (id, route_id, bus_id, start_time, end_time, price, status, created_at, updated_at) VALUES ('$tripId', '$routeId', '$busId', '$startTime', '$(($futureDate).AddHours(12).ToString("yyyy-MM-dd HH:mm:ss"))', 5000.00, 'scheduled', NOW(), NOW());"

Write-Host "Inserting trip..."
docker exec -i bus_auth_postgres psql -U postgres -d bus_booking -c $tripSql

# Create booking
$bookingSql = "INSERT INTO bookings (id, user_id, trip_id, status, payment_status, total_amount, total_seats, booking_reference, contact_email, contact_name, contact_phone, created_at, updated_at) VALUES ('$bookingId', '$userId', '$tripId', 'pending', 'pending', 350000.00, 2, 'BUS$(Get-Date -Format "yyyyMMddHHmmss")', 'user@busproject.com', 'John Doe', '+84907654321', NOW(), NOW());"

Write-Host "Inserting booking..."
docker exec -i bus_auth_postgres psql -U postgres -d bus_booking -c $bookingSql

Write-Host ""
Write-Host "=========================================="
Write-Host "Test data created successfully!"
Write-Host "=========================================="
Write-Host "Booking ID: $bookingId"
Write-Host "Trip ID: $tripId"
Write-Host "Amount: 5000.00"
Write-Host ""
Write-Host "Now run: powershell -ExecutionPolicy Bypass -File test-payment-flow.ps1"
Write-Host "=========================================="
