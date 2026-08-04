import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

export async function POST() {
  try {
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

    const email =
      process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@mishkat.cafe";
    const password =
      process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "MishkatAdmin2026!";
    const displayName =
      process.env.ADMIN_BOOTSTRAP_NAME ?? "MISHKAT Admin";

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
    return Response.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  return POST();
}
