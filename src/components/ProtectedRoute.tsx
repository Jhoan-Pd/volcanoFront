"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import type { Role } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { ROLES } from "@/lib/format";
import { Notice, Spinner } from "./ui";

/**
 * Guards pages by role in the browser (private pages are CSR: the token lives in localStorage,
 * which the server cannot see). The backend validates again: this only improves the experience.
 */
export default function ProtectedRoute({ roles, children }: { roles: Role[]; children: ReactNode }) {
  const { user, loading, hasRole } = useAuth();
  const router = useRouter();
  const path = usePathname();

  useEffect(() => {
    if (!loading && !user) router.replace(`/login?desde=${encodeURIComponent(path)}`);
  }, [loading, user, router, path]);

  if (loading || !user) return <Spinner text="Verificando sesión…" />;
  if (!hasRole(...roles)) {
    return (
      <Notice kind="error">
        No tienes permiso para ver esta sección (se requiere rol {roles.map((r) => ROLES[r]).join(" o ")}).
      </Notice>
    );
  }
  return <>{children}</>;
}
