@echo off
title LAW PAN Restaurant POS - System Launcher
echo ============================================================
echo           LAW PAN CHINESE RESTAURANT MANAGEMENT SYSTEM
echo                   Local System Launcher
echo ============================================================
echo.

cd /d "%~dp0\.."

echo [1/2] Starting Local Backend Server (FastAPI on Port 8000)...
start "LAW PAN Backend" cmd /k "backend\venv\Scripts\python.exe backend\run_server.py"

timeout /t 2 /nobreak >nul

echo [2/2] Starting Frontend UI (Vite on Port 5173)...
start "LAW PAN Frontend" cmd /k "cd frontend && npm run dev"

timeout /t 3 /nobreak >nul

echo Opening browser at http://127.0.0.1:5173 ...
start http://127.0.0.1:5173

echo.
echo Both services are running locally. Keep the console windows open while operating the restaurant.
echo To stop, close the two console windows.
