import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

function fromModuleUrl(moduleUrl) {
  const decoded = decodeURIComponent(new URL(moduleUrl).pathname);
  const native = process.platform === "win32" && decoded.startsWith("/") ? decoded.slice(1) : decoded;
  return path.resolve(path.dirname(native), "..");
}

export const ROOT = fromModuleUrl(import.meta.url);
export const ANDROID_DIR = path.join(ROOT, "android-crispy-printer");
export const GRADLE_FILE = path.join(ANDROID_DIR, "app", "build.gradle.kts");
export const INSTALL_DIR = path.join(ROOT, "CRISPY-TABLET-INSTALL");
export const INSTALL_APK = path.join(INSTALL_DIR, "CRISPY-Printer.apk");
export const VERSION_JSON = path.join(INSTALL_DIR, "version.json");
export const README_PATH = path.join(INSTALL_DIR, "README.txt");
export const PUBLIC_APK = path.join(ROOT, "public", "downloads", "crispy-printer", "CRISPY-Printer.apk");
export const APPROVED_JSON = path.join(ROOT, "src", "data", "android-release.json");
export const PACKAGE_NAME = "com.crispy.turaan.printer";
/** Certificate already installed on the production tablet. Never replace it. */
export const PINNED_CERT_SHA256 = "1748c43f45648e157717b2891fe8e9f1d9e4f0b8e168fc0435173a7bb412d25b";

export function projectRoot() {
  return ROOT;
}

export function sha256File(filePath) {
  const hash = createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

export function readGradleVersion(gradlePath = GRADLE_FILE) {
  const text = fs.readFileSync(gradlePath, "utf8");
  const code = text.match(/versionCode\s*=\s*(\d+)/);
  const name = text.match(/versionName\s*=\s*"([^"]+)"/);
  const applicationId = text.match(/applicationId\s*=\s*"([^"]+)"/);
  if (!code || !name || !applicationId) {
    throw new Error("Android version source is missing versionCode, versionName, or applicationId");
  }
  return {
    versionCode: Number(code[1]),
    versionName: name[1],
    applicationId: applicationId[1],
  };
}

export function readApprovedVersion(filePath = APPROVED_JSON) {
  if (!fs.existsSync(filePath)) return null;
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (raw.approved !== true || !Number.isInteger(raw.versionCode)) return null;
  return raw;
}

export function assertProductionVersion(next, approved) {
  if (!Number.isInteger(next.versionCode) || next.versionCode < 1) {
    throw new Error("versionCode must be a positive integer");
  }
  if (!next.versionName?.trim()) throw new Error("versionName is required");
  if (next.applicationId !== PACKAGE_NAME) {
    throw new Error(`package must stay ${PACKAGE_NAME}`);
  }
  if (approved && next.versionCode <= approved.versionCode) {
    throw new Error(
      `versionCode ${next.versionCode} is not newer than approved production versionCode ${approved.versionCode}. Increment versionCode before building.`
    );
  }
}

export function findBuildTool(name) {
  const roots = [
    process.env.ANDROID_HOME,
    process.env.ANDROID_SDK_ROOT,
    process.env.LOCALAPPDATA ? path.join(process.env.LOCALAPPDATA, "Android", "Sdk") : "",
  ].filter(Boolean);
  for (const root of roots) {
    const tools = path.join(root, "build-tools");
    if (!fs.existsSync(tools)) continue;
    const versions = fs.readdirSync(tools).sort().reverse();
    for (const version of versions) {
      const candidate = path.join(tools, version, process.platform === "win32" ? `${name}.exe` : name);
      const bat = path.join(tools, version, `${name}.bat`);
      if (fs.existsSync(candidate)) return candidate;
      if (fs.existsSync(bat)) return bat;
    }
  }
  throw new Error(`Android ${name} was not found. Install Android SDK build-tools.`);
}

function runFile(file, args, options = {}) {
  if (process.platform === "win32" && file.toLowerCase().endsWith(".bat")) {
    return execFileSync("cmd.exe", ["/d", "/s", "/c", file, ...args], options);
  }
  return execFileSync(file, args, options);
}

export function runCommand(file, args, options = {}) {
  return runFile(file, args, options);
}

export function certificateSha256(apkPath) {
  const apksigner = findBuildTool("apksigner");
  const output = runFile(apksigner, ["verify", "--print-certs", apkPath], { encoding: "utf8" });
  const match = output.match(/certificate SHA-256 digest:\s*([a-f0-9]+)/i);
  if (!match) throw new Error("APK certificate could not be read");
  return match[1].toLowerCase();
}

export function assertReleaseApk(apkPath, expected) {
  if (!fs.existsSync(apkPath)) throw new Error(`APK missing: ${apkPath}`);
  const aapt = findBuildTool("aapt");
  const badging = execFileSync(aapt, ["dump", "badging", apkPath], { encoding: "utf8" });
  const pkg = badging.match(/package: name='([^']+)' versionCode='(\d+)' versionName='([^']+)'/);
  if (!pkg) throw new Error("APK package metadata could not be read");
  if (pkg[1] !== PACKAGE_NAME) throw new Error(`unexpected package ${pkg[1]}`);
  if (Number(pkg[2]) !== expected.versionCode) {
    throw new Error(`APK versionCode ${pkg[2]} does not match ${expected.versionCode}`);
  }
  if (pkg[3] !== expected.versionName) {
    throw new Error(`APK versionName ${pkg[3]} does not match ${expected.versionName}`);
  }
  if (/application-debuggable/.test(badging)) {
    throw new Error("APK is debuggable. Distribution builds must be release.");
  }
  const cert = certificateSha256(apkPath);
  if (cert !== PINNED_CERT_SHA256) {
    throw new Error("APK signing certificate does not match the tablet certificate. A new key cannot update the installed app.");
  }
  return { sha256: sha256File(apkPath), certificateSha256: cert, debuggable: false };
}

function signingDir() {
  return path.join(os.homedir(), ".crispy-signing");
}

function readProperties(filePath) {
  const values = {};
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const index = trimmed.indexOf("=");
    if (index < 1) continue;
    values[trimmed.slice(0, index).trim()] = trimmed.slice(index + 1).trim();
  }
  return values;
}

export function resolveSigning() {
  const fromEnv = {
    storeFile: process.env.CRISPY_KEYSTORE_FILE || "",
    storePassword: process.env.CRISPY_KEYSTORE_PASSWORD || "",
    keyAlias: process.env.CRISPY_KEY_ALIAS || "",
    keyPassword: process.env.CRISPY_KEY_PASSWORD || "",
  };
  if (fromEnv.storeFile && fromEnv.storePassword && fromEnv.keyAlias && fromEnv.keyPassword) {
    return fromEnv;
  }
  const propertiesPath = path.join(signingDir(), "keystore.properties");
  if (fs.existsSync(propertiesPath)) return readProperties(propertiesPath);
  throw new Error(
    "Signing identity missing. Set CRISPY_KEYSTORE_FILE, CRISPY_KEYSTORE_PASSWORD, CRISPY_KEY_ALIAS, and CRISPY_KEY_PASSWORD, or create %USERPROFILE%\\.crispy-signing\\keystore.properties. Do not generate a new key."
  );
}

export function writeGradleSigning(signing) {
  const destination = path.join(ANDROID_DIR, "keystore.properties");
  const body = [
    `storeFile=${signing.storeFile.replace(/\\/g, "/")}`,
    `storePassword=${signing.storePassword}`,
    `keyAlias=${signing.keyAlias}`,
    `keyPassword=${signing.keyPassword}`,
    "",
  ].join("\n");
  fs.writeFileSync(destination, body, { encoding: "utf8" });
  return destination;
}

export function writeInstallMetadata({ versionCode, versionName, sha256, certificateSha256, builtAt }) {
  fs.mkdirSync(INSTALL_DIR, { recursive: true });
  const version = {
    versionCode,
    versionName,
    packageName: PACKAGE_NAME,
    buildType: "release",
    debuggable: false,
    sha256,
    builtAt,
    certificateSha256,
  };
  fs.writeFileSync(VERSION_JSON, `${JSON.stringify(version, null, 2)}\n`);
  const readme = `CRISPY Printer — Android tablet
================================

Current version: ${versionName}
versionCode: ${versionCode}
Build date: ${builtAt}
Package name: ${PACKAGE_NAME}
Build type: release
SHA-256: ${sha256}

Install the file:

  CRISPY-Printer.apk

1. Send CRISPY-Printer.apk to the Android tablet.
2. Download it.
3. Open the APK.
4. If Android blocks installation, allow "Install unknown apps" for the app used to open it.
5. Install CRISPY Printer over the existing app. Do not uninstall first.
6. Open it once.
7. Approve the notification permission and the battery prompt.
8. Connect the tablet to the same reachable local network as printer 192.168.1.80.
9. Press "اختبار الطباعة".
10. Confirm that physical paper came out.
11. In settings, enter the agent token and press "حفظ" only if it is not already saved.
12. In the CRISPY admin printer page, confirm the agent shows ONLINE.

Update an installed tablet:

1. Open CRISPY Printer.
2. If a newer approved version exists, the app shows "يتوفر تحديث جديد".
3. Press "تحديث التطبيق".
4. Confirm the Android installation screen. The app does not install silently.
5. Open the app once if Android asks.
6. Printing, the agent token, and printer 192.168.1.80:9100 stay in place.

Production API:
  https://almostafachicken.com

Admin portal:
  https://portal.almostafachicken.com/

Printer:
  192.168.1.80:9100

The printer stays on the local network. Do not forward port 9100 to the internet.
`;
  fs.writeFileSync(README_PATH, readme);
  return version;
}
