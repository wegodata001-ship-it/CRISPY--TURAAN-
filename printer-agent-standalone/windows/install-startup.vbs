' Install user Startup shortcut. No Administrator password.
Option Explicit

Dim fso, shell, base, startup, link, hidden

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
hidden = base & "\start-hidden.vbs"
startup = shell.SpecialFolders("Startup")
link = startup & "\MishkahPrintAgent.lnk"

If Not fso.FileExists(hidden) Then
  WScript.Echo "Missing start-hidden.vbs in " & base
  WScript.Quit 1
End If
If Not fso.FileExists(base & "\.env") Then
  WScript.Echo "Copy .env.example to .env first."
  WScript.Quit 1
End If

Dim sc
Set sc = shell.CreateShortcut(link)
sc.TargetPath = "wscript.exe"
sc.Arguments = """" & hidden & """"
sc.WorkingDirectory = base
sc.WindowStyle = 7
sc.Description = "MISHKAH Print Agent (starts after login, no admin)"
sc.Save

WScript.Echo "Startup shortcut created:"
WScript.Echo link
WScript.Echo ""
WScript.Echo "The agent will start hidden when this Windows user logs in."
WScript.Echo "Logs: " & base & "\logs\print-agent.log"

shell.Run "wscript.exe """ & hidden & """", 0, False
WScript.Echo "Agent started now in the background."
