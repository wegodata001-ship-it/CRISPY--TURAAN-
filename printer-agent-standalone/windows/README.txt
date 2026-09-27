MISHKAH Print Agent — café PC
==============================

This folder is the ONLY thing that belongs on the kitchen computer.
It does NOT contain the website, admin, checkout, or Firebase keys.

Install
-------
1. Copy this whole folder to:

   C:\MISHKAH-PRINTER

2. Copy .env.example to .env

   copy .env.example .env

3. Edit .env and set PRINT_AGENT_TOKEN to the SAME token as Vercel.

4. Double-click install-startup.cmd
   (normal user — NO Administrator password)

That will:
- put a shortcut in the Windows Startup folder
- start the agent hidden in the background
- restart the agent if it crashes
- log to logs\print-agent.log

The agent starts again after this Windows user logs in.

Optional admin-only service (not required):
Right-click install.cmd → Run as administrator.

Manual test (optional)
----------------------
start.cmd
verify.cmd

Logs
----
C:\MISHKAH-PRINTER\logs\print-agent.log

Uninstall
---------
Right-click uninstall.cmd → Run as administrator.

Do not put on this PC
---------------------
- full MISHKAH GitHub repo
- FIREBASE_ADMIN_PRIVATE_KEY
- FIREBASE_ADMIN_CLIENT_EMAIL
- website / admin / checkout source
