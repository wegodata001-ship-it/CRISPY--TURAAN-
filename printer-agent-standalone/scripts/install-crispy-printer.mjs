/**
 * Installs the CRISPY agent to C:\CRISPY-PRINTER.
 * Never writes to C:\MISHKAH-PRINTER.
 */
import { existsSync, mkdirSync, copyFileSync, cpSync, writeFileSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { execFileSync } from "node:child_process";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repo = resolve(root, "..");
const dest = "C:\\CRISPY-PRINTER";
const mishkah = "C:\\MISHKAH-PRINTER";
const release = resolve(root, "release", "MISHKAH-PRINTER");

if (dest.toLowerCase() === mishkah.toLowerCase()) {
  throw new Error("Refusing to install over MISHKAH-PRINTER");
}

execFileSync(process.execPath, [resolve(root, "scripts", "build.mjs")], {
  cwd: root,
  stdio: "inherit",
});

const nodeSrc = [
  resolve(release, "node", "node.exe"),
  resolve(mishkah, "node", "node.exe"),
].find((p) => existsSync(p));
if (!nodeSrc) {
  throw new Error("node.exe not found in release/MISHKAH-PRINTER or C:\\MISHKAH-PRINTER (read-only copy)");
}

const canvasSrc = [
  resolve(release, "node_modules"),
  resolve(root, "node_modules"),
].find((p) => existsSync(resolve(p, "@napi-rs", "canvas")));
if (!canvasSrc) {
  throw new Error("canvas native modules not found");
}

mkdirSync(resolve(dest, "dist"), { recursive: true });
mkdirSync(resolve(dest, "logs"), { recursive: true });
mkdirSync(resolve(dest, "node"), { recursive: true });
mkdirSync(resolve(dest, "node_modules"), { recursive: true });

copyFileSync(resolve(root, "dist", "agent.cjs"), resolve(dest, "dist", "agent.cjs"));
copyFileSync(nodeSrc, resolve(dest, "node", "node.exe"));
cpSync(canvasSrc, resolve(dest, "node_modules"), { recursive: true });

const win = resolve(root, "windows-crispy");
for (const name of [
  "start-hidden.vbs",
  "start-hidden.cmd",
  "start.cmd",
  "verify.cmd",
  "install-startup.cmd",
  "install-startup.vbs",
  "uninstall-startup.cmd",
  "README.txt",
]) {
  copyFileSync(resolve(win, name), resolve(dest, name));
}
copyFileSync(resolve(root, ".env.example"), resolve(dest, ".env.example"));

const allowed = new Set([
  "PRINT_AGENT_ENABLED",
  "PRINT_AGENT_API_URL",
  "PRINT_AGENT_TOKEN",
  "PRINT_AGENT_ID",
  "PRINTER_IP",
  "PRINTER_PORT",
  "PRINTER_TIMEOUT_MS",
  "PRINT_POLL_MS",
  "PRINT_HEARTBEAT_MS",
  "PRINTER_AUTO_CUT",
  "PRINTER_BEEP_ON_NEW_ORDER",
]);
const envSrc = resolve(repo, "printer-agent", ".env");
const lines = [
  "# CRISPY café agent only. No Firebase Admin keys.",
  "CRISPY_PRINTER_HOME=C:\\\\CRISPY-PRINTER",
];
if (existsSync(envSrc)) {
  for (const raw of readFileSync(envSrc, "utf8").split(/\r?\n/)) {
    const eq = raw.indexOf("=");
    if (eq <= 0) continue;
    const key = raw.slice(0, eq).trim();
    if (allowed.has(key)) lines.push(raw);
  }
}
if (!lines.some((line) => line.startsWith("PRINT_AGENT_API_URL="))) {
  lines.push("PRINT_AGENT_API_URL=https://portal.crispy-turaan.vercel.app");
}
if (!lines.some((line) => line.startsWith("PRINT_AGENT_ID="))) {
  lines.push("PRINT_AGENT_ID=crispy-kitchen-pc");
}
if (!lines.some((line) => line.startsWith("PRINTER_IP="))) {
  lines.push("PRINTER_IP=192.168.1.87");
}
if (!lines.some((line) => line.startsWith("PRINTER_PORT="))) {
  lines.push("PRINTER_PORT=9100");
}
if (!lines.some((line) => line.startsWith("PRINT_AGENT_ENABLED="))) {
  lines.push("PRINT_AGENT_ENABLED=true");
}
writeFileSync(resolve(dest, ".env"), `${lines.join("\n")}\n`);

console.log("Installed CRISPY agent at", dest);
console.log("MISHKAH path was not modified.");
