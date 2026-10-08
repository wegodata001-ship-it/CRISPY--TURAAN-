@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Copy .env.example to .env first.
  exit /b 1
)
echo Starting CRISPY Print Agent in this window.
echo Logs also go to logs\print-agent.log
echo Close the window to stop.
echo For auto-start without admin, double-click install-startup.cmd.
echo.
"%~dp0node\node.exe" "%~dp0dist\agent.cjs"
