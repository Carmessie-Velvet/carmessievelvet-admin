"use client";

import { useRef, useState } from "react";
import { Film, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { heroService } from "@/services/hero-service";
import { ApiError } from "@/lib/api-client";
import { HERO_VIDEO_SPECS, validateHeroVideoFile } from "@/lib/hero-video-validation";
import type { ApiHero, HeroImageVariant } from "@/types/hero";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";

interface HeroVideoManagerProps {
  hero: ApiHero;
  onChange: (hero: ApiHero) => void;
}

const VARIANTS: {
  variant: HeroImageVariant;
  title: string;
  /** Preview box — the same proportion the storefront crops this viewport to. */
  boxClassName: string;
  urlKey: "videoUrl" | "videoMobileUrl";
  posterKey: "imageUrl" | "imageMobileUrl";
  removeTitle: string;
}[] = [
  {
    variant: "desktop",
    title: "Video para escritorio",
    boxClassName: "aspect-video w-44",
    urlKey: "videoUrl",
    posterKey: "imageUrl",
    removeTitle: "¿Quitar el video de escritorio?",
  },
  {
    variant: "mobile",
    title: "Video para mobile",
    boxClassName: "aspect-[4/5] w-24",
    urlKey: "videoMobileUrl",
    posterKey: "imageMobileUrl",
    removeTitle: "¿Quitar el video de mobile?",
  },
];

/**
 * Videos opcionales de una portada o banner, uno por pantalla (escritorio y
 * mobile), igual que las imágenes. El video va **encima** de la imagen del
 * mismo variant, que sigue siendo obligatoria para activar: en la tienda esa
 * imagen es lo que se ve al instante mientras el video carga, y el respaldo
 * para quien no puede o no debe reproducirlo (ahorro de datos, movimiento
 * reducido). Sin video en una pantalla, se ve solo su imagen — por eso los dos
 * son independientes. A diferencia de una imagen, un video se puede subir y
 * quitar con la portada activa: quitarlo solo hace que vuelva a verse la
 * imagen.
 *
 * Cada archivo pasa por `validateHeroVideoFile` antes de tocar la API — que
 * solo revisa el contenedor y el peso — y cada acción se aplica al instante
 * (no hay botón de "guardar"), igual que las imágenes.
 */
export function HeroVideoManager({ hero, onChange }: HeroVideoManagerProps) {
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const inputRefs: Record<HeroImageVariant, React.RefObject<HTMLInputElement | null>> = {
    desktop: desktopInputRef,
    mobile: mobileInputRef,
  };
  const { confirm } = useConfirmDialog();
  // Qué variante está validando/subiendo/quitando ahora — `null` si ninguna.
  const [busy, setBusy] = useState<{ variant: HeroImageVariant; action: "upload" | "delete" } | null>(
    null
  );

  async function handleFile(variant: HeroImageVariant, file: File) {
    setBusy({ variant, action: "upload" });
    try {
      const result = await validateHeroVideoFile(file, variant);
      if (!result.ok) {
        toast.error(result.reason ?? "Video no válido.");
        return;
      }
      const updated = await heroService.uploadHeroVideo(hero.id, file, variant);
      onChange(updated);
      toast.success("Video actualizado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo subir el video.");
    } finally {
      setBusy(null);
    }
  }

  async function handleRemove(variant: HeroImageVariant, title: string) {
    const ok = await confirm({
      title,
      description: "La imagen de esta pantalla se queda y se verá sola, sin video.",
      confirmLabel: "Quitar video",
      destructive: true,
    });
    if (!ok) return;

    setBusy({ variant, action: "delete" });
    try {
      const updated = await heroService.deleteHeroVideo(hero.id, variant);
      onChange(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo quitar el video.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border p-4">
      <div>
        <p className="text-sm font-medium">Video (opcional)</p>
        <p className="text-xs text-muted-foreground">
          Se reproduce en bucle y sin sonido encima de la imagen de la misma pantalla. La imagen se
          ve mientras el video carga y para quien no lo pueda reproducir; sin video, se ve solo la
          imagen.
        </p>
      </div>

      {VARIANTS.map(({ variant, title, boxClassName, urlKey, posterKey, removeTitle }) => {
        const url = hero[urlKey];
        const poster = hero[posterKey];
        const working = busy?.variant === variant;

        return (
          <div key={variant} className="flex items-center gap-4">
            <div
              className={`relative shrink-0 overflow-hidden rounded-lg bg-[#2a1f1c] ${boxClassName}`}
            >
              {url ? (
                <video
                  src={url}
                  poster={poster ?? undefined}
                  autoPlay
                  muted
                  loop
                  playsInline
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-1 text-center text-[10px] text-white/50">
                  <Film className="size-4" />
                  Sin video
                </div>
              )}
              {working && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <Loader2 className="size-4 animate-spin text-white" />
                </div>
              )}
            </div>

            <div className="flex min-w-0 flex-col gap-1">
              <p className="text-sm font-medium">{title}</p>
              <p className="text-xs text-muted-foreground">{HERO_VIDEO_SPECS[variant].summary}</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1.5"
                  disabled={busy !== null}
                  onClick={() => inputRefs[variant].current?.click()}
                >
                  <Film className="size-3.5" />
                  {url ? "Cambiar video" : "Subir video"}
                </Button>
                {url && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-muted-foreground"
                    disabled={busy !== null}
                    onClick={() => handleRemove(variant, removeTitle)}
                  >
                    Quitar
                  </Button>
                )}
              </div>
            </div>

            <input
              ref={inputRefs[variant]}
              type="file"
              accept="video/mp4"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(variant, file);
                e.target.value = "";
              }}
            />
          </div>
        );
      })}
    </div>
  );
}
