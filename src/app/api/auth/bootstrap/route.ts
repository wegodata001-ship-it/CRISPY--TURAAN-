import { getAdminAuth, getAdminDb, hasAdminCredentials } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

const CONFIG_HINT =
  "Set FIREBASE_ADMIN_CLIENT_EMAIL and FIREBASE_ADMIN_PRIVATE_KEY from Firebase Console > Project settings > Service accounts > Generate new private key.";

function isConfigError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : "";
  return (
    message.includes("credentials missing") ||
    message.includes("BEGIN PRIVATE KEY") ||
    message.includes("Configuration Error")
  );
}

export async function POST() {
  try {
    const email = process.env.ADMIN_BOOTSTRAP_EMAIL?.trim();
    const password = process.env.ADMIN_BOOTSTRAP_PASSWORD;
    const displayName = process.env.ADMIN_BOOTSTRAP_NAME?.trim() || "CRISPY Admin";

    if (!email || !password) {
      return Response.json({
        bootstrapped: false,
        created: false,
        skipped: true,
        reason: "missing_bootstrap_env",
      });
    }

    if (!hasAdminCredentials()) {
      return Response.json({
        bootstrapped: false,
        created: false,
        skipped: true,
        reason: "missing_admin_sdk",
        error: CONFIG_HINT,
      });
    }

    const db = getAdminDb();
    const auth = getAdminAuth();

    const admins = await db
      .collection(COLLECTIONS.users)
      .where("role", "==", "Admin")
      .limit(1)
      .get();

    if (!admins.empty) {
      return Response.json({ bootstrapped: true, created: false });
    }

    let uid: string;
    try {
      const existing = await auth.getUserByEmail(email);
      uid = existing.uid;
    } catch {
      const created = await auth.createUser({
        email,
        password,
        displayName,
        emailVerified: true,
      });
      uid = created.uid;
    }

    await db.collection(COLLECTIONS.users).doc(uid).set({
      email,
      displayName,
      role: "Admin",
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({
      bootstrapped: true,
      created: true,
      email,
      message: "Admin user created. Change password after first login.",
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Bootstrap failed";
    if (isConfigError(error)) {
      return Response.json({
        bootstrapped: false,
        created: false,
        skipped: true,
        reason: "missing_admin_sdk",
        error: message,
      });
    }
    console.error("[auth/bootstrap]", message);
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
