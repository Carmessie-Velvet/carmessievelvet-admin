"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Move, ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { HeroImageVariant } from "@/types/hero";

// Bastante por encima del mínimo que exige la API para cada variante
// (1920×1080 desktop, 1080×1350 mobile) — ese mínimo es apenas suficiente
// para *validar* la imagen, no para que se vea nítida una vez desplegada.
// Reportado en vivo (2026-09-10, variante desktop): un hero exportado al
// mínimo se veía nítido en esta previsualización (recuadro angosto) pero
// pixeleado en la web real, donde la imagen se estira a todo el ancho de
// la pantalla — en un monitor Retina/HiDPI (2-3x densidad de píxeles) eso
// necesita bastante más que el mínimo en píxeles físicos, y `next/image`
// nunca puede inventar detalle que no exista en el archivo original, solo
// puede downscalear. `desktop` exporta al doble del mínimo (cubre un
// monitor 2x hasta ~1920 CSS px de ancho); `mobile` exporta al **triple**
// del mínimo, no solo al doble — un celular/tablet típico corre a 3x
// (algunos Android reportan hasta ~4x) `devicePixelRatio`, más alto que lo
// usual en desktop, así que necesita ese margen extra para no pixelarse en
// el mismo escenario. Ambos objetivos siguen muy por debajo del límite de
// 5MB del backend — verificado con `handleConfirm`'s reintento a menor
// calidad abajo, por si acaso.
const VARIANT_CONFIG: Record<
  HeroImageVariant,
  { outputWidth: number; outputHeight: number; aspectClass: string; ratioLabel: string }
> = {
  desktop: { outputWidth: 3840, outputHeight: 2160, aspectClass: "aspect-video", ratioLabel: "16:9" },
  mobile: { outputWidth: 3240, outputHeight: 4050, aspectClass: "aspect-[4/5]", ratioLabel: "4:5" },
};

// Múltiplo del zoom mínimo-para-llenar (ver `minZoomToFill` abajo) hasta el
// que se puede seguir acercando una vez ya cubre el recuadro — no un tope
// absoluto fijo, porque cuánto hace falta acercar para llenar varía mucho
// según qué tan distinta sea la proporción de la foto original a la de la
// portada (una foto panorámica dentro de un recuadro 4:5 necesita acercar
// mucho más que una que ya viene casi 4:5).
const MAX_ZOOM_OVER_FILL = 2.5;

type Offset = { x: number; y: number };

interface HeroImageCropperProps {
  file: File | null;
  variant: HeroImageVariant;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/**
 * La API exige que cada imagen de la portada cumpla su propia proporción
 * mínima — ~16:9/1920×1080 para `variant="desktop"`, ~4:5/1080×1350 para
 * `variant="mobile"` (la portada necesita las dos, ver `HeroEditor`) —
 * antes esto solo se descubría como un 400 después de intentar subir una
 * foto que no cumplía. En vez de solo rechazar, esto deja al admin mover y
 * hacer zoom sobre la imagen real dentro de un recuadro con la proporción
 * de la variante elegida, y exporta siempre un recorte que ya cumple el
 * requisito — la subida real nunca puede fallar por dimensiones.
 *
 * ⚠️ **Arranca mostrando la imagen completa, sin recortar nada por su
 * cuenta** (`zoom` inicial = 1 sobre `baseScale` = "contain", no "cover") —
 * pedido explícito tras que la primera versión escalaba automáticamente
 * para llenar el recuadro desde el primer momento, lo que en una foto muy
 * distinta a la proporción de la portada (ej. un banner panorámico para el
 * recuadro 4:5 de mobile) recortaba de entrada casi toda la imagen sin que
 * el admin llegara a decidir nada. Ahora el admin ve todo y decide cuánto
 * acercar/mover — `handleConfirm` (el botón "Usar esta imagen") se
 * deshabilita hasta que el zoom actual ya cubre el recuadro por completo
 * (`isFilled` abajo), para nunca exportar una imagen con franjas vacías del
 * fondo `bg-muted` en los bordes.
 *
 * El recuadro se mide en vivo (`getBoundingClientRect`) en vez de asumir un
 * ancho fijo, así el arrastre funciona igual sea cual sea el tamaño real
 * renderizado (el modal es responsive). El offset de paneo **no** vive en
 * un `useEffect` que lo centre al cargar la imagen (eso dispararía un
 * set-state síncrono dentro de un efecto) — en su lugar, `manualOffset`
 * empieza en `null` ("todavía sin tocar, usa el centrado calculado en cada
 * render") y solo se llena cuando el admin arrastra o hace zoom.
 *
 * El componente entero se remonta con un `key` distinto por cada archivo
 * elegido (ver `HeroEditor`) — el patrón que React recomienda para
 * "reiniciar el estado cuando cambia una prop", en vez de un efecto que
 * detecte el cambio y llame `setZoom(1)`/`setManualOffset(null)` a mano.
 */
export function HeroImageCropper({ file, variant, onCancel, onConfirm }: HeroImageCropperProps) {
  const { outputWidth, outputHeight, aspectClass, ratioLabel } = VARIANT_CONFIG[variant];
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [manualOffset, setManualOffset] = useState<Offset | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);
  // Solo para feedback visual (cursor "grabbing" + ocultar la pista de
  // "arrastra" una vez que el admin ya lo hizo) — pedido explícito tras
  // reportar que no quedaba claro que la imagen se podía mover, no solo
  // hacer zoom. `hasDragged` nunca se resetea a `false` en esta sesión de
  // edición, ni siquiera si suelta y no movió nada — una vez que interactuó
  // con el recuadro no hace falta seguir insistiendo con la pista.
  const [isDragging, setIsDragging] = useState(false);
  const [hasDragged, setHasDragged] = useState(false);

  const [objectUrl, setObjectUrl] = useState<string | null>(null);

  // Crear y revocar el blob URL en el MISMO efecto es lo que importa acá:
  // tenerlos en un `useMemo` + un `useEffect` de cleanup separado (como
  // estaba antes) se rompe bajo Strict Mode en desarrollo — React monta,
  // corre el efecto, desmonta (revocando el blob) y vuelve a montar, todo
  // antes de que la imagen termine de cargar, así que `<img>` nunca
  // aparecía. Con create+revoke en el mismo efecto, cada "vuelta" de
  // Strict Mode crea y revoca su propio blob de forma consistente.
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    // eslint-disable-next-line react-hooks/set-state-in-effect -- necesario: `url` solo existe dentro de este efecto (debe crearse y revocarse en el mismo, ver comentario arriba), así que exponerlo a JSX no tiene alternativa sin efecto.
    setObjectUrl(url);
    const img = new window.Image();
    img.onload = () => setImgEl(img);
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Ref-callback en vez de `useRef` + efecto: el diálogo (Base UI) monta
  // su contenido de forma diferida/con transición, así que un efecto
  // disparado por `[file]` a veces medía el recuadro antes de que tuviera
  // layout real (0×0). Un `ResizeObserver` sobre el nodo, iniciado justo
  // cuando React lo monta, siempre obtiene la medida real apenas exista —
  // y además se re-mide solo si el modal cambia de tamaño (responsive).
  const boxCallbackRef = useCallback((node: HTMLDivElement | null) => {
    if (!node) return;
    const observer = new ResizeObserver((entries) => {
      const rect = entries[0]?.contentRect;
      if (rect) setBoxSize({ width: rect.width, height: rect.height });
    });
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  // "contain" (Math.min): al abrir se ve la imagen COMPLETA dentro del
  // recuadro (con franjas vacías en el eje que sobre, si la proporción no
  // coincide) — el punto de partida que se pidió, en vez de "cover"
  // (Math.max, lo que había antes), que ya recortaba algo desde el primer
  // render sin que el admin decidiera nada. `fillScale` ("cover") sigue
  // haciendo falta para saber cuánto zoom hay que pedirle al admin antes
  // de dejarlo confirmar (ver `isFilled` abajo) — nunca se exporta con
  // franjas vacías, solo se empieza mostrando la imagen entera.
  const baseScale =
    imgEl && boxSize.width
      ? Math.min(boxSize.width / imgEl.naturalWidth, boxSize.height / imgEl.naturalHeight)
      : 0;
  const fillScale =
    imgEl && boxSize.width
      ? Math.max(boxSize.width / imgEl.naturalWidth, boxSize.height / imgEl.naturalHeight)
      : 0;
  // Cuánto zoom (relativo a `baseScale`) hace falta para que la imagen
  // llene el recuadro por completo — siempre ≥ 1, mayor cuanto más se
  // aleje la proporción de la foto de la del recuadro.
  const minZoomToFill = baseScale ? fillScale / baseScale : 1;
  const maxZoom = Math.max(3, minZoomToFill * MAX_ZOOM_OVER_FILL);
  const scale = baseScale * zoom;
  const displayWidth = imgEl ? imgEl.naturalWidth * scale : 0;
  const displayHeight = imgEl ? imgEl.naturalHeight * scale : 0;
  // Pequeño margen de tolerancia por redondeo de floats — sin esto, un
  // `zoom` que matemáticamente ya llena el recuadro podía quedar 0.001px
  // corto y dejar el botón de confirmar deshabilitado sin motivo visible.
  const isFilled = displayWidth >= boxSize.width - 0.5 && displayHeight >= boxSize.height - 0.5;

  const clamp = useCallback(
    (next: Offset, dw: number, dh: number): Offset => ({
      // Si la imagen no llena un eje (más angosta/baja que el recuadro en
      // ese eje — el estado inicial "contain"), no hay nada que recorrer
      // ahí: se centra en vez de dejarla pegada a una esquina (el cálculo
      // de abajo, pensado para cuando sí sobra imagen, colapsaría a 0/una
      // esquina en ese caso).
      x: dw <= boxSize.width ? (boxSize.width - dw) / 2 : Math.min(0, Math.max(boxSize.width - dw, next.x)),
      y: dh <= boxSize.height ? (boxSize.height - dh) / 2 : Math.min(0, Math.max(boxSize.height - dh, next.y)),
    }),
    [boxSize]
  );

  const centeredOffset: Offset =
    imgEl && boxSize.width
      ? clamp(
          {
            x: (boxSize.width - displayWidth) / 2,
            y: (boxSize.height - displayHeight) / 2,
          },
          displayWidth,
          displayHeight
        )
      : { x: 0, y: 0 };

  const offset = manualOffset ?? centeredOffset;

  function handleZoomChange(nextZoom: number) {
    if (!imgEl || !boxSize.width) {
      setZoom(nextZoom);
      return;
    }
    // Mantiene fijo el centro del recuadro al hacer zoom, no la esquina.
    const prevScale = baseScale * zoom;
    const nextScale = baseScale * nextZoom;
    const centerX = boxSize.width / 2 - offset.x;
    const centerY = boxSize.height / 2 - offset.y;
    setZoom(nextZoom);
    setManualOffset(
      clamp(
        {
          x: boxSize.width / 2 - (centerX / prevScale) * nextScale,
          y: boxSize.height / 2 - (centerY / prevScale) * nextScale,
        },
        imgEl.naturalWidth * nextScale,
        imgEl.naturalHeight * nextScale
      )
    );
  }

  function handlePointerDown(e: React.PointerEvent) {
    (e.target as Element).setPointerCapture(e.pointerId);
    dragState.current = { startX: e.clientX, startY: e.clientY, origin: offset };
    setIsDragging(true);
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current || !imgEl) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
    if (Math.abs(dx) > 2 || Math.abs(dy) > 2) setHasDragged(true);
    setManualOffset(
      clamp(
        { x: dragState.current.origin.x + dx, y: dragState.current.origin.y + dy },
        displayWidth,
        displayHeight
      )
    );
  }

  function handlePointerUp() {
    dragState.current = null;
    setIsDragging(false);
  }

  async function handleConfirm() {
    if (!imgEl || !file || !scale || !isFilled) return;

    const sourceX = -offset.x / scale;
    const sourceY = -offset.y / scale;
    const sourceWidth = boxSize.width / scale;
    const sourceHeight = boxSize.height / scale;

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(
      imgEl,
      sourceX,
      sourceY,
      sourceWidth,
      sourceHeight,
      0,
      0,
      outputWidth,
      outputHeight
    );

    // A 4K canvas is comfortably under the API's 5MB image cap for a
    // typical photo, but "typical" isn't guaranteed — if a particularly
    // detailed/noisy source pushes the JPEG past a safe margin, retry once
    // at a lower quality instead of letting the upload fail on something
    // the admin has no way to diagnose.
    const toBlob = (quality: number) =>
      new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));

    let blob = await toBlob(0.92);
    if (blob && blob.size > 4.5 * 1024 * 1024) {
      blob = await toBlob(0.75);
    }
    if (!blob) return;

    const croppedFile = new File(
      [blob],
      file.name.replace(/\.[^.]+$/, "") + "-recorte.jpg",
      { type: "image/jpeg" }
    );
    onConfirm(croppedFile);
  }

  return (
    <Dialog open={!!file} onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>
            Ajustar imagen — {variant === "desktop" ? "escritorio" : "mobile"}
          </DialogTitle>
          <DialogDescription>
            Ves la imagen completa, tal cual la subiste. Usa el zoom para
            acercarla hasta que llene el recuadro y arrástrala para elegir
            qué parte queda dentro. Se recorta a {ratioLabel} y se exporta
            a {outputWidth}×{outputHeight} — en alta resolución a
            propósito, para que no se vea pixeleada en la web ni en
            pantallas de alta densidad (Retina).
          </DialogDescription>
        </DialogHeader>

        <div
          ref={boxCallbackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`relative w-full touch-none overflow-hidden rounded-lg border border-border bg-muted ${aspectClass}`}
          style={{ cursor: !imgEl ? "default" : isDragging ? "grabbing" : "grab" }}
        >
          {objectUrl && imgEl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={objectUrl}
              alt=""
              draggable={false}
              className="pointer-events-none absolute select-none"
              style={{
                width: displayWidth,
                height: displayHeight,
                transform: `translate(${offset.x}px, ${offset.y}px)`,
              }}
            />
          )}
          {/* Pista de que la foto se puede arrastrar, no solo hacer zoom —
              se apaga en cuanto el admin arrastra una vez, para no estorbar
              después de que ya entendió cómo funciona. */}
          {imgEl && !hasDragged && (
            <div className="pointer-events-none absolute inset-x-0 bottom-2 flex justify-center">
              <span className="flex items-center gap-1.5 rounded-full bg-black/60 px-3 py-1.5 text-xs font-medium text-white">
                <Move className="size-3.5" />
                Arrastra la imagen para moverla
              </span>
            </div>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center gap-3">
            <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
            <input
              type="range"
              min={1}
              max={maxZoom}
              step={0.01}
              value={zoom}
              onChange={(e) => handleZoomChange(e.target.valueAsNumber)}
              className="w-full"
            />
          </div>
          {imgEl && !isFilled && (
            <p className="text-xs text-muted-foreground">
              Acerca el zoom hasta que la imagen llene todo el recuadro para poder usarla.
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!imgEl || !isFilled}>
            Usar esta imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
