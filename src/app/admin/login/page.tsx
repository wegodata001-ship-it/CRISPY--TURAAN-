import { Suspense } from "react";
import { AdminLoginForm } from "@/features/auth/admin-login-form";
import { AppLoadingScreen } from "@/components/brand/app-loading-screen";

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<AppLoadingScreen />}>
      <AdminLoginForm />
    </Suspense>
  );
}
