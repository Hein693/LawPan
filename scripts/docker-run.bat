@echo off
title LAW PAN - Docker Container Launcher
echo =====================================================================
echo         LAW PAN (လောပန်) CHINESE RESTAURANT MANAGEMENT SYSTEM
echo                     Docker Container Launcher
echo =====================================================================
echo.

cd /d "%~dp0\.."

:: 1. Check if Docker is installed
where docker >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Docker command line tool not found!
    echo Please make sure Docker Desktop is installed and running.
    pause
    exit /b 1
)

:: 2. Build and launch containers in background
echo [1/2] Building and starting LAW PAN Docker containers...
docker compose up -d --build

if %errorlevel% neq 0 (
    echo [ERROR] Failed to launch Docker containers. Check Docker Desktop status.
    pause
    exit /b 1
)

:: 3. Wait for services to become healthy
echo [2/2] Waiting for services to initialize...
timeout /t 5 /nobreak >nul

echo.
echo =====================================================================
echo LAW PAN POS is now running inside Docker containers!
echo.
echo Frontend Web UI: http://localhost:5173  (or http://localhost:80)
echo Backend REST API: http://localhost:8000/docs
echo.
echo Default Credentials:
echo   Owner:   owner   / lawpan123
echo   Manager: manager / lawpan123
echo   Waiter:  waiter  / lawpan123
echo   Cashier: cashier / lawpan123
echo   Kitchen: kitchen / lawpan123
echo.
echo To stop containers, run: scripts\docker-stop.bat
echo =====================================================================

:: Open browser
start http://localhost:5173
pause
