"use client";

import { useRef, useState } from "react";
import { ChevronLeft, ChevronRight, ImagePlus, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { cn } from "@/lib/utils";

interface ExistingImagesManagerProps {
  sku: string;
  images: string[];
  onChange: (images: string[]) => void;
}

/**
 * Unlike `ImageUploader` (which just holds `File[]` for a later form
 * submit), every action here calls the API immediately — reorder/delete/
 * upload are their own endpoints on an already-created product, there's
 * no "pending" state to submit later.
 */
export function ExistingImagesManager({
  sku,
  images,
  onChange,
}: ExistingImagesManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "reorder" | string | null>(null);

  function reportError(error: unknown, fallback: string) {
    toast.error(error instanceof ApiError ? error.message : fallback);
  }

  async function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= images.length) return;

    const next = [...images];
    [next[index], next[target]] = [next[target], next[index]];

    setBusy("reorder");
    try {
      const result = await catalogService.reorderProductImages(sku, next);
      onChange(result);
    } catch (error) {
      reportError(error, "No se pudo reordenar las imágenes.");
    } finally {
      setBusy(null);
    }
  }

  async function removeAt(url: string) {
    setBusy(url);
    try {
      const result = await catalogService.deleteProductImage(sku, url);
      onChange(result);
    } catch (error) {
      reportError(error, "No se pudo borrar la imagen.");
    } finally {
      setBusy(null);
    }
  }

  async function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList).filter((f) => f.type.startsWith("image/"));
    if (files.length === 0) return;

    setBusy("upload");
    try {
      const result = await catalogService.uploadProductImages(sku, files);
      onChange(result);
    } catch (error) {
      reportError(error, "No se pudieron subir las imágenes.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {images.map((url, index) => (
        <div
          key={url}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={url} alt={`Imagen ${index + 1}`} className="h-full w-full object-cover" />

          {index === 0 && (
            <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Portada
            </span>
          )}

          {busy === url ? (
            <div className="absolute inset-0 flex items-center justify-center bg-background/70">
              <Loader2 className="size-4 animate-spin" />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => removeAt(url)}
              disabled={busy !== null}
              aria-label="Borrar imagen"
              className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-background disabled:pointer-events-none disabled:opacity-50"
            >
              <X className="size-3.5" />
            </button>
          )}

          <div className="absolute bottom-1.5 left-1.5 flex gap-1">
            <button
              type="button"
              onClick={() => move(index, -1)}
              disabled={busy !== null || index === 0}
              aria-label="Mover a la izquierda"
              className="flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronLeft className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => move(index, 1)}
              disabled={busy !== null || index === images.length - 1}
              aria-label="Mover a la derecha"
              className="flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm hover:bg-background disabled:pointer-events-none disabled:opacity-40"
            >
              <ChevronRight className="size-3.5" />
            </button>
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy !== null}
        className={cn(
          "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50",
          "border-border"
        )}
      >
        {busy === "upload" ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <ImagePlus className="size-5" />
            <span className="text-center text-[11px] leading-tight">
              Agregar
              <br />
              imágenes
            </span>
          </>
        )}
      </button>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
