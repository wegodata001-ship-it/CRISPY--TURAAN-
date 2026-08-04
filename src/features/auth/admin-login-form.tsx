"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useAuth } from "@/components/providers/auth-provider";
import { Logo } from "@/components/brand/logo";
import { BRAND } from "@/lib/brand";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { StoreImage } from "@/components/brand/store-image";
import { useT } from "@/components/providers/locale-provider";

export function AdminLoginForm() {
  const t = useT();
  const { login, resetPassword, user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetSent, setResetSent] = useState(false);

  if (!authLoading && user) {
    router.replace("/admin");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      await login(email, password, remember);
      router.replace("/admin");
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.generic"));
    } finally {
      setLoading(false);
    }
  };

  const handleForgot = async () => {
    if (!email) {
      setError(t("validation.email"));
      return;
    }
    try {
      await resetPassword(email);
      setResetSent(true);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : t("error.generic"));
    }
  };

  return (
    <div className="flex min-h-screen">
      <div className="relative hidden w-1/2 lg:block">
        <StoreImage priority imageClassName="object-cover" />
        <div className="absolute inset-0 bg-gradient-to-br from-dark-brown/80 via-dark-brown/50 to-turquoise/30" />
        <div className="absolute inset-0 flex flex-col justify-end p-12">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="font-display text-4xl font-bold text-warm-white"
          >
            {BRAND.name}
          </motion.h1>
          <p className="mt-2 text-warm-white/80">{t("admin.signInHint")}</p>
        </div>
      </div>

      <div className="flex flex-1 items-center justify-center bg-cream px-6 py-12">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md"
        >
          <div className="mb-8 flex flex-col items-center lg:items-start">
            <Logo size="lg" href={null} />
            <h2 className="mt-4 font-display text-2xl font-bold text-dark-brown">
              {t("admin.welcome")}
            </h2>
            <p className="text-sm text-coffee/60">{t("admin.signInHint")}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5 rounded-2xl bg-warm-white p-6 shadow-elevated">
            <div>
              <Label htmlFor="email">{t("admin.email")}</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@mishkat.cafe"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="password">{t("admin.password")}</Label>
              <div className="relative mt-1.5">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute top-1/2 right-3 -translate-y-1/2 text-coffee/40"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm text-coffee/70">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                  className="rounded"
                />
                {t("admin.rememberMe")}
              </label>
              <button
                type="button"
                onClick={handleForgot}
                className="text-sm font-medium text-turquoise hover:underline"
              >
                {t("admin.forgotPassword")}
              </button>
            </div>

            {resetSent && (
              <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
                {t("common.success")}
              </p>
            )}
            {error && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>
            )}

            <Button type="submit" variant="turquoise" size="lg" className="w-full" disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : t("admin.signIn")}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}
