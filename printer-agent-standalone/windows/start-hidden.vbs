' Hidden MISHKAH print agent + crash restart.
' No Administrator rights. No console window.
Option Explicit

Dim fso, shell, wmi, base, nodeExe, agentJs, logFile
Dim procs, p, already, countWatch, rc

Set fso = CreateObject("Scripting.FileSystemObject")
Set shell = CreateObject("WScript.Shell")
base = fso.GetParentFolderName(WScript.ScriptFullName)
nodeExe = base & "\node\node.exe"
agentJs = base & "\dist\agent.cjs"
logFile = base & "\logs\print-agent.log"

If Not fso.FileExists(base & "\.env") Then
  AppendLog "ERROR missing .env — copy .env.example to .env"
  WScript.Quit 1
End If
If Not fso.FileExists(nodeExe) Then
  AppendLog "ERROR missing node\node.exe"
  WScript.Quit 1
End If
If Not fso.FileExists(agentJs) Then
  AppendLog "ERROR missing dist\agent.cjs"
  WScript.Quit 1
End If

On Error Resume Next
Set wmi = GetObject("winmgmts:\\.\root\cimv2")
On Error GoTo 0

countWatch = 0
If Not wmi Is Nothing Then
  Set procs = wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='wscript.exe' OR Name='cscript.exe'")
  For Each p In procs
    If InStr(LCase("" & p.CommandLine), "start-hidden.vbs") > 0 Then
      countWatch = countWatch + 1
    End If
  Next
End If
If countWatch > 1 Then
  WScript.Quit 0
End If

shell.CurrentDirectory = base
AppendLog "Watchdog started (hidden, user login, no admin)"

Do
  already = AgentRunning()
  If already Then
    WScript.Sleep 15000
  Else
    AppendLog "Starting agent"
    rc = shell.Run("""" & nodeExe & """ """ & agentJs & """", 0, True)
    AppendLog "Agent exited code " & rc & " — restarting in 5s"
    WScript.Sleep 5000
  End If
Loop

Function AgentRunning()
  Dim q, proc
  AgentRunning = False
  If wmi Is Nothing Then Exit Function
  On Error Resume Next
  Set q = wmi.ExecQuery("SELECT CommandLine FROM Win32_Process WHERE Name='node.exe'")
  For Each proc In q
    If InStr(LCase("" & proc.CommandLine), "dist\agent.cjs") > 0 Then
      AgentRunning = True
      Exit Function
    End If
    If InStr(LCase("" & proc.CommandLine), "dist/agent.cjs") > 0 Then
      AgentRunning = True
      Exit Function
    End If
  Next
  On Error GoTo 0
End Function

Sub AppendLog(msg)
  Dim folder, ts, stream
  On Error Resume Next
  folder = base & "\logs"
  If Not fso.FolderExists(folder) Then fso.CreateFolder folder
  ts = Year(Now) & "-" & Pad(Month(Now)) & "-" & Pad(Day(Now)) & "T" & Pad(Hour(Now)) & ":" & Pad(Minute(Now)) & ":" & Pad(Second(Now))
  Set stream = fso.OpenTextFile(logFile, 8, True)
  stream.WriteLine ts & " [INFO] " & msg
  stream.Close
  On Error GoTo 0
End Sub

Function Pad(n)
  If n < 10 Then
    Pad = "0" & n
  Else
    Pad = "" & n
  End If
End Function
