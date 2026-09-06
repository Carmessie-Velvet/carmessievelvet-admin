import type { Metadata } from "next";
import { Archivo, Geist_Mono } from "next/font/google";
import "./globals.css";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";
import { ConfirmDialogProvider } from "@/components/ui/confirm-dialog";
import { AuthProvider } from "@/context/auth-context";

// Misma familia que carmessievelvet-web (el storefront) — aire de familia
// entre las dos apps sin adoptar su tono editorial (ver "Guía de marca" en
// CLAUDE.md): acá se usa en pesos normales, no font-black/uppercase.
const archivo = Archivo({
  variable: "--font-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Carmessie Velvet — Admin",
  description: "Panel de administración de Carmessie Velvet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${archivo.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col font-sans">
        <AuthProvider>
          <TooltipProvider delay={200}>
            <ConfirmDialogProvider>
              {children}
              <Toaster richColors position="top-right" />
            </ConfirmDialogProvider>
          </TooltipProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
