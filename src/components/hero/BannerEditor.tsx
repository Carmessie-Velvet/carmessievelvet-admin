"use client";

import { useRef, useState } from "react";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { heroService } from "@/services/hero-service";
import { ApiError } from "@/lib/api-client";
import type { ApiHero, HeroImageVariant } from "@/types/hero";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { HeroImageCropper } from "@/components/hero/HeroImageCropper";

interface BannerEditorProps {
  hero: ApiHero;
  onChange: (hero: ApiHero) => void;
  onDeleted: () => void;
}

/**
 * Editor de una fila `section: "BANNER"` — solo imagen (desktop + mobile),
 * sin título/contenido/botón (la API los rechaza para un banner, ver
 * "Banner section" en `carmessievelvet-api/src/modules/hero/CLAUDE.md`).
 * Reusa `HeroImageCropper`/el mismo pipeline de subida que `HeroEditor`
 * (mismos endpoints, misma validación de dimensiones) — solo le falta el
 * formulario de texto porque un banner nunca lo necesita.
 */
export function BannerEditor({ hero, onChange, onDeleted }: BannerEditorProps) {
  const desktopInputRef = useRef<HTMLInputElement>(null);
  const mobileInputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirmDialog();
  const [uploadingVariant, setUploadingVariant] = useState<HeroImageVariant | null>(null);
  const [pendingCrop, setPendingCrop] = useState<{ file: File; variant: HeroImageVariant } | null>(
    null
  );
  const [cropSession, setCropSession] = useState(0);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [sortOrder, setSortOrder] = useState(hero.sortOrder);

  async function uploadCroppedImage(croppedFile: File, variant: HeroImageVariant) {
    setPendingCrop(null);
    setUploadingVariant(variant);
    try {
      const updated = await heroService.uploadHeroImage(hero.id, croppedFile, variant);
      onChange(updated);
      toast.success("Imagen actualizada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingVariant(null);
    }
  }

  async function toggleActive() {
    setTogglingActive(true);
    try {
      const updated = await heroService.setHeroStatus(hero.id, !hero.active);
      onChange(updated);
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo actualizar el estado.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleDelete() {
    const ok = await confirm({
      title: "¿Eliminar este banner?",
      description: "Esta acción no se puede deshacer desde el admin.",
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setDeleting(true);
    try {
      await heroService.deleteHero(hero.id);
      onDeleted();
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo eliminar.");
      setDeleting(false);
    }
  }

  async function saveSortOrder() {
    try {
      const updated = await heroService.updateHero(hero.id, { sortOrder });
      onChange(updated);
      toast.success("Orden actualizado.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar el orden.");
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#2a1f1c]">
        {hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={hero.imageUrl} alt="" className="absolute inset-0 h-full w-full object-cover" />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/50">
            Sube una imagen para poder activar este banner.
          </div>
        )}
        <button
          type="button"
          onClick={() => desktopInputRef.current?.click()}
          disabled={uploadingVariant === "desktop"}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[#fffdfb]/90 px-3 py-1.5 text-xs font-medium text-[#2a1f1c] shadow-sm transition-opacity hover:bg-[#fffdfb] disabled:pointer-events-none disabled:opacity-60"
        >
          {uploadingVariant === "desktop" ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {hero.imageUrl ? "Cambiar imagen" : "Subir imagen"}
        </button>
      </div>

      <div className="flex items-center gap-4 rounded-xl border border-border p-4">
        <div className="relative h-28 w-[90px] shrink-0 overflow-hidden rounded-lg bg-[#2a1f1c]">
          {hero.imageMobileUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={hero.imageMobileUrl}
              alt=""
              className="absolute inset-0 h-full w-full object-cover"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center px-1 text-center text-[10px] text-white/50">
              Sin imagen
            </div>
          )}
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium">Imagen para mobile</p>
          <p className="text-xs text-muted-foreground">
            Recorte vertical — se usa en pantallas angostas en vez de la imagen de arriba.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-1.5 w-fit gap-1.5"
            disabled={uploadingVariant === "mobile"}
            onClick={() => mobileInputRef.current?.click()}
          >
            {uploadingVariant === "mobile" ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : (
              <ImagePlus className="size-3.5" />
            )}
            {hero.imageMobileUrl ? "Cambiar imagen" : "Subir imagen"}
          </Button>
        </div>
      </div>

      <input
        ref={desktopInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingCrop({ file, variant: "desktop" });
            setCropSession((n) => n + 1);
          }
          e.target.value = "";
        }}
      />
      <input
        ref={mobileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingCrop({ file, variant: "mobile" });
            setCropSession((n) => n + 1);
          }
          e.target.value = "";
        }}
      />

      <HeroImageCropper
        key={cropSession}
        file={pendingCrop?.file ?? null}
        variant={pendingCrop?.variant ?? "desktop"}
        onCancel={() => setPendingCrop(null)}
        onConfirm={(file) => uploadCroppedImage(file, pendingCrop?.variant ?? "desktop")}
      />

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={togglingActive || (!hero.active && (!hero.imageUrl || !hero.imageMobileUrl))}
            title={
              !hero.active && (!hero.imageUrl || !hero.imageMobileUrl)
                ? "Necesita las dos imágenes (escritorio y mobile) para activarse"
                : undefined
            }
            onClick={toggleActive}
          >
            {togglingActive ? (
              <Loader2 className="size-3.5 animate-spin" />
            ) : hero.active ? (
              "Desactivar"
            ) : (
              "Activar"
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={deleting}
            onClick={handleDelete}
            className="text-muted-foreground"
          >
            Eliminar banner
          </Button>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <Label htmlFor="bannerSortOrder" className="text-xs text-muted-foreground">
              Orden
            </Label>
            <Input
              id="bannerSortOrder"
              type="number"
              className="w-16"
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.valueAsNumber || 0)}
            />
          </div>
          <Button
            type="button"
            variant="outline"
            disabled={sortOrder === hero.sortOrder}
            onClick={() => setSortOrder(hero.sortOrder)}
          >
            Descartar
          </Button>
          <Button type="button" disabled={sortOrder === hero.sortOrder} onClick={saveSortOrder}>
            Guardar orden
          </Button>
        </div>
      </div>
    </div>
  );
}
