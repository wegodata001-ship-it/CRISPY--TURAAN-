/**
 * Builds a copy-ready café folder:
 *   printer-agent-standalone/release/MISHKAH-PRINTER/
 *
 * Contains portable Node, WinSW service exe, bundled agent, canvas native, scripts.
 */
import { createWriteStream, existsSync, mkdirSync, cpSync, copyFileSync, rmSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { pipeline } from "node:stream/promises";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const release = resolve(root, "release", "MISHKAH-PRINTER");
const vendor = resolve(root, "vendor");
const NODE_VERSION = "22.17.0";
const NODE_ZIP = `node-v${NODE_VERSION}-win-x64.zip`;
const NODE_URL = `https://nodejs.org/dist/v${NODE_VERSION}/${NODE_ZIP}`;
const WINSW_URL =
  "https://github.com/winsw/winsw/releases/download/v2.12.0/WinSW-x64.exe";

async function download(url, dest) {
  if (existsSync(dest)) return;
  mkdirSync(dirname(dest), { recursive: true });
  console.log("Downloading", url);
  const res = await fetch(url, { redirect: "follow" });
  if (!res.ok || !res.body) throw new Error(`Download failed ${url} HTTP ${res.status}`);
  await pipeline(res.body, createWriteStream(dest));
}

function copyCanvas(destModules) {
  const canvasRoot = dirname(require.resolve("@napi-rs/canvas/package.json"));
  const destCanvas = resolve(destModules, "@napi-rs", "canvas");
  mkdirSync(destCanvas, { recursive: true });
  cpSync(canvasRoot, destCanvas, { recursive: true });

  for (const extra of ["@napi-rs/canvas-win32-x64-msvc"]) {
    try {
      const extraRoot = dirname(require.resolve(`${extra}/package.json`));
      const dest = resolve(destModules, ...extra.split("/"));
      mkdirSync(dest, { recursive: true });
      cpSync(extraRoot, dest, { recursive: true });
    } catch {
      console.warn("Optional native package not found:", extra);
    }
  }
}

mkdirSync(vendor, { recursive: true });
await download(NODE_URL, resolve(vendor, NODE_ZIP));
await download(WINSW_URL, resolve(vendor, "WinSW-x64.exe"));

if (existsSync(release)) rmSync(release, { recursive: true, force: true });
mkdirSync(resolve(release, "dist"), { recursive: true });
mkdirSync(resolve(release, "logs"), { recursive: true });
mkdirSync(resolve(release, "node"), { recursive: true });
mkdirSync(resolve(release, "node_modules"), { recursive: true });

const unzipDir = resolve(vendor, `node-v${NODE_VERSION}-win-x64`);
if (!existsSync(resolve(unzipDir, "node.exe"))) {
  execFileSync("tar", ["-xf", NODE_ZIP, "-C", vendor], { cwd: vendor, stdio: "inherit" });
}
copyFileSync(resolve(unzipDir, "node.exe"), resolve(release, "node", "node.exe"));
copyFileSync(resolve(root, "dist", "agent.cjs"), resolve(release, "dist", "agent.cjs"));
copyFileSync(resolve(root, ".env.example"), resolve(release, ".env.example"));
copyFileSync(resolve(vendor, "WinSW-x64.exe"), resolve(release, "MishkahPrintAgent.exe"));
copyFileSync(resolve(root, "windows", "MishkahPrintAgent.xml"), resolve(release, "MishkahPrintAgent.xml"));
copyFileSync(resolve(root, "windows", "install.cmd"), resolve(release, "install.cmd"));
copyFileSync(resolve(root, "windows", "uninstall.cmd"), resolve(release, "uninstall.cmd"));
copyFileSync(resolve(root, "windows", "start.cmd"), resolve(release, "start.cmd"));
copyFileSync(resolve(root, "windows", "start-hidden.cmd"), resolve(release, "start-hidden.cmd"));
copyFileSync(resolve(root, "windows", "start-hidden.vbs"), resolve(release, "start-hidden.vbs"));
copyFileSync(resolve(root, "windows", "install-startup.cmd"), resolve(release, "install-startup.cmd"));
copyFileSync(resolve(root, "windows", "install-startup.vbs"), resolve(release, "install-startup.vbs"));
copyFileSync(resolve(root, "windows", "uninstall-startup.cmd"), resolve(release, "uninstall-startup.cmd"));
copyFileSync(resolve(root, "windows", "verify.cmd"), resolve(release, "verify.cmd"));
copyFileSync(resolve(root, "windows", "README.txt"), resolve(release, "README.txt"));
copyCanvas(resolve(release, "node_modules"));

console.log("Release folder ready:", release);
