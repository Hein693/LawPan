# LAW PAN Local System Launcher (PowerShell)
Write-Host "============================================================" -ForegroundColor Red
Write-Host "       LAW PAN CHINESE RESTAURANT MANAGEMENT SYSTEM" -ForegroundColor Yellow
Write-Host "               Local System Launcher" -ForegroundColor Red
Write-Host "============================================================" -ForegroundColor Red

$root = Split-Path -Parent $PSScriptRoot

Write-Host "`n[1/2] Starting Local Backend Server (FastAPI on Port 8000)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root'; & backend\venv\Scripts\python.exe backend\run_server.py"

Start-Sleep -Seconds 2

Write-Host "[2/2] Starting Frontend UI (Vite on Port 5173)..." -ForegroundColor Cyan
Start-Process powershell -ArgumentList "-NoExit", "-Command", "Set-Location '$root\frontend'; npm run dev"

Start-Sleep -Seconds 3

Write-Host "`nOpening browser at http://127.0.0.1:5173 ..." -ForegroundColor Green
Start-Process "http://127.0.0.1:5173"
