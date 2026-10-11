import fs from "node:fs";
import path from "node:path";
import {
  APPROVED_JSON,
  INSTALL_APK,
  PUBLIC_APK,
  VERSION_JSON,
  assertReleaseApk,
  projectRoot,
} from "./android-release-lib.mjs";

process.chdir(projectRoot());

try {
  const meta = JSON.parse(fs.readFileSync(VERSION_JSON, "utf8"));
  const checked = assertReleaseApk(INSTALL_APK, meta);
  if (checked.sha256 !== meta.sha256) {
    throw new Error("Refusing to approve an APK whose SHA-256 does not match version.json");
  }
  fs.mkdirSync(path.dirname(PUBLIC_APK), { recursive: true });
  fs.copyFileSync(INSTALL_APK, PUBLIC_APK);
  const release = {
    approved: true,
    versionCode: meta.versionCode,
    versionName: meta.versionName,
    required: process.env.CRISPY_UPDATE_REQUIRED === "true",
    sha256: checked.sha256,
    releaseNotes:
      process.env.CRISPY_RELEASE_NOTES ||
      "إصدار إنتاج موقّع مع فحص تحديثات داخل التطبيق. الطباعة تبقى على 192.168.1.80:9100.",
    releasedAt: meta.builtAt,
    packageName: meta.packageName,
  };
  fs.mkdirSync(path.dirname(APPROVED_JSON), { recursive: true });
  fs.writeFileSync(APPROVED_JSON, `${JSON.stringify(release, null, 2)}\n`);
  console.log(`APPROVED: ${release.versionName} (${release.versionCode})`);
  console.log(`APK SHA-256: ${release.sha256}`);
  console.log("PUBLIC URL: https://almostafachicken.com/downloads/crispy-printer/CRISPY-Printer.apk");
} catch (error) {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
