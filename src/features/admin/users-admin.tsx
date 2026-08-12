"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  KeyRound,
  Loader2,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Trash2,
  UserRound,
  UsersRound,
} from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { useAuthFetch } from "@/lib/auth/auth-fetch";
import { useT } from "@/components/providers/locale-provider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AdminModal,
  AdminModalBody,
  AdminModalFooter,
  AdminModalHeader,
  AdminModalTitle,
} from "@/features/admin/components/admin-modal";
import {
  AdminToastStack,
  createToast,
  type AdminToast,
} from "@/features/admin/components/admin-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLES, type UserRole } from "@/lib/auth/roles";
import { AdminPageHeader } from "./components/admin-page-header";
import { cn } from "@/lib/utils";

interface AdminUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  active: boolean;
  lastSignInAt?: string | null;
}

type UserForm = {
  email: string;
  password: string;
  displayName: string;
  role: UserRole;
  active: boolean;
};

const EMPTY_FORM: UserForm = {
  email: "",
  password: "",
  displayName: "",
  role: "Employee",
  active: true,
};

const ROLE_LABEL_KEYS: Record<UserRole, string> = {
  Admin: "admin.role.admin",
  Manager: "admin.role.manager",
  Employee: "admin.role.employee",
};

const REQUEST_TIMEOUT_MS = 10_000;

function initials(user: AdminUser): string {
  const value = user.displayName.trim() || user.email;
  const words = value.split(/\s+/).filter(Boolean);
  return (words.length > 1 ? `${words[0][0]}${words[1][0]}` : value.slice(0, 2)).toUpperCase();
}

function StatusSwitch({
  checked,
  disabled,
  label,
  onChange,
}: {
  checked: boolean;
  disabled?: boolean;
  label: string;
  onChange: () => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className="inline-flex min-h-11 items-center gap-2 disabled:cursor-not-allowed disabled:opacity-50"
    >
      <span className={cn("relative h-7 w-12 rounded-full transition-colors", checked ? "bg-turquoise" : "bg-stone-300")}>
        <span className={cn("absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "start-6" : "start-1")} />
      </span>
      <span className={cn("text-xs font-semibold", checked ? "text-emerald-700" : "text-stone-500")}>
        {label}
      </span>
    </button>
  );
}

export function UsersAdmin() {
  const t = useT();
  const {
    user: currentUser,
    loading: authLoading,
    resetPassword,
  } = useAuth();
  const authFetch = useAuthFetch();
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | UserRole>("all");
  const [dialogUser, setDialogUser] = useState<AdminUser | null | undefined>(undefined);
  const [deleteUser, setDeleteUser] = useState<AdminUser | null>(null);
  const [form, setForm] = useState<UserForm>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [toasts, setToasts] = useState<AdminToast[]>([]);
  const requestRef = useRef(0);

  const roleLabel = useCallback((role: UserRole) => t(ROLE_LABEL_KEYS[role]), [t]);

  const loadUsers = useCallback(async () => {
    const requestId = ++requestRef.current;
    const controller = new AbortController();
    let timeout = 0;
    setLoading(true);
    setLoadError(null);
    try {
      const response = await Promise.race([
        authFetch("/api/admin/users", { signal: controller.signal }),
        new Promise<never>((_, reject) => {
          timeout = window.setTimeout(() => {
            controller.abort();
            reject(new DOMException("Request timed out", "AbortError"));
          }, REQUEST_TIMEOUT_MS);
        }),
      ]);
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(data.error || t("admin.users.loadError"));
      }
      if (requestId === requestRef.current) {
        setUsers(Array.isArray(data.users) ? data.users : []);
      }
    } catch (error) {
      if (requestId !== requestRef.current) return;
      console.error("[UsersAdmin] load failed", error);
      setLoadError(
        error instanceof DOMException && error.name === "AbortError"
          ? t("admin.users.loadTimeout")
          : error instanceof Error
            ? error.message
            : t("admin.users.loadError")
      );
    } finally {
      window.clearTimeout(timeout);
      if (requestId === requestRef.current) setLoading(false);
    }
  }, [authFetch, t]);

  useEffect(() => {
    if (!authLoading && currentUser?.role === "Admin") void loadUsers();
  }, [authLoading, currentUser?.role, loadUsers]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLocaleLowerCase();
    return users.filter((user) => {
      const matchesSearch =
        !query ||
        user.displayName.toLocaleLowerCase().includes(query) ||
        user.email.toLocaleLowerCase().includes(query);
      return matchesSearch && (roleFilter === "all" || user.role === roleFilter);
    });
  }, [roleFilter, search, users]);

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setFormError(null);
    setDialogUser(null);
  };

  const openEdit = (user: AdminUser) => {
    setForm({
      email: user.email,
      password: "",
      displayName: user.displayName,
      role: user.role,
      active: user.active,
    });
    setFormError(null);
    setDialogUser(user);
  };

  const saveUser = async (event: React.FormEvent) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError(null);
    try {
      const isEditing = Boolean(dialogUser);
      const response = await authFetch("/api/admin/users", {
        method: isEditing ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isEditing
            ? {
                uid: dialogUser!.id,
                displayName: form.displayName.trim(),
                role: form.role,
                active: form.active,
              }
            : {
                email: form.email.trim(),
                password: form.password,
                displayName: form.displayName.trim(),
                role: form.role,
                active: form.active,
              }
        ),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("admin.users.saveError"));

      if (isEditing) {
        setUsers((current) =>
          current.map((user) =>
            user.id === dialogUser!.id
              ? {
                  ...user,
                  displayName: form.displayName.trim(),
                  role: form.role,
                  active: form.active,
                }
              : user
          )
        );
      } else {
        setUsers((current) => [data.user as AdminUser, ...current]);
      }
      setDialogUser(undefined);
      setToasts((current) => [
        ...current,
        createToast(isEditing ? t("admin.users.updated") : t("admin.users.created")),
      ]);
    } catch (error) {
      console.error("[UsersAdmin] save failed", error);
      setFormError(error instanceof Error ? error.message : t("admin.users.saveError"));
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (user: AdminUser) => {
    if (user.id === currentUser?.uid || updatingId) return;
    const previous = user.active;
    setUpdatingId(user.id);
    setUsers((current) =>
      current.map((item) => (item.id === user.id ? { ...item, active: !previous } : item))
    );
    try {
      const response = await authFetch("/api/admin/users", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ uid: user.id, active: !previous }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("admin.users.statusError"));
      setToasts((current) => [...current, createToast(t("admin.users.statusUpdated"))]);
    } catch (error) {
      console.error("[UsersAdmin] status update failed", error);
      setUsers((current) =>
        current.map((item) => (item.id === user.id ? { ...item, active: previous } : item))
      );
      setToasts((current) => [
        ...current,
        createToast(error instanceof Error ? error.message : t("admin.users.statusError"), "error"),
      ]);
    } finally {
      setUpdatingId(null);
    }
  };

  const sendReset = async (user: AdminUser) => {
    try {
      await resetPassword(user.email);
      setToasts((current) => [...current, createToast(t("admin.users.resetSent"))]);
    } catch (error) {
      console.error("[UsersAdmin] password reset failed", error);
      setToasts((current) => [...current, createToast(t("admin.users.resetError"), "error")]);
    }
  };

  const confirmDelete = async () => {
    if (!deleteUser || deleteUser.id === currentUser?.uid || saving) return;
    setSaving(true);
    try {
      const response = await authFetch(`/api/admin/users?uid=${encodeURIComponent(deleteUser.id)}`, {
        method: "DELETE",
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || t("admin.users.deleteError"));
      setUsers((current) => current.filter((user) => user.id !== deleteUser.id));
      setDeleteUser(null);
      setToasts((current) => [...current, createToast(t("admin.users.deleted"))]);
    } catch (error) {
      console.error("[UsersAdmin] delete failed", error);
      setToasts((current) => [
        ...current,
        createToast(error instanceof Error ? error.message : t("admin.users.deleteError"), "error"),
      ]);
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) {
    return <div className="grid min-h-64 place-items-center"><Loader2 className="h-7 w-7 animate-spin text-turquoise" /></div>;
  }

  if (currentUser?.role !== "Admin") {
    return (
      <div className="py-12 text-center">
        <Shield className="mx-auto h-12 w-12 text-coffee/30" />
        <p className="mt-4 text-coffee/60">{t("admin.users.noAccess")}</p>
      </div>
    );
  }

  const formatLastLogin = (value?: string | null) => {
    if (!value) return t("admin.users.neverLoggedIn");
    const date = new Date(value);
    return Number.isNaN(date.getTime())
      ? t("admin.users.neverLoggedIn")
      : new Intl.DateTimeFormat("he-IL", { dateStyle: "short", timeStyle: "short" }).format(date);
  };

  const Actions = ({ user }: { user: AdminUser }) => {
    const isCurrent = user.id === currentUser.uid;
    return (
      <details className="group relative">
        <summary className="grid h-10 w-10 cursor-pointer list-none place-items-center rounded-xl hover:bg-beige/40">
          <MoreVertical className="h-4 w-4" />
        </summary>
        <div className="absolute end-0 top-11 z-20 w-52 overflow-hidden rounded-xl border border-beige-dark/20 bg-warm-white p-1 shadow-elevated">
          <button type="button" onClick={() => openEdit(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-beige/35">
            <Pencil className="h-4 w-4" /> {t("admin.users.edit")}
          </button>
          <button type="button" onClick={() => void sendReset(user)} className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-beige/35">
            <KeyRound className="h-4 w-4" /> {t("admin.users.resetPassword")}
          </button>
          <button
            type="button"
            disabled={isCurrent}
            onClick={() => void toggleActive(user)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm hover:bg-beige/35 disabled:opacity-40"
          >
            <UserRound className="h-4 w-4" />
            {user.active ? t("admin.users.disable") : t("admin.users.enable")}
          </button>
          <button
            type="button"
            disabled={isCurrent}
            onClick={() => setDeleteUser(user)}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 disabled:opacity-40"
          >
            <Trash2 className="h-4 w-4" /> {t("admin.action.delete")}
          </button>
        </div>
      </details>
    );
  };

  return (
    <div className="mx-auto w-full max-w-[1300px] space-y-5">
      <AdminPageHeader
        title={t("admin.users.title")}
        subtitle={t("admin.users.teamSubtitle")}
        actions={<Button onClick={openCreate}><Plus className="h-4 w-4" />{t("admin.users.new")}</Button>}
      />

      <div className="flex flex-col gap-3 rounded-2xl border border-beige-dark/15 bg-warm-white p-4 shadow-soft sm:flex-row">
        <div className="relative flex-1">
          <Search className="absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-coffee/40" />
          <Input
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder={t("admin.users.searchPlaceholder")}
            className="h-11 ps-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={(value) => setRoleFilter(value as "all" | UserRole)}>
          <SelectTrigger className="h-11 w-full sm:w-52"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("admin.users.allRoles")}</SelectItem>
            {ROLES.map((role) => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-beige-dark/15 bg-warm-white">
          <div className="text-center"><Loader2 className="mx-auto h-7 w-7 animate-spin text-turquoise" /><p className="mt-3 text-sm text-coffee/50">{t("admin.loading")}</p></div>
        </div>
      ) : loadError ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-red-200 bg-warm-white p-6 text-center">
          <div><AlertCircle className="mx-auto h-10 w-10 text-red-500" /><h2 className="mt-3 font-display text-lg font-bold">{t("admin.users.loadError")}</h2><p className="mt-1 text-sm text-coffee/55">{loadError}</p><Button className="mt-4" onClick={() => void loadUsers()}><RefreshCw className="h-4 w-4" />{t("admin.users.retry")}</Button></div>
        </div>
      ) : users.length === 0 ? (
        <div className="grid min-h-72 place-items-center rounded-2xl border border-dashed border-beige-dark/30 bg-warm-white p-6 text-center">
          <div><UsersRound className="mx-auto h-12 w-12 text-turquoise/60" /><h2 className="mt-3 font-display text-lg font-bold">{t("admin.users.empty")}</h2><p className="mt-1 text-sm text-coffee/55">{t("admin.users.emptyHint")}</p><Button className="mt-4" onClick={openCreate}><Plus className="h-4 w-4" />{t("admin.users.new")}</Button></div>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="rounded-2xl border border-beige-dark/15 bg-warm-white p-12 text-center text-sm text-coffee/55">{t("admin.users.noResults")}</div>
      ) : (
        <>
          <div className="hidden overflow-visible rounded-2xl border border-beige-dark/15 bg-warm-white shadow-soft md:block">
            <table className="w-full">
              <thead><tr className="border-b border-beige-dark/15 bg-beige/20 text-start text-xs text-coffee/55">
                <th className="px-4 py-3">{t("admin.users.user")}</th><th className="px-4 py-3">{t("admin.email")}</th><th className="px-4 py-3">{t("admin.users.role")}</th><th className="px-4 py-3">{t("admin.table.status")}</th><th className="px-4 py-3">{t("admin.users.lastLogin")}</th><th className="px-4 py-3">{t("admin.table.actions")}</th>
              </tr></thead>
              <tbody>{filteredUsers.map((user) => {
                const isCurrent = user.id === currentUser.uid;
                return <tr key={user.id} className="border-b border-beige-dark/10 last:border-0 hover:bg-beige/15">
                  <td className="px-4 py-3"><div className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-full bg-turquoise/10 text-xs font-bold text-turquoise">{initials(user)}</span><div><p className="text-sm font-semibold">{user.displayName || "—"}</p>{isCurrent && <p className="text-[11px] text-turquoise">{t("admin.users.currentUser")}</p>}</div></div></td>
                  <td className="px-4 py-3 text-sm text-coffee/65">{user.email}</td>
                  <td className="px-4 py-3"><span className="rounded-full bg-beige/50 px-2.5 py-1 text-xs font-semibold">{roleLabel(user.role)}</span></td>
                  <td className="px-4 py-3"><StatusSwitch checked={user.active} disabled={isCurrent || updatingId === user.id} label={user.active ? t("admin.status.active") : t("admin.status.disabled")} onChange={() => void toggleActive(user)} /></td>
                  <td className="px-4 py-3 text-xs text-coffee/55">{formatLastLogin(user.lastSignInAt)}</td>
                  <td className="px-4 py-3"><Actions user={user} /></td>
                </tr>;
              })}</tbody>
            </table>
          </div>

          <div className="grid gap-3 md:hidden">
            {filteredUsers.map((user) => {
              const isCurrent = user.id === currentUser.uid;
              return <article key={user.id} className="rounded-2xl border border-beige-dark/15 bg-warm-white p-4 shadow-soft">
                <div className="flex items-start gap-3"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-full bg-turquoise/10 text-xs font-bold text-turquoise">{initials(user)}</span><div className="min-w-0 flex-1"><p className="font-semibold">{user.displayName || "—"}</p><p className="truncate text-sm text-coffee/55">{user.email}</p>{isCurrent && <p className="text-xs text-turquoise">{t("admin.users.currentUser")}</p>}</div><Actions user={user} /></div>
                <div className="mt-4 flex items-center justify-between gap-3 border-t border-beige-dark/10 pt-3"><span className="rounded-full bg-beige/50 px-2.5 py-1 text-xs font-semibold">{roleLabel(user.role)}</span><StatusSwitch checked={user.active} disabled={isCurrent || updatingId === user.id} label={user.active ? t("admin.status.active") : t("admin.status.disabled")} onChange={() => void toggleActive(user)} /></div>
              </article>;
            })}
          </div>
        </>
      )}

      <AdminModal open={dialogUser !== undefined} onOpenChange={(open) => !open && setDialogUser(undefined)} size="sm">
          <form onSubmit={saveUser} className="flex min-h-0 flex-1 flex-col">
            <AdminModalHeader onClose={() => setDialogUser(undefined)}><AdminModalTitle>{dialogUser ? t("admin.users.edit") : t("admin.users.create")}</AdminModalTitle></AdminModalHeader>
            <AdminModalBody className="space-y-4">
              <div><Label>{t("admin.users.displayName")} *</Label><Input value={form.displayName} onChange={(event) => setForm({ ...form, displayName: event.target.value })} className="mt-1 h-11" required /></div>
              <div><Label>{t("admin.email")} *</Label><Input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} className="mt-1 h-11" required disabled={Boolean(dialogUser)} /></div>
              {!dialogUser && <div><Label>{t("admin.password")} *</Label><Input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} className="mt-1 h-11" required minLength={6} autoComplete="new-password" /></div>}
              <div><Label>{t("admin.users.role")} *</Label><Select value={form.role} onValueChange={(value) => setForm({ ...form, role: value as UserRole })} disabled={dialogUser?.id === currentUser.uid}><SelectTrigger className="mt-1 h-11"><SelectValue /></SelectTrigger><SelectContent>{ROLES.map((role) => <SelectItem key={role} value={role}>{roleLabel(role)}</SelectItem>)}</SelectContent></Select></div>
              <div className="rounded-xl bg-beige/20 p-3"><StatusSwitch checked={form.active} disabled={dialogUser?.id === currentUser.uid} label={form.active ? t("admin.status.active") : t("admin.status.disabled")} onChange={() => setForm({ ...form, active: !form.active })} /></div>
              {dialogUser?.id === currentUser.uid && <p className="text-xs text-amber-700">{t("admin.users.selfGuardHint")}</p>}
              {formError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{formError}</p>}
            </AdminModalBody>
            <AdminModalFooter><Button type="button" variant="outline" onClick={() => setDialogUser(undefined)} disabled={saving}>{t("admin.action.cancel")}</Button><Button type="submit" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dialogUser ? t("admin.action.save") : t("admin.users.create")}</Button></AdminModalFooter>
          </form>
      </AdminModal>

      <AdminModal open={Boolean(deleteUser)} onOpenChange={(open) => !open && setDeleteUser(null)} size="sm">
        <AdminModalHeader onClose={() => setDeleteUser(null)}><AdminModalTitle>{t("admin.users.deleteTitle")}</AdminModalTitle></AdminModalHeader><AdminModalBody><p className="text-sm text-coffee/65">{t("admin.users.deleteQuestion").replace("{name}", deleteUser?.displayName || deleteUser?.email || "")}</p></AdminModalBody><AdminModalFooter><Button variant="outline" onClick={() => setDeleteUser(null)} disabled={saving}>{t("admin.action.cancel")}</Button><Button variant="destructive" onClick={() => void confirmDelete()} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.action.delete")}</Button></AdminModalFooter>
      </AdminModal>

      <AdminToastStack toasts={toasts} onDismiss={(id) => setToasts((current) => current.filter((toast) => toast.id !== id))} />
    </div>
  );
}
