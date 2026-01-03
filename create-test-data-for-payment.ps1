# Script to create test data (routes, buses, trips, and seats) for payment testing
# This script creates complete test data from scratch

$BaseUrl = "https://awad-bus-project-production-aecc.up.railway.app/api/v1"
$testEmail = "user@busproject.com"
$testPassword = "user123"
$adminEmail = "admin@busproject.com"
$adminPassword = "admin123"

# ============================================
# STEP 1: Admin Login
# ============================================
Write-Host "======== STEP 1: Admin Login ========" -ForegroundColor Blue

$loginUrl = "$BaseUrl/auth/login"
$loginBody = @{
    email = $adminEmail
    password = $adminPassword
} | ConvertTo-Json

Write-Host "Logging in as admin: $adminEmail"

try {
    $loginResponse = Invoke-WebRequest -Uri $loginUrl `
        -Method Post `
        -ContentType "application/json" `
        -Body $loginBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $loginData = $loginResponse.Content | ConvertFrom-Json
    $adminToken = $loginData.access_token
    
    if ($adminToken) {
        Write-Host "[OK] Admin login successful" -ForegroundColor Green
    } else {
        Write-Host "[ERROR] No token in response" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "[WARNING] Admin login failed, trying user login instead" -ForegroundColor Yellow
    $loginBody = @{
        email = $testEmail
        password = $testPassword
    } | ConvertTo-Json
    
    try {
        $loginResponse = Invoke-WebRequest -Uri $loginUrl `
            -Method Post `
            -ContentType "application/json" `
            -Body $loginBody `
            -UseBasicParsing `
            -ErrorAction Stop
        
        $loginData = $loginResponse.Content | ConvertFrom-Json
        $adminToken = $loginData.access_token
        Write-Host "[OK] User login successful" -ForegroundColor Green
    } catch {
        Write-Host "[ERROR] Login failed: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

$headers = @{
    "Authorization" = "Bearer $adminToken"
    "Content-Type" = "application/json"
}

# ============================================
# STEP 2: Create Route
# ============================================
Write-Host "`n======== STEP 2: Create Route ========" -ForegroundColor Blue

$routeUrl = "$BaseUrl/admin/routes"
$routeBody = @{
    origin = "Ho Chi Minh City"
    destination = "Da Nang"
    distance = 960
    estimated_duration = 16
    description = "Ho Chi Minh City to Da Nang route for testing"
} | ConvertTo-Json

Write-Host "Creating route: Ho Chi Minh City -> Da Nang"

try {
    $routeResponse = Invoke-WebRequest -Uri $routeUrl `
        -Method Post `
        -Headers $headers `
        -Body $routeBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $routeData = $routeResponse.Content | ConvertFrom-Json
    $route = if ($null -ne $routeData.route) { $routeData.route } else { $routeData.data }
    $routeId = $route.id
    
    Write-Host "[OK] Route created" -ForegroundColor Green
    Write-Host "Route ID: $routeId"
    
} catch {
    Write-Host "[WARNING] Could not create route, trying to get existing route..." -ForegroundColor Yellow
    
    # Try to get first existing route
    try {
        $routesListUrl = "$BaseUrl/admin/routes?limit=5"
        $routesResponse = Invoke-WebRequest -Uri $routesListUrl `
            -Method Get `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop
        
        $routesData = $routesResponse.Content | ConvertFrom-Json
        $routes = if ($null -ne $routesData.routes) { $routesData.routes } else { $routesData.data }
        
        if ($routes -and $routes.Count -gt 0) {
            $route = $routes[0]
            $routeId = $route.id
            Write-Host "[OK] Using existing route: $routeId" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Could not find or create route" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[ERROR] Failed to get routes: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# ============================================
# STEP 3: Create Bus
# ============================================
Write-Host "`n======== STEP 3: Create Bus ========" -ForegroundColor Blue

$busUrl = "$BaseUrl/admin/buses"
$busBody = @{
    name = "Test Bus $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
    plateNumber = "BUS-TEST-$(Get-Date -Format 'yyyyMMddHHmmss')"
    totalSeats = 40
    busType = "express"
    manufacturer = "Hyundai"
    model = "Universe"
    year = 2023
} | ConvertTo-Json

Write-Host "Creating bus with 40 seats"

try {
    $busResponse = Invoke-WebRequest -Uri $busUrl `
        -Method Post `
        -Headers $headers `
        -Body $busBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $busData = $busResponse.Content | ConvertFrom-Json
    $bus = if ($null -ne $busData.data) { $busData.data } else { $busData }
    $busId = $bus.id
    
    Write-Host "[OK] Bus created" -ForegroundColor Green
    Write-Host "Bus ID: $busId"
    Write-Host "Plate Number: $($bus.plateNumber)"
    
} catch {
    Write-Host "[ERROR] Failed to create bus: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to show error details
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Details: $errorContent" -ForegroundColor DarkGray
    } catch {}
    
    exit 1
}

# ============================================
# STEP 4: Create Trip
# ============================================
Write-Host "`n======== STEP 4: Create Trip ========" -ForegroundColor Blue

# ============================================
# STEP 4A: Create Seat Map
# ============================================
Write-Host "`n======== STEP 4A: Create Seat Map ========" -ForegroundColor Blue

$seatMapUrl = "$BaseUrl/admin/seat-maps"
$seatMapBody = @{
    name = "Standard 4x10 Layout $(Get-Date -Format 'dd/MM/yyyy HH:mm')"
    description = "Standard seat layout with 4 columns and 10 rows (40 seats total)"
    rows = 10
    columns = 4
    bus_type = "express"
} | ConvertTo-Json

Write-Host "Creating seat map (10 rows × 4 columns = 40 seats)"

try {
    $seatMapResponse = Invoke-WebRequest -Uri $seatMapUrl `
        -Method Post `
        -Headers $headers `
        -Body $seatMapBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $seatMapData = $seatMapResponse.Content | ConvertFrom-Json
    $seatMap = if ($null -ne $seatMapData.data) { $seatMapData.data } else { $seatMapData }
    $seatMapId = $seatMap.id
    
    Write-Host "[OK] Seat map created" -ForegroundColor Green
    Write-Host "Seat Map ID: $seatMapId"
    
} catch {
    Write-Host "[WARNING] Could not create seat map, trying to get existing seat map..." -ForegroundColor Yellow
    
    try {
        $seatMapsListUrl = "$BaseUrl/admin/seat-maps?limit=5"
        $seatMapsResponse = Invoke-WebRequest -Uri $seatMapsListUrl `
            -Method Get `
            -Headers $headers `
            -UseBasicParsing `
            -ErrorAction Stop
        
        $seatMapsData = $seatMapsResponse.Content | ConvertFrom-Json
        $seatMaps = if ($null -ne $seatMapsData.data) { $seatMapsData.data } else { $seatMapsData }
        
        if ($seatMaps -and $seatMaps.Count -gt 0) {
            $seatMap = $seatMaps[0]
            $seatMapId = $seatMap.id
            Write-Host "[OK] Using existing seat map: $seatMapId" -ForegroundColor Green
        } else {
            Write-Host "[ERROR] Could not find or create seat map" -ForegroundColor Red
            exit 1
        }
    } catch {
        Write-Host "[ERROR] Failed to get seat maps: $($_.Exception.Message)" -ForegroundColor Red
        exit 1
    }
}

# ============================================
# STEP 4B: Assign Seat Map to Bus
# ============================================
Write-Host "`n======== STEP 4B: Assign Seat Map to Bus ========" -ForegroundColor Blue

$assignUrl = "$BaseUrl/admin/buses/assign-seat-map"
$assignBody = @{
    bus_id = $busId
    seat_map_id = $seatMapId
} | ConvertTo-Json

Write-Host "Assigning seat map to bus..."
Write-Host "  Bus ID: $busId"
Write-Host "  Seat Map ID: $seatMapId"

try {
    $assignResponse = Invoke-WebRequest -Uri $assignUrl `
        -Method Post `
        -Headers $headers `
        -Body $assignBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    Write-Host "[OK] Seat map assigned to bus" -ForegroundColor Green
    
} catch {
    Write-Host "[WARNING] Could not assign seat map: $($_.Exception.Message)" -ForegroundColor Yellow
    Write-Host "Continuing anyway - seat map might already be assigned" -ForegroundColor Cyan
}

# ============================================
# STEP 4C: Create Trip
# ============================================
Write-Host "`n======== STEP 4C: Create Trip ========" -ForegroundColor Blue

$futureDate = (Get-Date).AddDays(1)
$departureTime = [System.DateTime]::new($futureDate.Year, $futureDate.Month, $futureDate.Day, 9, 0, 0).ToUniversalTime().ToString("o")
$arrivalTime = $futureDate.AddHours(12).ToUniversalTime().ToString("o")

$tripUrl = "$BaseUrl/admin/trips"
$tripBody = @{
    routeId = $routeId
    busId = $busId
    startTime = $departureTime
    endTime = $arrivalTime
    price = 350000
} | ConvertTo-Json

Write-Host "Creating trip:"
Write-Host "  Route ID: $routeId"
Write-Host "  Bus ID: $busId"
Write-Host "  Start Time: $departureTime"
Write-Host "  End Time: $arrivalTime"
Write-Host "  Price: 350000"

try {
    $tripResponse = Invoke-WebRequest -Uri $tripUrl `
        -Method Post `
        -Headers $headers `
        -Body $tripBody `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $tripData = $tripResponse.Content | ConvertFrom-Json
    $trip = if ($null -ne $tripData.trip) { $tripData.trip } else { $tripData.data }
    $tripId = $trip.id
    
    Write-Host "[OK] Trip created" -ForegroundColor Green
    Write-Host "Trip ID: $tripId"
    Write-Host "Status: $($trip.status)"
    
} catch {
    Write-Host "[ERROR] Failed to create trip: $($_.Exception.Message)" -ForegroundColor Red
    
    # Try to show error details
    try {
        $errorResponse = $_.Exception.Response.GetResponseStream()
        $reader = New-Object System.IO.StreamReader($errorResponse)
        $errorContent = $reader.ReadToEnd()
        Write-Host "Error Details: $errorContent" -ForegroundColor DarkGray
    } catch {}
    
    exit 1
}

# ============================================
# STEP 5: Verify Trip with Seats
# ============================================
Write-Host "`n======== STEP 5: Verify Trip Seats ========" -ForegroundColor Blue

Start-Sleep -Seconds 2

$verifyTripUrl = "$BaseUrl/trips/$tripId"

Start-Sleep -Seconds 1

try {
    $verifyTripResponse = Invoke-WebRequest -Uri $verifyTripUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $verifyTripData = $verifyTripResponse.Content | ConvertFrom-Json
    $verifiedTrip = if ($null -ne $verifyTripData.trip) { $verifyTripData.trip } else { $verifyTripData.data }
    
    Write-Host "[OK] Trip verified" -ForegroundColor Green
    Write-Host "Trip ID: $($verifiedTrip.id)"
    Write-Host "Status: $($verifiedTrip.status)"
    Write-Host "Price: $($verifiedTrip.price)"
    
} catch {
    Write-Host "[WARNING] Could not verify trip: $($_.Exception.Message)" -ForegroundColor Yellow
}

# Check for seats
$seatsUrl = "$BaseUrl/trips/$tripId/seats"

try {
    $seatsResponse = Invoke-WebRequest -Uri $seatsUrl `
        -Method Get `
        -Headers $headers `
        -UseBasicParsing `
        -ErrorAction Stop
    
    $seatsData = $seatsResponse.Content | ConvertFrom-Json
    
    if ($null -ne $seatsData.available_seats) {
        $availableCount = ($seatsData.available_seats | Measure-Object).Count
        Write-Host "[OK] Seats found: $availableCount available" -ForegroundColor Green
    } elseif ($null -ne $seatsData.seats) {
        $availableCount = ($seatsData.seats | Where-Object { $_.status -eq "available" } | Measure-Object).Count
        Write-Host "[OK] Seats found: $availableCount available" -ForegroundColor Green
    } else {
        Write-Host "[WARNING] No seat information in response" -ForegroundColor Yellow
    }
    
} catch {
    Write-Host "[WARNING] Could not verify seats: $($_.Exception.Message)" -ForegroundColor Yellow
}

# ============================================
# Summary
# ============================================
Write-Host "`n======== TEST DATA CREATED SUCCESSFULLY ========" -ForegroundColor Green
Write-Host ""
Write-Host "Created Resources:" -ForegroundColor Cyan
Write-Host "  - Route ID: $routeId"
Write-Host "  - Bus ID: $busId"
Write-Host "  - Seat Map ID: $seatMapId"
Write-Host "  - Trip ID: $tripId"
Write-Host ""
Write-Host "Trip Details:" -ForegroundColor Cyan
Write-Host "  - Route: Ho Chi Minh City -> Da Nang"
Write-Host "  - Departure: $departureTime"
Write-Host "  - Arrival: $arrivalTime"
Write-Host "  - Price: 350,000 VND"
Write-Host "  - Status: scheduled"
Write-Host ""
Write-Host "Next Step:" -ForegroundColor Cyan
Write-Host "  Run: powershell -ExecutionPolicy Bypass -File create-booking-for-payment.ps1"
Write-Host ""
Write-Host "This will create a booking on the trip you just created."
Write-Host "=========================================="
