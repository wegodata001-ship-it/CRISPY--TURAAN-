@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Copy .env.example to .env first.
  exit /b 1
)
start "" /B wscript.exe "%~dp0start-hidden.vbs"
echo MISHKAH Print Agent started in the background.
echo No console window. Logs: %~dp0logs\print-agent.log
