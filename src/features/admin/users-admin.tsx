"use client";

import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Plus, Trash2, Loader2, Shield } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
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
import { AdminPageHeader } from "./components/admin-page-header";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
}

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  Admin: "admin.role.admin",
  Manager: "admin.role.manager",
  Employee: "admin.role.employee",
};

export function UsersAdmin() {
  const t = useT();
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

  const roleLabel = (role: UserRole) => t(ROLE_LABEL_KEYS[role]);

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
        <p className="mt-4 text-coffee/60">{t("admin.users.noAccess")}</p>
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
      setError(data.error ?? t("admin.error.createUser"));
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
    if (!confirm(t("admin.users.deleteConfirm"))) return;
    await authFetch(`/api/admin/users?uid=${uid}`, { method: "DELETE" });
    loadUsers();
  };

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title={t("admin.users.title")}
        subtitle={t("admin.users.subtitle")}
        actions={
          <Button onClick={() => setOpen(true)}>
            <Plus className="h-4 w-4" />
            {t("admin.users.new")}
          </Button>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-beige-dark/20 bg-warm-white shadow-soft">
        <table className="w-full">
          <thead>
            <tr className="border-b border-beige-dark/20 bg-beige/30 text-left text-xs uppercase tracking-wider text-coffee/60">
              <th className="px-4 py-3">{t("admin.users.displayName")}</th>
              <th className="px-4 py-3">{t("admin.email")}</th>
              <th className="px-4 py-3">{t("admin.users.role")}</th>
              <th className="px-4 py-3">{t("admin.table.status")}</th>
              <th className="px-4 py-3 text-right">{t("admin.table.actions")}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-sm text-coffee/50">
                  {t("admin.loading")}
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
                  <td className="px-4 py-3 text-sm">{roleLabel(u.role)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => toggleActive(u.id, !u.active)}
                      className={`text-xs font-medium ${u.active ? "text-emerald-600" : "text-red-500"}`}
                    >
                      {u.active ? t("admin.status.active") : t("admin.status.disabled")}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {u.id !== currentUser?.uid && (
                      <Button variant="ghost" size="icon-sm" onClick={() => handleDelete(u.id)} title={t("admin.action.delete")}>
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
            <DialogTitle>{t("admin.users.create")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label>{t("admin.users.displayName")}</Label>
              <Input
                value={form.displayName}
                onChange={(e) => setForm({ ...form, displayName: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>{t("admin.email")}</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                className="mt-1"
                required
              />
            </div>
            <div>
              <Label>{t("admin.password")}</Label>
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
              <Label>{t("admin.users.role")}</Label>
              <Select
                value={form.role}
                onValueChange={(v) => setForm({ ...form, role: v as UserRole })}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ROLES.map((r) => (
                    <SelectItem key={r} value={r}>{roleLabel(r)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <Button type="submit" className="w-full" disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.users.create")}
            </Button>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
