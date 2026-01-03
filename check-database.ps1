# Check and verify booking/tickets in database for check-in testing
Write-Host "`n=== Checking Database for Booking Data ===" -ForegroundColor Cyan

# Database connection info (adjust if needed)
$dbHost = "localhost"
$dbPort = "5432"
$dbName = "busdb"
$dbUser = "postgres"
$dbPassword = "postgres"

# Trip ID from our test booking
$tripId = "86efbe3a-85af-46ec-ae4e-6cde86411241"
$userId = "3a791803-b80c-49ef-8039-1de1e23ad1ec"

Write-Host "`nConnecting to PostgreSQL database..." -ForegroundColor Yellow

# Check if psql is available
try {
    $psqlVersion = psql --version 2>&1
    Write-Host "Using: $psqlVersion" -ForegroundColor Gray
} catch {
    Write-Host "Error - psql is not installed or not in PATH" -ForegroundColor Red
    Write-Host "Please install PostgreSQL client tools" -ForegroundColor Red
    exit 1
}

# Query to get bookings for this trip
Write-Host "`n1. Checking bookings for trip..." -ForegroundColor Yellow
$bookingsQuery = @"
SELECT 
    b.id as booking_id,
    b.user_id,
    b.trip_id,
    b.status,
    b.payment_status,
    b.total_seats,
    b.total_amount,
    b.created_at
FROM bookings b
WHERE b.trip_id = '$tripId'
ORDER BY b.created_at DESC
LIMIT 5;
"@

$env:PGPASSWORD = $dbPassword
$bookings = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -A -F "|" -c $bookingsQuery 2>$null

if ($LASTEXITCODE -eq 0 -and $bookings) {
    Write-Host "Success - Found bookings:" -ForegroundColor Green
    $bookings -split "`n" | ForEach-Object {
        if ($_.Trim()) {
            $fields = $_ -split '\|'
            Write-Host "  Booking ID: $($fields[0])" -ForegroundColor White
            Write-Host "  Status: $($fields[3]) | Payment: $($fields[4]) | Seats: $($fields[5])" -ForegroundColor Gray
        }
    }
    
    # Get the first booking ID
    $firstBooking = ($bookings -split "`n")[0]
    if ($firstBooking) {
        $bookingId = ($firstBooking -split '\|')[0]
        
        # Query to get tickets/passengers for this booking
        Write-Host "`n2. Checking tickets/passengers for booking..." -ForegroundColor Yellow
        $ticketsQuery = @"
SELECT 
    t.id as ticket_id,
    t.passenger_id,
    t.ticket_number,
    t.seat_number,
    t.passenger_name,
    t.is_used,
    t.used_at,
    p.full_name,
    p.phone
FROM tickets t
LEFT JOIN passengers p ON t.passenger_id = p.id
WHERE t.booking_id = '$bookingId'
ORDER BY t.seat_number;
"@
        
        $tickets = psql -h $dbHost -p $dbPort -U $dbUser -d $dbName -t -A -F "|" -c $ticketsQuery 2>$null
        
        if ($LASTEXITCODE -eq 0 -and $tickets) {
            Write-Host "Success - Found tickets:" -ForegroundColor Green
            $tickets -split "`n" | ForEach-Object {
                if ($_.Trim()) {
                    $fields = $_ -split '\|'
                    Write-Host "`n  Passenger: $($fields[7])" -ForegroundColor White
                    Write-Host "  Seat: $($fields[3]) | Ticket: $($fields[2])" -ForegroundColor Gray
                    Write-Host "  Passenger ID: $($fields[1])" -ForegroundColor Gray
                    $isUsed = $fields[5]
                    if ($isUsed -eq "t") {
                        Write-Host "  Status: CHECKED IN at $($fields[6])" -ForegroundColor Green
                    } else {
                        Write-Host "  Status: NOT CHECKED IN" -ForegroundColor Yellow
                    }
                }
            }
            
            Write-Host "`n=== Summary ===" -ForegroundColor Cyan
            Write-Host "Trip ID: $tripId" -ForegroundColor White
            Write-Host "Booking ID: $bookingId" -ForegroundColor White
            Write-Host "`nYou can now:" -ForegroundColor White
            Write-Host "1. Go to Admin Dashboard -> Trips -> Manage & Check-In" -ForegroundColor Gray
            Write-Host "2. Select 'Upcoming' from dropdown" -ForegroundColor Gray
            Write-Host "3. Click on 'Ho Chi Minh City -> Mui Ne' trip" -ForegroundColor Gray
            Write-Host "4. You should see the passengers ready to check in!" -ForegroundColor Gray
            
        } else {
            Write-Host "No tickets found for this booking" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No bookings found for this trip" -ForegroundColor Red
    Write-Host "You may need to create a booking first using create-test-booking.ps1" -ForegroundColor Yellow
}

Remove-Item Env:\PGPASSWORD
