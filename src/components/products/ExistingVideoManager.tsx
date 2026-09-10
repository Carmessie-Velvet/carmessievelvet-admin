"use client";

import { useRef, useState } from "react";
import { Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { validateProductVideoFile } from "@/lib/product-video-validation";
import { cn } from "@/lib/utils";

interface ExistingVideoManagerProps {
  sku: string;
  videoUrl: string | null;
  onChange: (videoUrl: string | null) => void;
}

/**
 * Video counterpart of `ExistingImagesManager` — every action calls the API
 * immediately (upload always replaces the current video, there's only ever
 * one). The candidate file is validated client-side (`validateProductVideoFile`)
 * before it's ever sent, same gate as the create-form's `VideoUploader`.
 */
export function ExistingVideoManager({
  sku,
  videoUrl,
  onChange,
}: ExistingVideoManagerProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState<"upload" | "delete" | "validate" | null>(null);

  function reportError(error: unknown, fallback: string) {
    toast.error(error instanceof ApiError ? error.message : fallback);
  }

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setBusy("validate");
    const result = await validateProductVideoFile(file);
    if (!result.ok) {
      toast.error(result.reason ?? "Video no válido.");
      setBusy(null);
      return;
    }

    setBusy("upload");
    try {
      const url = await catalogService.uploadProductVideo(sku, file);
      onChange(url);
    } catch (error) {
      reportError(error, "No se pudo subir el video.");
    } finally {
      setBusy(null);
    }
  }

  async function removeVideo() {
    setBusy("delete");
    try {
      const url = await catalogService.deleteProductVideo(sku);
      onChange(url);
    } catch (error) {
      reportError(error, "No se pudo borrar el video.");
    } finally {
      setBusy(null);
    }
  }

  if (videoUrl) {
    return (
      <div className="relative aspect-video w-full max-w-sm overflow-hidden rounded-lg border border-border bg-muted">
        <video src={videoUrl} controls className="h-full w-full object-cover" />
        {busy === "delete" ? (
          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
            <Loader2 className="size-4 animate-spin" />
          </div>
        ) : (
          <button
            type="button"
            onClick={removeVideo}
            disabled={busy !== null}
            aria-label="Borrar video"
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-background disabled:pointer-events-none disabled:opacity-50"
          >
            <X className="size-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy !== null}
        className={cn(
          "flex aspect-video w-full max-w-sm flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {busy !== null ? (
          <Loader2 className="size-5 animate-spin" />
        ) : (
          <>
            <Video className="size-5" />
            <span className="text-center text-[11px] leading-tight">
              Agregar video
              <br />
              (opcional)
            </span>
          </>
        )}
      </button>
      <p className="mt-1.5 text-xs text-muted-foreground">
        MP4 (H.264 + AAC), máx. 10s, hasta 1080p, ~2-4 Mbps.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="video/mp4"
        className="hidden"
        onChange={(e) => {
          handleFile(e.target.files);
          e.target.value = "";
        }}
      />
    </div>
  );
}
