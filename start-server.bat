@echo off
chcp 65001 >nul
echo ===================================================
echo   Запуск локального сервера для ПК и телефона
echo ===================================================
echo.
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0server.ps1"
pause
