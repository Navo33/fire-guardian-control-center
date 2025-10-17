@echo off
setlocal

REM Batch script to run backend and frontend in separate CLI windows (dev mode)
set BACKEND_PATH=%~dp0backend
set FRONTEND_PATH=%~dp0frontend

REM Start backend
echo Starting Backend (dev mode)...
start "Backend" cmd /k "cd /d %BACKEND_PATH% && npm run dev"

REM Wait a moment before starting frontend
ping 127.0.0.1 -n 3 > nul

echo Starting Frontend (dev mode)...
start "Frontend" cmd /k "cd /d %FRONTEND_PATH% && npm run dev"

echo Both backend and frontend are running in separate CLI windows.
endlocal