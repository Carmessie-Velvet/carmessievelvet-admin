"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Video, X } from "lucide-react";
import { toast } from "sonner";
import { validateProductVideoFile } from "@/lib/product-video-validation";
import { cn } from "@/lib/utils";

interface VideoUploaderProps {
  value: File | null;
  onChange: (file: File | null) => void;
}

/**
 * Single pending video for the "Nuevo producto" form — same "hold a File,
 * upload after the product exists" pattern as `ImageUploader`, but capped
 * at one file and gated by `validateProductVideoFile` before it's ever
 * accepted into form state (the API itself doesn't check duration/
 * resolution/bitrate, only container type and size).
 *
 * Previewed at `aspect-[2/3]` (not 16:9) — on the real PDP the video sits
 * in the gallery's left column at the same `2:3` crop as every product
 * image (`IMAGE_RATIO` in `carmessievelvet-web`'s `ProductGallery.tsx`),
 * so this is what the admin should see while picking a clip, not an
 * unrelated widescreen frame.
 */
export function VideoUploader({ value, onChange }: VideoUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [validating, setValidating] = useState(false);

  const previewUrl = useMemo(
    () => (value ? URL.createObjectURL(value) : null),
    [value]
  );

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  async function handleFile(fileList: FileList | null) {
    const file = fileList?.[0];
    if (!file) return;

    setValidating(true);
    try {
      const result = await validateProductVideoFile(file);
      if (!result.ok) {
        toast.error(result.reason ?? "Video no válido.");
        return;
      }
      onChange(file);
    } finally {
      setValidating(false);
    }
  }

  if (value && previewUrl) {
    return (
      <div className="relative aspect-[2/3] w-full max-w-[240px] overflow-hidden rounded-lg border border-border bg-muted">
        <video src={previewUrl} controls className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={() => onChange(null)}
          aria-label="Quitar video"
          className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-background"
        >
          <X className="size-3.5" />
        </button>
      </div>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={validating}
        className={cn(
          "flex aspect-[2/3] w-full max-w-[240px] flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed border-border text-muted-foreground transition-colors hover:border-ring hover:text-foreground disabled:pointer-events-none disabled:opacity-50"
        )}
      >
        {validating ? (
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
