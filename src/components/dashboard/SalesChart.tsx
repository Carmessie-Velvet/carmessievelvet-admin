"use client";

import { useMemo, useState } from "react";
import { formatCurrency } from "@/lib/format-currency";
import { useRevealed } from "@/hooks/use-revealed";
import type { ApiSalesBucket, StatsGranularity } from "@/types/stats";

interface SalesChartProps {
  buckets: ApiSalesBucket[];
  granularity: StatsGranularity;
}

const VIEW_WIDTH = 640;
const VIEW_HEIGHT = 240;
const PADDING_LEFT = 8;
const PADDING_RIGHT = 8;
const PADDING_BOTTOM = 26;
const PADDING_TOP = 16;

function formatBucketLabel(bucket: string, granularity: StatsGranularity): string {
  if (granularity === "month") {
    const [year, month] = bucket.split("-");
    return new Date(Number(year), Number(month) - 1, 1).toLocaleDateString("es-MX", {
      month: "short",
      year: "2-digit",
    });
  }
  const date = new Date(`${bucket}T00:00:00`);
  return date.toLocaleDateString("es-MX", { day: "numeric", month: "short" });
}

/** Traza una polilínea suavizada (curva de Catmull-Rom -> Bézier) entre puntos. */
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p2.x} ${p2.y}`;
  }
  return d;
}

/**
 * Ingresos (línea sólida + relleno) y número de órdenes (línea punteada),
 * cada una indexada 0-100% sobre su propio máximo del rango visible — dos
 * métricas de escala muy distinta ($ vs. conteo) en un solo eje sin caer en
 * el anti-patrón de doble eje (regla de la skill de dataviz: "indexar a una
 * base común" es la alternativa sancionada). El tooltip siempre muestra los
 * valores reales, nunca el índice.
 */
export function SalesChart({ buckets, granularity }: SalesChartProps) {
  const [hovered, setHovered] = useState<number | null>(null);
  const revealed = useRevealed();

  const { revenuePath, revenueAreaPath, ordersPath, points } = useMemo(() => {
    const plotWidth = VIEW_WIDTH - PADDING_LEFT - PADDING_RIGHT;
    const plotHeight = VIEW_HEIGHT - PADDING_TOP - PADDING_BOTTOM;
    const maxRevenue = Math.max(...buckets.map((b) => b.revenue), 1);
    const maxOrders = Math.max(...buckets.map((b) => b.orders), 1);
    const n = Math.max(buckets.length - 1, 1);

    const points = buckets.map((bucket, i) => {
      const x = PADDING_LEFT + (i / n) * plotWidth;
      const revenueY = PADDING_TOP + plotHeight * (1 - bucket.revenue / maxRevenue);
      const ordersY = PADDING_TOP + plotHeight * (1 - bucket.orders / maxOrders);
      return { x, revenueY, ordersY, bucket };
    });

    const revenuePoints = points.map((p) => ({ x: p.x, y: p.revenueY }));
    const ordersPoints = points.map((p) => ({ x: p.x, y: p.ordersY }));
    const revenuePath = smoothPath(revenuePoints);
    const ordersPath = smoothPath(ordersPoints);
    const baseline = PADDING_TOP + plotHeight;
    const revenueAreaPath =
      revenuePoints.length > 0
        ? `${revenuePath} L ${revenuePoints[revenuePoints.length - 1].x} ${baseline} L ${revenuePoints[0].x} ${baseline} Z`
        : "";

    return { revenuePath, revenueAreaPath, ordersPath, points };
  }, [buckets]);

  if (buckets.length === 0) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-muted-foreground">
        Sin datos en este periodo.
      </div>
    );
  }

  const labelStep = Math.max(1, Math.ceil(points.length / 7));
  const hoveredPoint = hovered !== null ? points[hovered] : null;

  return (
    <div>
      <div className="mb-3 flex items-center gap-4 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-0.5 w-4 rounded-full bg-primary" />
          Ingresos
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span
            className="h-0 w-4 border-t-2 border-dashed"
            style={{ borderColor: "var(--velvet-light)" }}
          />
          Órdenes
        </span>
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
          className="h-56 w-full overflow-visible transition-[clip-path] duration-[900ms] ease-out"
          style={{ clipPath: revealed ? "inset(0 0% 0 0)" : "inset(0 100% 0 0)" }}
          role="img"
          aria-label="Ingresos y número de órdenes en el periodo"
        >
          <defs>
            <linearGradient id="salesAreaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </linearGradient>
          </defs>

          <path d={revenueAreaPath} fill="url(#salesAreaFill)" stroke="none" />
          <path
            d={ordersPath}
            fill="none"
            stroke="var(--velvet-light)"
            strokeWidth={2}
            strokeDasharray="5 4"
            strokeLinecap="round"
          />
          <path d={revenuePath} fill="none" stroke="var(--primary)" strokeWidth={2.5} strokeLinecap="round" />

          {hoveredPoint && (
            <line
              x1={hoveredPoint.x}
              x2={hoveredPoint.x}
              y1={PADDING_TOP}
              y2={VIEW_HEIGHT - PADDING_BOTTOM}
              stroke="var(--border)"
              strokeWidth={1}
            />
          )}

          {points.map((p, i) => (
            <g key={p.bucket.bucket}>
              {hovered === i && (
                <>
                  <circle cx={p.x} cy={p.revenueY} r={4.5} fill="var(--primary)" stroke="var(--card)" strokeWidth={2} />
                  <circle cx={p.x} cy={p.ordersY} r={4} fill="var(--velvet-light)" stroke="var(--card)" strokeWidth={2} />
                </>
              )}
              <rect
                x={p.x - (VIEW_WIDTH / Math.max(points.length, 1)) / 2}
                y={0}
                width={VIEW_WIDTH / Math.max(points.length, 1)}
                height={VIEW_HEIGHT - PADDING_BOTTOM}
                fill="transparent"
                onMouseEnter={() => setHovered(i)}
                onMouseLeave={() => setHovered(null)}
                onFocus={() => setHovered(i)}
                onBlur={() => setHovered(null)}
                tabIndex={0}
              />
              {i % labelStep === 0 && (
                <text
                  x={p.x}
                  y={VIEW_HEIGHT - PADDING_BOTTOM + 16}
                  textAnchor="middle"
                  className="fill-muted-foreground"
                  fontSize={10}
                >
                  {formatBucketLabel(p.bucket.bucket, granularity)}
                </text>
              )}
            </g>
          ))}
        </svg>

        {hoveredPoint && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-[calc(100%+8px)] rounded-lg border border-border bg-popover px-3 py-2 text-xs shadow-md"
            style={{
              left: `${(hoveredPoint.x / VIEW_WIDTH) * 100}%`,
              top: `${(Math.min(hoveredPoint.revenueY, hoveredPoint.ordersY) / VIEW_HEIGHT) * 100}%`,
            }}
          >
            <p className="mb-1 font-medium text-popover-foreground">
              {formatBucketLabel(hoveredPoint.bucket.bucket, granularity)}
            </p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-0.5 w-3 rounded-full bg-primary" />
              {formatCurrency(hoveredPoint.bucket.revenue)}
            </p>
            <p className="flex items-center gap-1.5 text-muted-foreground">
              <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: "var(--velvet-light)" }} />
              {hoveredPoint.bucket.orders} orden{hoveredPoint.bucket.orders === 1 ? "" : "es"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
