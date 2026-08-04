"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  setPersistence,
  browserLocalPersistence,
  browserSessionPersistence,
  type User,
} from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { getFirebaseAuth, getDb } from "@/lib/firebase";
import { COLLECTIONS } from "@/lib/firebase/collections";
import type { UserRole } from "@/lib/auth/roles";

interface AuthUser {
  uid: string;
  email: string;
  displayName: string;
  role: UserRole;
}

interface AuthContextValue {
  user: AuthUser | null;
  firebaseUser: User | null;
  loading: boolean;
  login: (email: string, password: string, remember?: boolean) => Promise<void>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  getIdToken: () => Promise<string | null>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

async function fetchUserProfile(uid: string): Promise<AuthUser | null> {
  const db = getDb();
  const snap = await getDoc(doc(db, COLLECTIONS.users, uid));
  if (!snap.exists()) return null;
  const data = snap.data();
  if (!data.active) return null;
  return {
    uid,
    email: data.email,
    displayName: data.displayName,
    role: data.role as UserRole,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/bootstrap", { method: "POST" }).catch(() => {});

    const auth = getFirebaseAuth();
    const unsub = onAuthStateChanged(auth, async (fbUser) => {
      setFirebaseUser(fbUser);
      if (fbUser) {
        const profile = await fetchUserProfile(fbUser.uid);
        setUser(profile);
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  const login = useCallback(
    async (email: string, password: string, remember = true) => {
      const auth = getFirebaseAuth();
      await setPersistence(
        auth,
        remember ? browserLocalPersistence : browserSessionPersistence
      );
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const profile = await fetchUserProfile(cred.user.uid);
      if (!profile) {
        await signOut(auth);
        throw new Error("User profile not found or inactive");
      }
      setUser(profile);
    },
    []
  );

  const logout = useCallback(async () => {
    await signOut(getFirebaseAuth());
    setUser(null);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await sendPasswordResetEmail(getFirebaseAuth(), email);
  }, []);

  const getIdToken = useCallback(async () => {
    const auth = getFirebaseAuth();
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }, []);

  return (
    <AuthContext.Provider
      value={{ user, firebaseUser, loading, login, logout, resetPassword, getIdToken }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
