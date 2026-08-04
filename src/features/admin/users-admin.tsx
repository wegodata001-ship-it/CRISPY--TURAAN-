"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Pencil, Trash2, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, type UserRole } from "@/lib/auth/roles";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

export function UsersAdmin() {
  const { user: currentUser } = useAuth();
  const authFetch = useAuthFetch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    email: "",
    password: "",
    displayName: "",
    role: "Employee" as UserRole,
  });

  const loadUsers = useCallback(async () => {
    setLoading(true);
    const res = await authFetch("/api/admin/users");
    if (res.ok) {
      const data = await res.json();
      setUsers(data.users ?? []);
    }
    setLoading(false);
  }, [authFetch]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  if (currentUser?.role !== "Admin") {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-coffee/30" />
        <p className="mt-4 text-coffee/60">Admin access required</p>
      </div>
    );
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    const res = await authFetch("/api/admin/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    setSaving(false);
    if (!res.ok) {
      const data = await res.json();
      setError(data.error ?? "Failed to create user");
      return;
    }
    setOpen(false);
    setForm({ email: "", password: "", displayName: "", role: "Employee" });
    loadUsers();
  };

  const toggleActive = async (uid: string, active: boolean) => {
    await authFetch("/api/admin/users", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid, active }),
    });
    loadUsers();
  };

  const handleDelete = async (uid: string) => {
    if (!confirm("Delete this user permanently?")) return;
    await authFetch(`/api/admin/users?uid=${uid}`, { method: "DELETE" });
    loadUsers();
  };

  return (
    <div>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-dark-brown">Users</h1>
          <p className="text-sm text-coffee/60">Manage admin and staff accounts</p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4" />
          Add User
        </Button>
      </div>

      <div className="mt-6 overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft">
        <table className="w-full">
          <thead>
            <tr className="border-b border-beige-dark/20 bg-beige/30 text-left text-xs uppercase tracking-wider text-coffee/60">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-coffee/50">
                  Loading...
                </td>
              </tr>
            ) : (
              users.map((u) => (
                <motion.tr
                  key={u.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="border-b border-beige-dark/10 hover:bg-beige/20"
                >
                  <td className="px-4 py-3 text-sm font-medium">{u.displayName}</td>
                  <td className="px-4 py-3 text-sm text-coffee/70">{u.email}</td>
                  <td className="px-4 py-3 text-sm">{u.role}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, !u.active)}
                      className={`text-xs font-medium ${u.active ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {u.active ? "Active" : "Disabled"}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.uid && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(u.id)}>
                        <Trash2 className="h-3.5 w-3.5 text-red-500" />
                      </Button>
                    )}
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create User</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>Name</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>Password</Label>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                className="mt-1"
                required
                minLength={6}
              />
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create User"}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
