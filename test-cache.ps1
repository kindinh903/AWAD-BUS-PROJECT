# Test Redis Caching Performance

$baseUrl = "http://localhost:8080/api/v1"

Write-Host ""
Write-Host "=== Testing Redis Caching Performance ===" -ForegroundColor Cyan

# Test trip search endpoint
$searchParams = @{
    from_location = "Hanoi"
    to_location = "Da Nang"
    date = "2025-01-15"
    page = 1
    limit = 10
}

Write-Host ""
Write-Host "1. First Request (Cold Cache - Database Query)..." -ForegroundColor Yellow
$sw1 = [Diagnostics.Stopwatch]::StartNew()
try {
    $response1 = Invoke-RestMethod -Uri "$baseUrl/trips/search" -Method Get -Body $searchParams
    $sw1.Stop()
    Write-Host "Success! Time: $($sw1.ElapsedMilliseconds)ms" -ForegroundColor Green
    Write-Host "Trips Found: $($response1.data.Count)" -ForegroundColor Cyan
} catch {
    $sw1.Stop()
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "2. Second Request (Hot Cache - Redis)..." -ForegroundColor Yellow
$sw2 = [Diagnostics.Stopwatch]::StartNew()
try {
    $response2 = Invoke-RestMethod -Uri "$baseUrl/trips/search" -Method Get -Body $searchParams
    $sw2.Stop()
    Write-Host "Success! Time: $($sw2.ElapsedMilliseconds)ms" -ForegroundColor Green
    Write-Host "Trips Found: $($response2.data.Count)" -ForegroundColor Cyan
} catch {
    $sw2.Stop()
    Write-Host "Error: $_" -ForegroundColor Red
}

Write-Host ""
Write-Host "3. Third Request (Hot Cache - Redis)..." -ForegroundColor Yellow
$sw3 = [Diagnostics.Stopwatch]::StartNew()
try {
    $response3 = Invoke-RestMethod -Uri "$baseUrl/trips/search" -Method Get -Body $searchParams
    $sw3.Stop()
    Write-Host "Success! Time: $($sw3.ElapsedMilliseconds)ms" -ForegroundColor Green
    Write-Host "Trips Found: $($response3.data.Count)" -ForegroundColor Cyan
} catch {
    $sw3.Stop()
    Write-Host "Error: $_" -ForegroundColor Red
}

# Calculate performance improvement
if ($sw1.ElapsedMilliseconds -gt 0 -and $sw2.ElapsedMilliseconds -gt 0) {
    $improvement = [math]::Round((1 - ($sw2.ElapsedMilliseconds / $sw1.ElapsedMilliseconds)) * 100, 2)
    $speedup = [math]::Round($sw1.ElapsedMilliseconds / $sw2.ElapsedMilliseconds, 2)
    
    Write-Host ""
    Write-Host "Performance Analysis:" -ForegroundColor Magenta
    Write-Host "Cold Cache: $($sw1.ElapsedMilliseconds)ms" -ForegroundColor White
    Write-Host "Hot Cache:  $($sw2.ElapsedMilliseconds)ms" -ForegroundColor White
    Write-Host "Improvement: $improvement% faster" -ForegroundColor Green
    Write-Host "Speedup: ${speedup}x" -ForegroundColor Green
}

Write-Host ""
Write-Host "=== Test Complete ===" -ForegroundColor Cyan
