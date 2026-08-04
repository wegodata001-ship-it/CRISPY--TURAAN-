import { NextRequest } from "next/server";
import { getAdminAuth, getAdminDb } from "@/lib/firebase/admin";
import { requireAdminOnly, getAuthFromRequest } from "@/lib/auth/verify-admin";
import { COLLECTIONS } from "@/lib/firebase/collections";
import { FieldValue } from "firebase-admin/firestore";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  displayName: z.string().min(1),
  role: z.enum(["Admin", "Manager", "Employee"]),
});

export async function GET(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;

  const db = getAdminDb();
  const snap = await db.collection(COLLECTIONS.users).orderBy("createdAt", "desc").get();
  const users = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  return Response.json({ users });
}

export async function POST(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;

  try {
    const body = createUserSchema.parse(await request.json());
    const adminAuth = getAdminAuth();
    const db = getAdminDb();

    const created = await adminAuth.createUser({
      email: body.email,
      password: body.password,
      displayName: body.displayName,
    });

    await db.collection(COLLECTIONS.users).doc(created.uid).set({
      email: body.email,
      displayName: body.displayName,
      role: body.role,
      active: true,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    return Response.json({ id: created.uid, email: body.email });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to create user";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function PATCH(request: NextRequest) {
  const current = await getAuthFromRequest(request);
  if (!current) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { uid, ...updates } = await request.json();
    if (!uid) return Response.json({ error: "uid required" }, { status: 400 });

    const db = getAdminDb();
    const adminAuth = getAdminAuth();

    if (uid !== current.uid && current.role !== "Admin") {
      return Response.json({ error: "Admin only" }, { status: 403 });
    }

    const patch: Record<string, unknown> = { updatedAt: FieldValue.serverTimestamp() };
    if (updates.displayName) patch.displayName = updates.displayName;
    if (updates.role && current.role === "Admin") patch.role = updates.role;
    if (updates.active !== undefined && current.role === "Admin") patch.active = updates.active;

    await db.collection(COLLECTIONS.users).doc(uid).update(patch);

    if (updates.displayName) {
      await adminAuth.updateUser(uid, { displayName: updates.displayName });
    }
    if (updates.password) {
      await adminAuth.updateUser(uid, { password: updates.password });
    }
    if (updates.active === false && current.role === "Admin") {
      await adminAuth.updateUser(uid, { disabled: true });
    }
    if (updates.active === true && current.role === "Admin") {
      await adminAuth.updateUser(uid, { disabled: false });
    }

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Update failed";
    return Response.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  const auth = await requireAdminOnly(request);
  if (auth instanceof Response) return auth;

  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get("uid");
    if (!uid) return Response.json({ error: "uid required" }, { status: 400 });
    if (uid === auth.uid) return Response.json({ error: "Cannot delete yourself" }, { status: 400 });

    await getAdminAuth().deleteUser(uid);
    await getAdminDb().collection(COLLECTIONS.users).doc(uid).delete();

    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Delete failed";
    return Response.json({ error: message }, { status: 400 });
  }
}
