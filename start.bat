@echo off
REM Quick Start Script for University ERP System
REM Run this script to setup and start the application

echo.
echo ========================================
echo  University ERP System - Quick Start
echo ========================================
echo.

REM Check if Node.js is installed
node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

echo [1/4] Checking Node.js... OK
echo.

REM Check if npm is installed
npm --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: npm is not installed!
    echo Please install Node.js which includes npm
    pause
    exit /b 1
)

echo [2/4] Checking npm... OK
echo.

REM Install dependencies
echo [3/4] Installing dependencies...
echo This may take a few minutes...
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install dependencies!
    echo Make sure you have internet connection
    pause
    exit /b 1
)

echo [3/4] Installing dependencies... OK
echo.

REM Start the server
echo [4/4] Starting server...
echo.
echo ========================================
echo  Server starting at http://localhost:3000
echo ========================================
echo.
echo Demo Credentials:
echo   Student: arun@student.edu / password123
echo   Instructor: rajesh@university.edu / password123
echo.
echo Press Ctrl+C to stop the server
echo ========================================
echo.

call npm start
