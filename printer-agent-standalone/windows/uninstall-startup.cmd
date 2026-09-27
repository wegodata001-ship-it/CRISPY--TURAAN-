@echo off
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\MishkahPrintAgent.lnk"
if exist "%LINK%" (
  del /f /q "%LINK%"
  echo Removed Startup shortcut.
) else (
  echo No Startup shortcut found.
)
echo The hidden agent keeps running until you sign out or end wscript.exe / node.exe.
