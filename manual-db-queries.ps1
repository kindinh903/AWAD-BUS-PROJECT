# Direct SQL to insert test booking data for check-in testing
# Run this SQL directly in your PostgreSQL client (pgAdmin, DBeaver, etc.)

Write-Host @"

=== SQL Queries to Check/Insert Test Data ===

-- 1. Check if booking exists
SELECT 
    b.id as booking_id,
    b.status,
    b.payment_status,
    b.total_seats,
    COUNT(t.id) as ticket_count,
    SUM(CASE WHEN t.is_used THEN 1 ELSE 0 END) as checked_in_count
FROM bookings b
LEFT JOIN tickets t ON t.booking_id = b.id
WHERE b.trip_id = '86efbe3a-85af-46ec-ae4e-6cde86411241'
GROUP BY b.id, b.status, b.payment_status, b.total_seats
ORDER BY b.created_at DESC;

-- 2. View all tickets for the trip
SELECT 
    t.id,
    t.ticket_number,
    t.passenger_name,
    t.seat_number,
    t.is_used,
    t.used_at,
    p.full_name,
    p.phone,
    p.email
FROM tickets t
LEFT JOIN passengers p ON t.passenger_id = p.id
WHERE t.trip_id = '86efbe3a-85af-46ec-ae4e-6cde86411241'
ORDER BY t.seat_number;

-- 3. If no tickets exist, here's SQL to create test booking with passengers:
-- NOTE: Run only if you need to create test data manually

-- First, insert a booking
INSERT INTO bookings (
    id, user_id, trip_id, status, payment_status,
    payment_method, total_seats, total_amount,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '3a791803-b80c-49ef-8039-1de1e23ad1ec', -- user@busproject.com
    '86efbe3a-85af-46ec-ae4e-6cde86411241', -- Ho Chi Minh -> Mui Ne trip
    'confirmed',
    'completed',
    'bank_transfer',
    2,
    702000,
    NOW(),
    NOW()
) RETURNING id;
-- Copy the returned booking ID for next steps

-- Then insert passengers (replace <BOOKING_ID> with the ID from above)
-- Get seat IDs first:
SELECT id, seat_number FROM seats 
WHERE seat_map_id = 'e26a7b5e-28ce-4f4e-9c68-b64021807a87' 
  AND seat_number IN ('1A', '1B')
ORDER BY seat_number;
-- Copy the seat IDs

-- Insert passenger 1
INSERT INTO passengers (
    id, booking_id, seat_id, seat_number, full_name,
    phone, email, seat_type, seat_price,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '<BOOKING_ID>', -- Replace with actual booking ID
    '<SEAT_1A_ID>', -- Replace with actual seat ID for 1A
    '1A',
    'Test Passenger 1',
    '0123456789',
    'user@busproject.com',
    'vip',
    351000,
    NOW(),
    NOW()
) RETURNING id;
-- Copy the returned passenger ID

-- Insert passenger 2
INSERT INTO passengers (
    id, booking_id, seat_id, seat_number, full_name,
    phone, email, seat_type, seat_price,
    created_at, updated_at
) VALUES (
    gen_random_uuid(),
    '<BOOKING_ID>', -- Replace with actual booking ID
    '<SEAT_1B_ID>', -- Replace with actual seat ID for 1B
    '1B',
    'Test Passenger 2',
    '0987654321',
    'passenger2@test.com',
    'vip',
    351000,
    NOW(),
    NOW()
) RETURNING id;
-- Copy the returned passenger ID

-- Finally, create tickets
INSERT INTO tickets (
    id, ticket_number, booking_id, passenger_id, trip_id,
    seat_number, passenger_name, is_used,
    created_at, updated_at
) VALUES 
(
    gen_random_uuid(),
    'TKT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    '<BOOKING_ID>', -- Replace with actual booking ID
    '<PASSENGER_1_ID>', -- Replace with passenger 1 ID
    '86efbe3a-85af-46ec-ae4e-6cde86411241',
    '1A',
    'Test Passenger 1',
    false,
    NOW(),
    NOW()
),
(
    gen_random_uuid(),
    'TKT-' || LPAD(FLOOR(RANDOM() * 1000000)::TEXT, 6, '0'),
    '<BOOKING_ID>', -- Replace with actual booking ID
    '<PASSENGER_2_ID>', -- Replace with passenger 2 ID
    '86efbe3a-85af-46ec-ae4e-6cde86411241',
    '1B',
    'Test Passenger 2',
    false,
    NOW(),
    NOW()
);

-- 4. To manually check-in a passenger, use this:
-- (Replace <PASSENGER_ID> with actual passenger ID from step 2)
UPDATE tickets 
SET is_used = true, used_at = NOW()
WHERE passenger_id = '<PASSENGER_ID>' 
  AND trip_id = '86efbe3a-85af-46ec-ae4e-6cde86411241';

-- Verify the update
SELECT 
    passenger_name, seat_number, is_used, used_at
FROM tickets
WHERE trip_id = '86efbe3a-85af-46ec-ae4e-6cde86411241'
ORDER BY seat_number;

"@

Write-Host "`nYou can run these queries in:" -ForegroundColor Cyan
Write-Host "1. pgAdmin (GUI tool for PostgreSQL)" -ForegroundColor White
Write-Host "2. DBeaver (Universal database tool)" -ForegroundColor White
Write-Host "3. Azure Data Studio with PostgreSQL extension" -ForegroundColor White
Write-Host "4. Or any PostgreSQL client" -ForegroundColor White

Write-Host "`nDatabase Connection Info:" -ForegroundColor Cyan
Write-Host "Host: localhost" -ForegroundColor White
Write-Host "Port: 5432" -ForegroundColor White
Write-Host "Database: busdb" -ForegroundColor White
Write-Host "User: postgres" -ForegroundColor White
Write-Host "Password: postgres" -ForegroundColor White
