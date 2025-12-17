$response = Invoke-WebRequest -Uri 'http://localhost:8080/api/v1/trips/search?origin=Ho%20Chi%20Minh%20City&destination=Da%20Nang&date=2025-12-16' -UseBasicParsing -ErrorAction SilentlyContinue
if ($null -ne $response) {
    $data = $response.Content | ConvertFrom-Json
    Write-Host "Total trips: $($data.pagination.total)"
    if ($data.data.Count -gt 0) {
        Write-Host "First trip ID: $($data.data[0].id)"
        Write-Host "Departure: $($data.data[0].departure_time)"
    }
} else {
    Write-Host "No response"
}
