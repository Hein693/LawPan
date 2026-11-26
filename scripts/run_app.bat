@echo off
setlocal enabledelayedexpansion
title LAW PAN - Restaurant POS Desktop
echo =====================================================================
echo         LAW PAN (လောပန်) CHINESE RESTAURANT MANAGEMENT SYSTEM
echo                       Single PC Offline POS
echo =====================================================================
echo.

cd /d "%~dp0\.."

:: 1. Check if virtual environment exists
if not exist "backend\venv\Scripts\python.exe" (
    echo [ERROR] Python virtual environment not found in backend\venv!
    pause
    exit /b 1
)

:: 2. Terminate any previous orphan process on ports 8000 or 5173
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do taskkill /F /PID %%a >nul 2>&1
for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do taskkill /F /PID %%a >nul 2>&1

:: 3. Launch Local FastAPI Backend
echo [1/3] Starting Local Backend Server (Port 8000)...
start "LAW PAN Backend Service" /min cmd /c "backend\venv\Scripts\python.exe backend\run_server.py"

:: Wait for backend to bind port
timeout /t 2 /nobreak >nul

:: 4. Launch Local Frontend UI
echo [2/3] Starting Frontend Server (Port 5173)...
start "LAW PAN Frontend UI" /min cmd /c "cd frontend && npm run dev -- --host 127.0.0.1 --port 5173"

:: Wait for frontend
timeout /t 3 /nobreak >nul

:: 5. Open in Desktop Window Mode (Edge/Chrome App Mode or Default Browser)
echo [3/3] Opening LAW PAN POS Application Window...
start msedge --app=http://127.0.0.1:5173 --window-size=1440,900 2>nul || start chrome --app=http://127.0.0.1:5173 --window-size=1440,900 2>nul || start http://127.0.0.1:5173

echo.
echo =====================================================================
echo LAW PAN POS is running smoothly on this PC!
echo Backend:  http://127.0.0.1:8000/docs
echo Frontend: http://127.0.0.1:5173
echo.
echo Default Logins:
echo   Owner:   owner   / lawpan123
echo   Manager: manager / lawpan123
echo   Waiter:  waiter  / lawpan123
echo   Cashier: cashier / lawpan123
echo   Kitchen: kitchen / lawpan123
echo =====================================================================
echo Press any key to stop all LAW PAN services and close...
pause >nul

:: Cleanup
call "%~dp0stop_app.bat"
