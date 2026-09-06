import { useEffect, useState } from "react";

/**
 * `false` en el primer render, `true` un par de frames después — para
 * animar de "0 -> valor real" con una transición CSS normal en vez de
 * calcular longitudes de trazo/keyframes a mano. Pensado para gráficas que
 * ya vienen montadas con datos reales (el gate `{dashboard && (...)}` del
 * dashboard asegura que "montar" y "llegar el primer dato real" coinciden).
 * Respeta `prefers-reduced-motion`: en ese caso arranca en `true` de una
 * vez, sin animar.
 */
export function useRevealed(): boolean {
  const [revealed, setRevealed] = useState(
    () =>
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches
  );

  useEffect(() => {
    if (revealed) return;
    const ids: number[] = [];
    // Doble rAF: el primero deja que el navegador pinte el estado inicial
    // (0%/oculto); recién en el segundo se cambia el valor, así el
    // navegador sí anima la transición en vez de saltar directo al final.
    ids.push(
      requestAnimationFrame(() => {
        ids.push(requestAnimationFrame(() => setRevealed(true)));
      })
    );
    return () => ids.forEach(cancelAnimationFrame);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return revealed;
}
