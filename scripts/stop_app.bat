@echo off
echo Stopping all LAW PAN Restaurant POS background processes...

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :8000') do (
    taskkill /F /PID %%a >nul 2>&1
)

for /f "tokens=5" %%a in ('netstat -aon ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)

echo All LAW PAN services have been stopped cleanly.
timeout /t 1 /nobreak >nul
