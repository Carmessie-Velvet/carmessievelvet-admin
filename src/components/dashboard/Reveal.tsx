"use client";

import type { ReactNode } from "react";
import { useRevealed } from "@/hooks/use-revealed";

/**
 * Envoltura genérica de entrada (fade + slide-up) para cualquier bloque del
 * dashboard — tarjetas, filas de lista, lo que sea. `delayMs` escalona la
 * animación cuando se usa en una lista (`delayMs={i * 60}`). Un solo lugar
 * para la curva/­duración en vez de repetir el mismo `transition` a mano en
 * cada componente.
 */
export function Reveal({
  children,
  delayMs = 0,
  className,
}: {
  children: ReactNode;
  delayMs?: number;
  className?: string;
}) {
  const revealed = useRevealed();
  return (
    <div
      className={className}
      style={{
        opacity: revealed ? 1 : 0,
        transform: revealed ? "translateY(0)" : "translateY(10px)",
        transition: "opacity 500ms ease-out, transform 500ms ease-out",
        transitionDelay: `${delayMs}ms`,
      }}
    >
      {children}
    </div>
  );
}
