import { config } from "dotenv";
import { resolve } from "path";
import { initializeApp, cert, getApps } from "firebase-admin/app";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { DEFAULT_AI_CONFIG } from "../src/lib/ai/types";

config({ path: resolve(".env") });

function getAdminDb() {
  if (getApps().length === 0) {
    const clientEmail = process.env.FIREBASE_ADMIN_CLIENT_EMAIL;
    const privateKey = process.env.FIREBASE_ADMIN_PRIVATE_KEY?.replace(/\\n/g, "\n");
    const projectId = process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID;
    if (!clientEmail || !privateKey || !projectId) {
      throw new Error("Firebase Admin credentials missing in .env");
    }
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
  }
  return getFirestore();
}

async function main() {
  const db = getAdminDb();
  await db
    .collection("settings")
    .doc("ai_assistant")
    .set({ ...DEFAULT_AI_CONFIG, updatedAt: FieldValue.serverTimestamp() }, { merge: true });
  console.log("✔ settings/ai_assistant seeded");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
