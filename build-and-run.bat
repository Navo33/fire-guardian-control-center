@echo off
REM Batch script to build and run backend and frontend in production mode

setlocal enabledelayedexpansion

set BACKEND_PATH=%~dp0backend
set FRONTEND_PATH=%~dp0frontend

echo.
echo ========================================
echo Fire Guardian - Build and Run Script
echo ========================================
echo.

REM Build Backend
echo Building Backend...
cd /d "%BACKEND_PATH%"
call npm run build
if errorlevel 1 (
    echo Backend build failed!
    exit /b 1
)
echo Backend build completed successfully!

REM Build Frontend
echo.
echo Building Frontend...
cd /d "%FRONTEND_PATH%"
call npm run build
if errorlevel 1 (
    echo Frontend build failed!
    exit /b 1
)
echo Frontend build completed successfully!

REM Start Backend
echo.
echo Starting Backend (production mode)...
start cmd /k "cd /d "%BACKEND_PATH%" && npm start"

timeout /t 3 /nobreak

REM Start Frontend
echo Starting Frontend (production mode)...
start cmd /k "cd /d "%FRONTEND_PATH%" && npm start"

echo.
echo ========================================
echo Both applications are now running!
echo Backend: http://localhost:5000
echo Frontend: http://localhost:3000
echo ========================================
echo.

pause
