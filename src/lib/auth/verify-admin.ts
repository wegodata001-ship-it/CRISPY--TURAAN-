import { NextRequest } from "next/server";
import { verifyIdToken, getAdminDb } from "@/lib/firebase/admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { FirestoreUser } from "@/types/firestore";
import { canManageUsers } from "./roles";

export interface AuthContext {
  uid: string;
  email: string;
  role: string;
  displayName: string;
}

export async function getAuthFromRequest(
  request: NextRequest
): Promise<AuthContext | null> {
  const header = request.headers.get("authorization");
  if (!header?.startsWith("Bearer ")) return null;

  try {
    const token = header.slice(7);
    const decoded = await verifyIdToken(token);
    const db = getAdminDb();
    const snap = await db.collection(COLLECTIONS.users).doc(decoded.uid).get();
    if (!snap.exists) return null;

    const user = snap.data() as FirestoreUser;
    if (!user.active) return null;

    return {
      uid: decoded.uid,
      email: decoded.email ?? user.email,
      role: user.role,
      displayName: user.displayName,
    };
  } catch {
    return null;
  }
}

export async function requireAdmin(
  request: NextRequest
): Promise<AuthContext | Response> {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(auth.role) && auth.role !== "Manager") {
    return Response.json({ error: "Forbidden" }, { status: 403 });
  }
  return auth;
}

export async function requireAdminOnly(
  request: NextRequest
): Promise<AuthContext | Response> {
  const auth = await getAuthFromRequest(request);
  if (!auth) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageUsers(auth.role)) {
    return Response.json({ error: "Admin only" }, { status: 403 });
  }
  return auth;
}
