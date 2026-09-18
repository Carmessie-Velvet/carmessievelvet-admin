"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { canAccessRoute, getDefaultRoute } from "@/lib/nav-access";

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { status, user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (status === "unauthenticated") {
      router.replace("/login");
      return;
    }
    // Cubre tanto "cayó en `/` (el destino fijo tras login) pero su rol no
    // ve el dashboard" como "escribió a mano una URL que no le
    // corresponde" — mismo chequeo, `nav-access.ts` es la única fuente de
    // verdad de qué rol ve qué ruta (ver ese archivo para el porqué esto
    // no es la barrera de seguridad real, solo evita confusión de UI).
    if (status === "authenticated" && user && !canAccessRoute(pathname, user.roles)) {
      router.replace(getDefaultRoute(user.roles));
    }
  }, [status, user, pathname, router]);

  if (status !== "authenticated" || (user && !canAccessRoute(pathname, user.roles))) {
    return (
      <div className="flex min-h-svh flex-1 items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <>{children}</>;
}
