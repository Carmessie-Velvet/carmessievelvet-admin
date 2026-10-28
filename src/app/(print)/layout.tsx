import { AuthGuard } from "@/components/auth/AuthGuard";

/**
 * Vistas pensadas para papel (sin sidebar ni header del panel) — mismo
 * `AuthGuard` que `(dashboard)`, así que exigen sesión y respetan
 * `nav-access.ts` igual que el resto del admin.
 */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return <AuthGuard>{children}</AuthGuard>;
}
