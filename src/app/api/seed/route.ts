import { NextResponse } from "next/server";
import { execSync } from "child_process";
import { resolve } from "path";

export async function POST() {
  try {
    const hasAdmin = !!(
      process.env.FIREBASE_SERVICE_ACCOUNT_JSON?.trim() ||
      (process.env.FIREBASE_ADMIN_CLIENT_EMAIL?.trim() &&
        process.env.FIREBASE_ADMIN_PRIVATE_KEY?.trim())
    );

    if (!hasAdmin) {
      return NextResponse.json(
        {
          success: false,
          error: "Firebase Admin SDK not configured",
          hint: "Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY in .env, then retry",
          fallback: "Catalog uses master-menu.ts locally until seed succeeds",
        },
        { status: 503 }
      );
    }

    execSync("npm run seed:force", {
      cwd: resolve("."),
      stdio: "pipe",
      env: process.env,
    });

    return NextResponse.json({
      success: true,
      message: "Master menu seeded to Firestore",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function GET() {
  return NextResponse.json({
    stats: {
      categories: 12,
      products: 105,
      popular: 34,
    },
    source: "src/data/master-menu.ts",
  });
}
