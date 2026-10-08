CRISPY Print Agent — restaurant PC
==================================

Install path:

  C:\CRISPY-PRINTER

Do not modify:

  C:\MISHKAH-PRINTER

This folder is the only CRISPY print process on the kitchen computer.
It does not contain the website, admin, checkout, or Firebase Admin keys.

1. Copy this whole folder to C:\CRISPY-PRINTER
2. Keep .env with:
   PRINT_AGENT_API_URL=https://portal.crispy-turaan.vercel.app
   PRINTER_IP=192.168.1.87
   PRINTER_PORT=9100
3. Double-click install-startup.cmd
   (normal user — no Administrator password)

Logs:

  C:\CRISPY-PRINTER\logs\print-agent.log

The restaurant PC should print over Ethernet.
Wi-Fi on the same 192.168.1.x subnet can send jobs to the wrong device.
The agent will warn; it will not disable Wi-Fi.
