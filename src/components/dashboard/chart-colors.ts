/**
 * Paleta compartida por `DonutChart`/`SegmentedBar` — dos tonos reales de
 * marca (los mismos hex exactos que `carmessievelvet-web`: velvet y
 * velvet-light), no colores inventados para el admin. `sand` se deja fuera
 * a propósito: es demasiado pálido para leerse como serie sobre blanco o
 * sobre el track gris de la barra — se reserva para fondos/tintes, no para
 * marcas de datos. Se ciclan en este orden fijo (regla de dataviz: "assign
 * categorical hues in fixed order, never cycled per-render") y, si hay más
 * segmentos que combinaciones, se repiten a menor opacidad.
 */
export const CHART_COLOR_RAMP: { color: string; opacity: number }[] = [
  { color: "var(--primary)", opacity: 1 },
  { color: "var(--velvet-light)", opacity: 1 },
  { color: "var(--primary)", opacity: 0.55 },
  { color: "var(--velvet-light)", opacity: 0.55 },
  { color: "var(--primary)", opacity: 0.3 },
];

export function chartColor(index: number): { color: string; opacity: number } {
  return CHART_COLOR_RAMP[index % CHART_COLOR_RAMP.length];
}
