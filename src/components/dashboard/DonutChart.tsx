"use client";

import { chartColor } from "./chart-colors";
import { useRevealed } from "@/hooks/use-revealed";

export interface DonutSegment {
  label: string;
  value: number;
  /** Opcional — si se omite, se asigna del ramp de marca en orden fijo. */
  colorClass?: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  centerLabel?: string;
  centerValue?: string;
  formatValue?: (value: number) => string;
}

const SIZE = 140;
const STROKE = 20;
const RADIUS = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/**
 * Dona simple, sin librería — un color de marca en distintas opacidades
 * (nunca hues nuevos), con la leyenda siempre visible al lado/abajo en vez
 * de depender de hover, ya que es la única forma confiable de leer cada
 * porción sin ambigüedad de color.
 */
export function DonutChart({
  segments,
  centerLabel,
  centerValue,
  formatValue,
}: DonutChartProps) {
  const revealed = useRevealed();
  const total = segments.reduce((sum, s) => sum + s.value, 0);

  if (total <= 0) {
    return (
      <div className="flex h-[140px] items-center justify-center text-sm text-muted-foreground">
        Sin datos en este periodo.
      </div>
    );
  }

  // 2px de separación entre porciones (mismo "surface gap" que las barras).
  const gap = segments.length > 1 ? 2 : 0;
  // Suma acumulada *antes* de cada segmento (fracción del círculo ya
  // dibujada) — se calcula sin mutar nada, para que el render se mantenga
  // puro (una variable de cierre reasignada dentro del map dispara el lint
  // de inmutabilidad del compilador de React).
  const cumulativeBefore = segments.reduce<number[]>((acc, segment, i) => {
    const previous = i > 0 ? acc[i - 1] : 0;
    acc.push(previous + segment.value / total);
    return acc;
  }, []);

  const arcs = segments.map((segment, i) => {
    const fraction = segment.value / total;
    const dashLength = fraction * CIRCUMFERENCE;
    const before = i > 0 ? cumulativeBefore[i - 1] : 0;
    return {
      key: segment.label,
      dashArray: `${Math.max(dashLength - gap, 0)} ${CIRCUMFERENCE}`,
      offset: -before * CIRCUMFERENCE,
      ...chartColor(i),
    };
  });

  return (
    // Apilado (dona arriba, leyenda debajo a todo el ancho) en vez de
    // lado-a-lado: en una tarjeta angosta, poner la leyenda junto al SVG le
    // dejaba casi cero espacio al nombre de la categoría (se veía en
    // blanco, solo el monto) — apilada, la leyenda siempre tiene el ancho
    // completo de la tarjeta para el texto.
    <div className="flex flex-col items-center gap-4">
      <svg
        width={SIZE}
        height={SIZE}
        viewBox={`0 0 ${SIZE} ${SIZE}`}
        className="shrink-0 transition-[opacity,transform] duration-500 ease-out"
        style={{ opacity: revealed ? 1 : 0, transform: `rotate(-90deg) scale(${revealed ? 1 : 0.75})` }}
      >
        <circle cx={SIZE / 2} cy={SIZE / 2} r={RADIUS} fill="none" stroke="var(--muted)" strokeWidth={STROKE} />
        {arcs.map((arc) => (
          <circle
            key={arc.key}
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={RADIUS}
            fill="none"
            stroke={arc.color}
            strokeOpacity={arc.opacity}
            strokeWidth={STROKE}
            strokeDasharray={arc.dashArray}
            strokeDashoffset={arc.offset}
            strokeLinecap="round"
          />
        ))}
        {centerValue && (
          <g className="rotate-90" style={{ transformOrigin: "center" }}>
            <text
              x={SIZE / 2}
              y={SIZE / 2 - 4}
              textAnchor="middle"
              className="fill-foreground"
              fontSize={20}
              fontWeight={800}
            >
              {centerValue}
            </text>
            {centerLabel && (
              <text
                x={SIZE / 2}
                y={SIZE / 2 + 14}
                textAnchor="middle"
                className="fill-muted-foreground"
                fontSize={10}
              >
                {centerLabel}
              </text>
            )}
          </g>
        )}
      </svg>

      <div className="flex w-full flex-col gap-2">
        {segments.map((segment, i) => (
          <div
            key={segment.label}
            className="flex items-center gap-2 text-sm transition-[opacity,transform] duration-500 ease-out"
            style={{
              opacity: revealed ? 1 : 0,
              transform: revealed ? "translateX(0)" : "translateX(-6px)",
              transitionDelay: `${i * 70}ms`,
            }}
          >
            <span
              className="size-2.5 shrink-0 rounded-full"
              style={{ backgroundColor: chartColor(i).color, opacity: chartColor(i).opacity }}
            />
            <span className="min-w-0 flex-1 truncate font-medium">{segment.label}</span>
            <span className="shrink-0 font-semibold text-muted-foreground">
              {formatValue ? formatValue(segment.value) : segment.value}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
