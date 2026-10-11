import { NextResponse } from "next/server";
import { readApprovedAndroidRelease } from "@/lib/android-app/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/** Public approved-release metadata. No secrets, no development builds. */
export async function GET() {
  const release = readApprovedAndroidRelease();
  if (!release) {
    return NextResponse.json({ ok: false, error: "no approved release" }, { status: 404 });
  }
  return NextResponse.json({
    versionCode: release.versionCode,
    versionName: release.versionName,
    required: release.required,
    apkUrl: release.available ? release.apkUrl : null,
    sha256: release.sha256,
    releaseNotes: release.releaseNotes,
    releasedAt: release.releasedAt,
    available: release.available,
  });
}
