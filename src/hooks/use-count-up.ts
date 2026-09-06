import { useEffect, useRef, useState } from "react";

const DURATION_MS = 700;
// Ease-out cúbico — arranca rápido y frena, se siente menos "de robot"
// que una interpolación lineal para un contador de KPI.
function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    Boolean(window.matchMedia?.("(prefers-reduced-motion: reduce)").matches)
  );
}

/**
 * Anima un número de 0 (o del valor anterior) al `target` en ~700ms. Usado
 * en los números grandes del dashboard (KPIs, gauge) — puramente cosmético,
 * nunca cambia qué valor final se muestra ni inventa datos intermedios.
 * Respeta `prefers-reduced-motion`: en ese caso nunca anima, siempre
 * devuelve `target` tal cual. El flag se calcula una sola vez con el
 * inicializador perezoso de `useState` (no con un ref leído en el render,
 * que el lint de este proyecto rechaza).
 */
export function useCountUp(target: number): number {
  const [reduceMotion] = useState(prefersReducedMotion);
  const [value, setValue] = useState(target);
  const fromRef = useRef(target);
  const frameRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduceMotion) return;

    const from = fromRef.current;
    const start = performance.now();

    function tick(now: number) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / DURATION_MS, 1);
      setValue(from + (target - from) * easeOutCubic(progress));
      if (progress < 1) {
        frameRef.current = requestAnimationFrame(tick);
      } else {
        fromRef.current = target;
      }
    }

    frameRef.current = requestAnimationFrame(tick);
    return () => {
      if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    };
  }, [target, reduceMotion]);

  return reduceMotion ? target : value;
}
