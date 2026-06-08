@echo off
title Toms 3D — Local GPU Installer
color 0B
echo ===================================================
echo   Toms 3D — Local GPU Dependencies Installer
echo ===================================================
echo.
echo Checking for Python installation...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Python is not installed or not added to your system PATH!
    echo Please install Python 3.10 or 3.11 and check "Add Python to PATH" during setup.
    echo Download link: https://www.python.org/downloads/
    echo.
    pause
    exit /b 1
)

echo Python is active.
echo.
echo Installing PyTorch with NVIDIA CUDA 12.1 support...
echo This might take a few minutes (downloads ~2GB of package files).
echo Please keep your internet connection stable.
echo.
python -m pip install torch torchvision --index-url https://download.pytorch.org/whl/cu121
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Failed to install PyTorch! Check your internet connection or pip permissions.
    echo.
    pause
    exit /b 1
)

echo.
echo Installing Pillow image utility...
python -m pip install Pillow
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Failed to install Pillow!
    echo.
    pause
    exit /b 1
)

echo.
echo Installing TripoSR (tsr) library...
python -m pip install tsr
if %errorlevel% neq 0 (
    color 0C
    echo.
    echo ERROR: Failed to install TripoSR (tsr)!
    echo.
    pause
    exit /b 1
)

echo.
color 0A
echo ===================================================
echo   SUCCESS: All local GPU dependencies installed!
echo ===================================================
echo You can now use the "Local GPU" mode inside your 3D Workstation.
echo.
pause
