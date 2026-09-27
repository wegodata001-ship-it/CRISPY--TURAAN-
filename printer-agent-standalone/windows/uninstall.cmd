@echo off
setlocal
cd /d "%~dp0"
net session >nul 2>&1
if errorlevel 1 (
  echo Run uninstall.cmd as Administrator.
  exit /b 1
)
MishkahPrintAgent.exe stop
MishkahPrintAgent.exe uninstall
echo Service removed.
endlocal
