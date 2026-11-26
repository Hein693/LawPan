@echo off
title LAW PAN - Stop Docker Containers
echo Stopping LAW PAN Docker containers...

cd /d "%~dp0\.."
docker compose down

echo.
echo All LAW PAN containers have been stopped cleanly.
timeout /t 2 /nobreak >nul
