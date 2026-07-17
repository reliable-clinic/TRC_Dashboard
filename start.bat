@echo off
title TRC Clinic Management System Dashboard
echo ========================================================
echo   THE RELIABLE AESTHETIC CLINIC (TRC) - DASHBOARD
echo ========================================================
echo.

cd /d "%~dp0\frontend"
if not exist node_modules (
    echo [1/3] Installing frontend dependencies (please wait)...
    call npm install
) else (
    echo [1/3] Frontend dependencies already installed.
)

echo [2/3] Building frontend static bundle...
call npm run build

cd /d "%~dp0\backend"
echo [3/3] Launching local FastAPI backend server...
echo Database file: C:\Users\HP\Desktop\TRC_Dashboard\TRC_Database.accdb
echo.
echo Application will start in browser at http://localhost:5000/
echo.

start "" "http://localhost:5000/"
python main.py
pause
