# PowerShell script to run backend and frontend in separate terminals (dev mode)

$backendPath = "${PSScriptRoot}\backend"
$frontendPath = "${PSScriptRoot}\frontend"

Write-Host "Starting Backend (dev mode)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$backendPath`"; npm run dev"

Start-Sleep -Seconds 2

Write-Host "Starting Frontend (dev mode)..."
Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd `"$frontendPath`"; npm run dev"

Write-Host "Both backend and frontend are running in separate terminals."