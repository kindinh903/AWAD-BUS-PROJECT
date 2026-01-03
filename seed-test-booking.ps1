# Seed database with test booking for check-in testing
Write-Host "`n=== Seeding Test Booking Data ===" -ForegroundColor Cyan

# Trip and user IDs
$tripId = "86efbe3a-85af-46ec-ae4e-6cde86411241"
$userId = "3a791803-b80c-49ef-8039-1de1e23ad1ec"

# Check if Docker is running
Write-Host "`nChecking Docker..." -ForegroundColor Yellow
try {
    $dockerTest = docker ps 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "Error - Docker is not running" -ForegroundColor Red
        exit 1
    }
    Write-Host "Docker is running" -ForegroundColor Green
} catch {
    Write-Host "Error - Docker is not installed or not accessible" -ForegroundColor Red
    exit 1
}

# Find PostgreSQL container
Write-Host "Finding PostgreSQL container..." -ForegroundColor Yellow
$pgContainer = docker ps --filter "ancestor=postgres" --format "{{.Names}}" 2>$null
if (!$pgContainer) {
    $pgContainer = docker ps --filter "name=postgres" --format "{{.Names}}" 2>$null
}
if (!$pgContainer) {
    $pgContainer = docker ps --format "{{.Names}}" | Select-String -Pattern "postgres|db" | Select-Object -First 1
}

if (!$pgContainer) {
    Write-Host "Error - Could not find PostgreSQL container" -ForegroundColor Red
    Write-Host "Please make sure your database container is running" -ForegroundColor Yellow
    exit 1
}

Write-Host "Found PostgreSQL container: $pgContainer" -ForegroundColor Green

# SQL to seed test data
$seedSQL = @"
-- Clean up any existing test data for this trip
DELETE FROM tickets WHERE trip_id = '$tripId';
DELETE FROM passengers WHERE booking_id IN (SELECT id FROM bookings WHERE trip_id = '$tripId');
DELETE FROM bookings WHERE trip_id = '$tripId';

-- Create booking and capture the ID
WITH new_booking AS (
    INSERT INTO bookings (
        id, booking_reference, user_id, trip_id, contact_name, contact_email, contact_phone,
        status, payment_status, payment_method, total_seats, total_amount,
        created_at, updated_at
    ) VALUES (
        gen_random_uuid(),
        'BK-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
        '$userId',
        '$tripId',
        'Test User',
        'user@busproject.com',
        '0123456789',
        'confirmed',
        'completed',
        'bank_transfer',
        2,
        702000,
        NOW(),
        NOW()
    ) RETURNING id
),
seat_ids AS (
    SELECT id as seat_id, seat_number 
    FROM seats 
    WHERE seat_map_id = 'e26a7b5e-28ce-4f4e-9c68-b64021807a87' 
      AND seat_number IN ('1A', '1B')
),
new_passengers AS (
    INSERT INTO passengers (
        id, booking_id, seat_id, seat_number, full_name,
        phone, email, seat_type, seat_price,
        created_at, updated_at
    )
    SELECT 
        gen_random_uuid(),
        (SELECT id FROM new_booking),
        s.seat_id,
        s.seat_number,
        CASE WHEN s.seat_number = '1A' THEN 'John Doe' ELSE 'Jane Smith' END,
        CASE WHEN s.seat_number = '1A' THEN '0123456789' ELSE '0987654321' END,
        CASE WHEN s.seat_number = '1A' THEN 'user@busproject.com' ELSE 'jane@test.com' END,
        'vip',
        351000,
        NOW(),
        NOW()
    FROM seat_ids s
    RETURNING id, seat_number, full_name
)
INSERT INTO tickets (
    id, ticket_number, booking_id, passenger_id, trip_id,
    seat_number, passenger_name, is_used,
    created_at, updated_at
)
SELECT 
    gen_random_uuid(),
    'TKT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    (SELECT id FROM new_booking),
    np.id,
    '$tripId',
    np.seat_number,
    np.full_name,
    false,
    NOW(),
    NOW()
FROM new_passengers np;

-- Verify the data
SELECT 
    b.id as booking_id,
    b.status,
    b.total_seats,
    p.full_name as passenger_name,
    p.seat_number,
    t.ticket_number,
    t.is_used as checked_in
FROM bookings b
JOIN passengers p ON p.booking_id = b.id
JOIN tickets t ON t.passenger_id = p.id
WHERE b.trip_id = '$tripId'
ORDER BY p.seat_number;
"@

Write-Host "`nSeeding database..." -ForegroundColor Yellow

# Save SQL to temp file
$tempSqlFile = [System.IO.Path]::GetTempFileName()
$seedSQL | Out-File -FilePath $tempSqlFile -Encoding UTF8

try {
    # Copy SQL file to container
    docker cp $tempSqlFile "$($pgContainer):/tmp/seed.sql" 2>$null
    
    # Execute SQL in container
    $result = docker exec -i $pgContainer psql -U postgres -d bus_booking -f /tmp/seed.sql 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "`nSuccess - Test data seeded!" -ForegroundColor Green
        Write-Host "`nBooking Details:" -ForegroundColor Cyan
        Write-Host "Trip: Ho Chi Minh City -> Mui Ne" -ForegroundColor White
        Write-Host "Date: December 27, 2025 at 06:00" -ForegroundColor White
        Write-Host "Passengers:" -ForegroundColor White
        Write-Host "  1. John Doe (Seat 1A) - Not checked in" -ForegroundColor Gray
        Write-Host "  2. Jane Smith (Seat 1B) - Not checked in" -ForegroundColor Gray
        
        Write-Host "`nOutput:" -ForegroundColor Gray
        $result | ForEach-Object { Write-Host "  $_" -ForegroundColor DarkGray }
        
        Write-Host "`nNow you can test check-in:" -ForegroundColor Cyan
        Write-Host "1. Go to Admin Dashboard" -ForegroundColor White
        Write-Host "2. Click 'Trips' tab -> 'Manage & Check-In'" -ForegroundColor White
        Write-Host "3. Select 'Upcoming' from the dropdown" -ForegroundColor White
        Write-Host "4. Click on 'Ho Chi Minh City -> Mui Ne' trip" -ForegroundColor White
        Write-Host "5. You'll see 2 passengers ready to check in!" -ForegroundColor White
        Write-Host "6. Click 'Check In' button to test the feature" -ForegroundColor White
    } else {
        Write-Host "`nError executing SQL:" -ForegroundColor Red
        $result | ForEach-Object { Write-Host "  $_" -ForegroundColor Red }
    }
} catch {
    Write-Host "Error: $($_.Exception.Message)" -ForegroundColor Red
} finally {
    # Cleanup
    Remove-Item $tempSqlFile -ErrorAction SilentlyContinue
    docker exec $pgContainer rm -f /tmp/seed.sql 2>$null
}
