@echo off
echo ========================================
echo Price Master BIH - Local Test Server
echo ========================================
echo.

cd /d "%~dp0"

echo Checking Node.js installation...
where node >nul 2>nul
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Node.js is not installed!
    echo Please install Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

echo [OK] Node.js found
node --version
npm --version
echo.

echo Installing dependencies...
call npm install

if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Failed to install dependencies
    pause
    exit /b 1
)

echo.
echo ========================================
echo Starting local server...
echo ========================================
echo.
echo Server will start on: http://localhost:3000
echo Press Ctrl+C to stop the server
echo.

start http://localhost:3000

node server.js

pause
