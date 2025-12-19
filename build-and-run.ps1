# PowerShell script to build and run backend and frontend in production mode

$backendPath = "${PSScriptRoot}\backend"
$frontendPath = "${PSScriptRoot}\frontend"

# Colors for output
$infoColor = "Cyan"
$successColor = "Green"
$errorColor = "Red"

Write-Host "========================================" -ForegroundColor $infoColor
Write-Host "Fire Guardian - Build and Run Script" -ForegroundColor $infoColor
Write-Host "========================================" -ForegroundColor $infoColor

# Build Backend
Write-Host "`nBuilding Backend..." -ForegroundColor $infoColor
Push-Location $backendPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Backend build failed!" -ForegroundColor $errorColor
    exit 1
}
Pop-Location
Write-Host "Backend build completed successfully!" -ForegroundColor $successColor

# Build Frontend
Write-Host "`nBuilding Frontend..." -ForegroundColor $infoColor
Push-Location $frontendPath
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Frontend build failed!" -ForegroundColor $errorColor
    exit 1
}
Pop-Location
Write-Host "Frontend build completed successfully!" -ForegroundColor $successColor

# Start Backend
Write-Host "`nStarting Backend (production mode)..." -ForegroundColor $infoColor
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backendPath`"; npm start"

Start-Sleep -Seconds 3

# Start Frontend
Write-Host "Starting Frontend (production mode)..." -ForegroundColor $infoColor
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$frontendPath`"; npm start"

Write-Host "`n========================================" -ForegroundColor $successColor
Write-Host "Both applications are now running!" -ForegroundColor $successColor
Write-Host "Backend: http://localhost:5000" -ForegroundColor $infoColor
Write-Host "Frontend: http://localhost:3000" -ForegroundColor $infoColor
Write-Host "========================================" -ForegroundColor $successColor
