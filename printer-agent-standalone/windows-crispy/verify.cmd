@echo off
cd /d "%~dp0"
if not exist ".env" (
  echo Copy .env.example to .env first.
  exit /b 1
)
"%~dp0node\node.exe" "%~dp0dist\agent.cjs" --verify
