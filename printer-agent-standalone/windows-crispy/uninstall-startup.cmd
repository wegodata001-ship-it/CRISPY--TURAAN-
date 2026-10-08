@echo off
set "LINK=%APPDATA%\Microsoft\Windows\Start Menu\Programs\Startup\CrispyPrintAgent.lnk"
if exist "%LINK%" (
  del /f /q "%LINK%"
  echo Removed CRISPY Startup shortcut.
) else (
  echo No CRISPY Startup shortcut found.
)
echo Mishkah startup shortcut is not changed.
echo The hidden CRISPY agent keeps running until you sign out or end its wscript.exe / node.exe.
