# MISHKAH standalone print agent

Café PC package. **Not** the website.

The kitchen computer should receive only the built folder:

`printer-agent-standalone/release/MISHKAH-PRINTER/`

Copy it to `C:\MISHKAH-PRINTER`.

It talks to the configured print API with `PRINT_AGENT_TOKEN` and prints to `192.168.1.80:9100`.

It does **not** need:

- the MISHKAH GitHub repo
- Firebase Admin keys
- Node.js installed (portable `node\node.exe` is included)
- a visible window after service install

## Build this package (developer PC)

```bat
cd printer-agent-standalone
npm install
npm run build
npm run package:win
```

Output: `release\MISHKAH-PRINTER\`

## Café install

```bat
xcopy /E /I release\MISHKAH-PRINTER C:\MISHKAH-PRINTER
cd C:\MISHKAH-PRINTER
copy .env.example .env
notepad .env
```

Set `PRINT_AGENT_TOKEN` to the **same** Vercel token. Keep:

```
PRINT_AGENT_ENABLED=true
PRINT_AGENT_API_URL=https://mishkatcafe.dev
PRINT_AGENT_ID=mishkah-kitchen-pc
PRINTER_IP=192.168.1.80
PRINTER_PORT=9100
```

Café auto-start **without Administrator password**:

```bat
C:\MISHKAH-PRINTER\install-startup.cmd
```

That adds a shortcut to the current user's Startup folder (`shell:startup`) and starts the agent hidden. It restarts after a crash. No Windows Service.

Optional admin-only service (not required):

```bat
C:\MISHKAH-PRINTER\install.cmd
```

Manual (foreground window):

```bat
C:\MISHKAH-PRINTER\start.cmd
C:\MISHKAH-PRINTER\verify.cmd
```

Logs: `C:\MISHKAH-PRINTER\logs\print-agent.log`

Uninstall (Administrator):

```bat
C:\MISHKAH-PRINTER\uninstall.cmd
```
