@echo off
setlocal
cd /d "%~dp0"

echo.
echo MISHKAH Print Agent — install
echo Install folder: %CD%
echo.

if not exist ".env" (
  echo ERROR: .env is missing.
  echo Copy .env.example to .env and set PRINT_AGENT_TOKEN.
  exit /b 1
)

findstr /B /C:"PRINT_AGENT_TOKEN=replace-with-the-same-token-as-vercel" .env >nul
if %ERRORLEVEL%==0 (
  echo ERROR: PRINT_AGENT_TOKEN is still the placeholder.
  echo Put the same token used in Vercel.
  exit /b 1
)

echo [1/4] Verify backend and printer...
call "%~dp0verify.cmd"
if errorlevel 1 (
  echo.
  echo Verify failed. Fix .env / network / printer, then run install.cmd again.
  echo The service was NOT installed.
  exit /b 1
)

net session >nul 2>&1
if errorlevel 1 (
  echo.
  echo ERROR: Run install.cmd as Administrator to install the Windows service.
  echo Right-click install.cmd → Run as administrator.
  exit /b 1
)

echo [2/4] Install Windows service...
MishkahPrintAgent.exe install
if errorlevel 1 (
  echo Service install failed.
  exit /b 1
)

echo [3/4] Start service...
MishkahPrintAgent.exe start
if errorlevel 1 (
  echo Service start failed. Check logs\print-agent.log
  exit /b 1
)

echo [4/4] Finished.
echo.
echo Service: MishkahPrintAgent  (Automatic, no login, no window)
echo Logs:    %CD%\logs\print-agent.log
echo Printer: 192.168.1.87:9100
echo Backend: https://mishkatcafe.dev
echo.
endlocal
