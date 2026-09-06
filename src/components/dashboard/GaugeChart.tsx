"use client";

import { useCountUp } from "@/hooks/use-count-up";
import { useRevealed } from "@/hooks/use-revealed";

interface GaugeChartProps {
  percent: number;
  valueLabel: string;
  subLabel: string;
}

const VIEW_WIDTH = 200;
const VIEW_HEIGHT = 110;
const STROKE = 16;
const RADIUS = 84;
const CX = VIEW_WIDTH / 2;
const CY = 100;
const HALF_CIRCUMFERENCE = Math.PI * RADIUS;
const ARC_PATH = `M ${CX - RADIUS} ${CY} A ${RADIUS} ${RADIUS} 0 0 1 ${CX + RADIUS} ${CY}`;

/**
 * Gauge de media dona (equivalente al "Monthly Target" de la referencia) —
 * un solo arco de 180° (<path> con comando M/A) revelado con el mismo truco
 * de "dibujado a mano" que la línea de ventas: dasharray = la longitud
 * completa del arco, dashoffset anima de "todo oculto" a "revela
 * exactamente `percent`% de su longitud" — el arco de fondo (gris) siempre
 * está completo, solo el de color se revela proporcionalmente.
 */
export function GaugeChart({ percent, valueLabel, subLabel }: GaugeChartProps) {
  const revealed = useRevealed();
  const clamped = Math.min(Math.max(percent, 0), 100);
  const animatedPercent = useCountUp(clamped);

  return (
    <div className="flex flex-col items-center">
      <svg viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`} className="w-full max-w-48">
        <path
          d={ARC_PATH}
          fill="none"
          stroke="var(--muted)"
          strokeWidth={STROKE}
          strokeLinecap="round"
        />
        <path
          d={ARC_PATH}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={STROKE}
          strokeLinecap="round"
          strokeDasharray={HALF_CIRCUMFERENCE}
          strokeDashoffset={
            revealed ? HALF_CIRCUMFERENCE * (1 - clamped / 100) : HALF_CIRCUMFERENCE
          }
          className="transition-[stroke-dashoffset] duration-[900ms] ease-out"
        />
        <text
          x={CX}
          y={CY - 8}
          textAnchor="middle"
          fontSize={28}
          className="fill-foreground font-extrabold tabular-nums"
        >
          {Math.round(animatedPercent)}%
        </text>
      </svg>
      <p className="-mt-1 text-sm font-medium">{valueLabel}</p>
      <p className="text-xs text-muted-foreground">{subLabel}</p>
    </div>
  );
}
