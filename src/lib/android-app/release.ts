import approvedReleaseFile from "@/data/android-release.json";
import { PRODUCTION_CUSTOMER_URL } from "@/lib/public-urls";

export const CRISPY_APK_PATH = "/downloads/crispy-printer/CRISPY-Printer.apk";
export const CRISPY_UPDATE_HOST = "almostafachicken.com";

export type ApprovedAndroidRelease = {
  versionCode: number;
  versionName: string;
  required: boolean;
  apkUrl: string;
  sha256: string;
  releaseNotes: string;
  releasedAt: string;
  available: boolean;
};

export function crispyApkUrl(): string {
  return `https://${CRISPY_UPDATE_HOST}${CRISPY_APK_PATH}`;
}

/** Only the approved CRISPY HTTPS path. Query strings and other hosts are rejected. */
export function isTrustedCrispyApkUrl(raw: string): boolean {
  try {
    const parsed = new URL(raw);
    return (
      parsed.protocol === "https:" &&
      parsed.hostname === CRISPY_UPDATE_HOST &&
      parsed.pathname === CRISPY_APK_PATH &&
      parsed.search === "" &&
      parsed.hash === ""
    );
  } catch {
    return false;
  }
}

export function readApprovedAndroidRelease(): ApprovedAndroidRelease | null {
  const raw = approvedReleaseFile;
  if (raw.approved !== true) return null;
  const versionCode = raw.versionCode;
  const versionName = raw.versionName;
  const sha256 = raw.sha256;
  if (typeof versionCode !== "number" || !Number.isInteger(versionCode) || versionCode < 1) {
    return null;
  }
  if (typeof versionName !== "string" || !versionName.trim()) return null;
  if (typeof sha256 !== "string" || !/^[a-f0-9]{64}$/.test(sha256)) return null;
  const apkUrl = crispyApkUrl();
  if (!isTrustedCrispyApkUrl(apkUrl)) return null;
  if (PRODUCTION_CUSTOMER_URL !== `https://${CRISPY_UPDATE_HOST}`) return null;
  return {
    versionCode,
    versionName: versionName.trim(),
    required: raw.required === true,
    apkUrl,
    sha256,
    releaseNotes: typeof raw.releaseNotes === "string" ? raw.releaseNotes : "",
    releasedAt: typeof raw.releasedAt === "string" ? raw.releasedAt : "",
    available: true,
  };
}
