import { config } from "dotenv";
config({ path: ".env" });

import { getAdminAuth, getAdminDb } from "../src/lib/firebase/admin";
import { COLLECTIONS } from "../src/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";

const EMAIL = process.env.ADMIN_BOOTSTRAP_EMAIL ?? "admin@mishkat.cafe";
const PASSWORD = process.env.ADMIN_BOOTSTRAP_PASSWORD ?? "MishkatAdmin2026!";
const NAME = process.env.ADMIN_BOOTSTRAP_NAME ?? "MISHKAT Admin";

async function main() {
  const auth = getAdminAuth();
  const db = getAdminDb();

  let uid: string;
  try {
    const existing = await auth.getUserByEmail(EMAIL);
    uid = existing.uid;
    await auth.updateUser(uid, { password: PASSWORD, displayName: NAME, emailVerified: true });
    console.log("Updated existing auth user:", EMAIL);
  } catch {
    const created = await auth.createUser({
      email: EMAIL,
      password: PASSWORD,
      displayName: NAME,
      emailVerified: true,
    });
    uid = created.uid;
    console.log("Created auth user:", EMAIL);
  }

  await db.collection(COLLECTIONS.users).doc(uid).set(
    {
      email: EMAIL,
      displayName: NAME,
      role: "Admin",
      active: true,
      updatedAt: FieldValue.serverTimestamp(),
      createdAt: FieldValue.serverTimestamp(),
    },
    { merge: true }
  );

  console.log("Admin profile saved. UID:", uid);
  console.log("Login:", EMAIL, "/", PASSWORD);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
