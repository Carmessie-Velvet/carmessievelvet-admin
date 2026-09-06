import { cn } from "@/lib/utils";

/**
 * Tres tonos reales de marca (velvet/velvet-light/sand — mismos hex que
 * carmessievelvet-web, ver globals.css) ciclados en orden fijo para el
 * ícono de cada tarjeta de sección. Reemplaza el tono único `bg-primary/10`
 * que usaba toda tarjeta de este admin — variedad de color sin salirse de
 * la paleta de Carmessie ni introducir un tono ajeno.
 */
export const SECTION_ICON_TINTS = [
  "bg-primary/10 text-primary",
  "bg-velvet-light/15 text-velvet-light",
  "bg-sand/60 text-foreground",
];

/**
 * El ícono de la "tarjeta de sección con ícono" (ver CLAUDE.md — Estándar
 * de diseño): un cuadro redondeado con el ícono de `lucide-react` adentro,
 * en el header de cada `Card`. `index` cicla el tinte — pásalo en el orden
 * en que aparecen las tarjetas en la pantalla para que el color rote de
 * forma predecible, no aleatoria.
 */
export function SectionIcon({
  icon: Icon,
  index = 0,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  index?: number;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "flex size-9 items-center justify-center rounded-xl",
        SECTION_ICON_TINTS[index % SECTION_ICON_TINTS.length],
        className
      )}
    >
      <Icon className="size-4" />
    </span>
  );
}
