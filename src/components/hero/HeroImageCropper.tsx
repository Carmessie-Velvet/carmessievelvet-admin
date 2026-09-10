"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ZoomIn } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

const OUTPUT_WIDTH = 1920;
const OUTPUT_HEIGHT = 1080; // 16:9 — mismo mínimo que exige la API para el hero.
const MAX_ZOOM = 3;

type Offset = { x: number; y: number };

interface HeroImageCropperProps {
  file: File | null;
  onCancel: () => void;
  onConfirm: (file: File) => void;
}

/**
 * La API exige que la imagen del hero sea ~16:9 y de al menos 1920×1080 —
 * antes esto solo se descubría como un 400 después de intentar subir una
 * foto que no cumplía. En vez de solo rechazar, esto deja al admin mover y
 * hacer zoom sobre la imagen real dentro de un recuadro 16:9 para elegir
 * qué parte se ve, y exporta siempre un recorte que ya cumple el requisito
 * (1920×1080 exactos) — la subida real nunca puede fallar por dimensiones.
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
export function HeroImageCropper({ file, onCancel, onConfirm }: HeroImageCropperProps) {
  const [imgEl, setImgEl] = useState<HTMLImageElement | null>(null);
  const [boxSize, setBoxSize] = useState({ width: 0, height: 0 });
  const [zoom, setZoom] = useState(1);
  const [manualOffset, setManualOffset] = useState<Offset | null>(null);
  const dragState = useRef<{ startX: number; startY: number; origin: Offset } | null>(null);

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

  const baseScale =
    imgEl && boxSize.width
      ? Math.max(boxSize.width / imgEl.naturalWidth, boxSize.height / imgEl.naturalHeight)
      : 0;
  const scale = baseScale * zoom;
  const displayWidth = imgEl ? imgEl.naturalWidth * scale : 0;
  const displayHeight = imgEl ? imgEl.naturalHeight * scale : 0;

  const clamp = useCallback(
    (next: Offset, dw: number, dh: number): Offset => ({
      x: Math.min(0, Math.max(boxSize.width - dw, next.x)),
      y: Math.min(0, Math.max(boxSize.height - dh, next.y)),
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
  }

  function handlePointerMove(e: React.PointerEvent) {
    if (!dragState.current || !imgEl) return;
    const dx = e.clientX - dragState.current.startX;
    const dy = e.clientY - dragState.current.startY;
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
  }

  async function handleConfirm() {
    if (!imgEl || !file || !scale) return;

    const sourceX = -offset.x / scale;
    const sourceY = -offset.y / scale;
    const sourceWidth = boxSize.width / scale;
    const sourceHeight = boxSize.height / scale;

    const canvas = document.createElement("canvas");
    canvas.width = OUTPUT_WIDTH;
    canvas.height = OUTPUT_HEIGHT;
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
      OUTPUT_WIDTH,
      OUTPUT_HEIGHT
    );

    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.92)
    );
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
          <DialogTitle>Ajustar imagen</DialogTitle>
          <DialogDescription>
            Arrastra para mover y usa el zoom para elegir qué parte de la
            imagen se ve. Se recorta a 1920×1080 (16:9), el formato que
            necesita la portada.
          </DialogDescription>
        </DialogHeader>

        <div
          ref={boxCallbackRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className="relative aspect-video w-full touch-none overflow-hidden rounded-lg border border-border bg-muted"
          style={{ cursor: imgEl ? "grab" : "default" }}
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
        </div>

        <div className="flex items-center gap-3">
          <ZoomIn className="size-4 shrink-0 text-muted-foreground" />
          <input
            type="range"
            min={1}
            max={MAX_ZOOM}
            step={0.01}
            value={zoom}
            onChange={(e) => handleZoomChange(e.target.valueAsNumber)}
            className="w-full"
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleConfirm} disabled={!imgEl}>
            Usar esta imagen
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
