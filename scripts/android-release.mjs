import fs from "node:fs";
import path from "node:path";
import {
  ANDROID_DIR,
  INSTALL_APK,
  VERSION_JSON,
  assertProductionVersion,
  assertReleaseApk,
  projectRoot,
  readApprovedVersion,
  readGradleVersion,
  resolveSigning,
  runCommand,
  sha256File,
  writeGradleSigning,
  writeInstallMetadata,
} from "./android-release-lib.mjs";

const root = projectRoot();
process.chdir(root);
const verifyOnly = process.argv.includes("--verify");

function fail(error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}

function verifyExisting() {
  const meta = JSON.parse(fs.readFileSync(VERSION_JSON, "utf8"));
  const checked = assertReleaseApk(INSTALL_APK, meta);
  if (checked.sha256 !== meta.sha256) {
    throw new Error("CRISPY-TABLET-INSTALL APK SHA-256 does not match version.json");
  }
  if (checked.certificateSha256 !== meta.certificateSha256) {
    throw new Error("CRISPY-TABLET-INSTALL certificate does not match version.json");
  }
  console.log("BUILD TYPE: RELEASE");
  console.log(`PACKAGE: ${meta.packageName}`);
  console.log(`VERSION: ${meta.versionName} (${meta.versionCode})`);
  console.log("SIGNING: PASS");
  console.log(`APK SHA-256: ${checked.sha256}`);
  console.log(`APK PATH: ${INSTALL_APK}`);
}

if (verifyOnly) {
  try {
    verifyExisting();
  } catch (error) {
    fail(error);
  }
  process.exit(0);
}

let signingFile = "";
try {
  const next = readGradleVersion();
  const approved = readApprovedVersion();
  assertProductionVersion(next, approved);
  const signing = resolveSigning();
  if (!fs.existsSync(signing.storeFile)) throw new Error("Keystore file does not exist");
  signingFile = writeGradleSigning(signing);
  const gradlew = path.join(ANDROID_DIR, process.platform === "win32" ? "gradlew.bat" : "gradlew");
  runCommand(gradlew, ["assembleRelease"], { cwd: ANDROID_DIR, stdio: "inherit" });
  const built = path.join(ANDROID_DIR, "app", "build", "outputs", "apk", "release", "app-release.apk");
  const checked = assertReleaseApk(built, next);
  fs.mkdirSync(path.dirname(INSTALL_APK), { recursive: true });
  fs.copyFileSync(built, INSTALL_APK);
  const builtAt = new Date().toISOString();
  writeInstallMetadata({ ...next, ...checked, builtAt });
  console.log("BUILD TYPE: RELEASE");
  console.log(`VERSION: ${next.versionName} (${next.versionCode})`);
  console.log("SIGNING: PASS");
  console.log(`APK SHA-256: ${sha256File(INSTALL_APK)}`);
  console.log(`APK PATH: ${INSTALL_APK}`);
  console.log("APPROVED: NO — run npm run android:approve after checking this APK");
} catch (error) {
  fail(error);
} finally {
  if (signingFile && fs.existsSync(signingFile)) fs.rmSync(signingFile);
}
