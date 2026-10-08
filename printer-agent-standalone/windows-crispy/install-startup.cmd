@echo off
cd /d "%~dp0"
echo.
echo CRISPY Print Agent — user Startup (no Administrator password)
echo Does not change C:\MISHKAH-PRINTER
echo.
cscript.exe //nologo "%~dp0install-startup.vbs"
if errorlevel 1 exit /b 1
echo.
echo Done. No Windows Service. No admin required.
echo.
