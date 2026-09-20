# MISHKAH local print agent

This process runs on the **restaurant Windows PC**. It is the only component that opens TCP `PRINTER_IP:9100`.

Do **not** run it on Vercel. The cloud only creates `PrintJob` documents.

## 1. Configure

Copy this file to `printer-agent/.env` (or add the same keys to the repo `.env`):

```
PRINT_AGENT_ENABLED=true
PRINT_AGENT_TOKEN=replace-with-a-long-random-secret
PRINT_AGENT_API_URL=https://mishkatcafe.dev
PRINT_AGENT_ID=mishkah-kitchen-pc

PRINTER_IP=192.168.1.87
PRINTER_PORT=9100
PRINTER_TIMEOUT_MS=8000
PRINTER_AUTO_CUT=true
PRINTER_BEEP_ON_NEW_ORDER=true
PRINT_POLL_MS=3000
PRINT_HEARTBEAT_MS=30000
```

Use the **same** `PRINT_AGENT_TOKEN` in Vercel / production env.

Keep `PRINT_AUTO_NEW_ORDERS=false` on the server until a test receipt is confirmed on paper.

## 2. Start

From the repo root, on the restaurant PC:

```
npm run print-agent
```

The PC must be on the same LAN as `192.168.1.87`.

## 3. Test

1. Open Admin → Kitchen printer (`/admin/printer`)
2. Confirm Local Agent is **Online**
3. Click **Print test order (AR)** then HE / EN
4. Confirm Arabic shaping, modifiers, pickup-only, cutter
5. Only then set `PRINT_AUTO_NEW_ORDERS=true` on the server
