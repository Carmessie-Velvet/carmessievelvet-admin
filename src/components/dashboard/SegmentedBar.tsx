"use client";

import { chartColor } from "./chart-colors";
import { useRevealed } from "@/hooks/use-revealed";
import { cn } from "@/lib/utils";

export interface BarSegment {
  label: string;
  value: number;
  sublabel?: string;
}

interface SegmentedBarProps {
  segments: BarSegment[];
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Una sola barra horizontal dividida proporcionalmente (velvet/velvet-light
 * alternados, con un gap de 2px entre segmentos) + leyenda con el % de cada
 * uno debajo — para desgloses de "qué tanto de esto vs. lo otro" (métodos
 * de envío/pago, invitados vs. registrados) donde el porcentaje relativo es
 * el dato que importa, no solo el número absoluto.
 */
export function SegmentedBar({ segments, formatValue, className }: SegmentedBarProps) {
  const revealed = useRevealed();
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return <p className="text-sm text-muted-foreground">Sin datos en este periodo.</p>;
  }

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      <div className="flex h-3.5 w-full gap-0.5 overflow-hidden rounded-full bg-muted">
        {segments.map((segment, i) => {
          const pct = (segment.value / total) * 100;
          if (pct <= 0) return null;
          const { color, opacity } = chartColor(i);
          return (
            <div
              key={segment.label}
              className="h-full shrink-0 first:rounded-l-full last:rounded-r-full transition-[width] duration-700 ease-out"
              style={{
                width: revealed ? `${pct}%` : "0%",
                backgroundColor: color,
                opacity,
                transitionDelay: `${i * 80}ms`,
              }}
              title={`${segment.label} — ${Math.round(pct)}%`}
            />
          );
        })}
      </div>

      <div className="flex flex-col gap-2">
        {segments.map((segment, i) => {
          const pct = (segment.value / total) * 100;
          const { color, opacity } = chartColor(i);
          return (
            <div
              key={segment.label}
              className="flex items-center gap-2 text-sm transition-[opacity,transform] duration-500 ease-out"
              style={{
                opacity: revealed ? 1 : 0,
                transform: revealed ? "translateX(0)" : "translateX(-6px)",
                transitionDelay: `${i * 80}ms`,
              }}
            >
              <span
                className="size-2.5 shrink-0 rounded-full"
                style={{ backgroundColor: color, opacity }}
              />
              <div className="min-w-0 flex-1">
                <span className="font-medium">{segment.label}</span>
                {segment.sublabel && (
                  <span className="ml-1.5 text-xs text-muted-foreground">{segment.sublabel}</span>
                )}
              </div>
              <span className="shrink-0 font-semibold text-muted-foreground">
                {Math.round(pct)}%
                {formatValue ? ` · ${formatValue(segment.value)}` : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
