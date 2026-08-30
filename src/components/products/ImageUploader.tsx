"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ImagePlus, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface ImageUploaderProps {
  value: File[];
  onChange: (files: File[]) => void;
}

export function ImageUploader({ value, onChange }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const previews = useMemo(
    () => value.map((file) => ({ file, url: URL.createObjectURL(file) })),
    [value]
  );

  useEffect(() => {
    return () => {
      for (const preview of previews) URL.revokeObjectURL(preview.url);
    };
  }, [previews]);

  function addFiles(fileList: FileList | null) {
    if (!fileList) return;
    const incoming = Array.from(fileList).filter((f) =>
      f.type.startsWith("image/")
    );
    if (incoming.length === 0) return;
    onChange([...value, ...incoming]);
  }

  function removeAt(index: number) {
    onChange(value.filter((_, i) => i !== index));
  }

  return (
    <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
      {previews.map((preview, index) => (
        <div
          key={`${preview.file.name}-${preview.file.lastModified}-${index}`}
          className="group relative aspect-square overflow-hidden rounded-lg border border-border bg-muted"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={preview.url}
            alt={`Imagen ${index + 1} del producto`}
            className="h-full w-full object-cover"
          />
          {index === 0 && (
            <span className="absolute left-1.5 top-1.5 rounded bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground">
              Portada
            </span>
          )}
          <button
            type="button"
            onClick={() => removeAt(index)}
            aria-label="Quitar imagen"
            className="absolute right-1.5 top-1.5 flex size-6 items-center justify-center rounded-full bg-background/90 text-foreground shadow-sm transition-opacity hover:bg-background"
          >
            <X className="size-3.5" />
          </button>
        </div>
      ))}

      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          addFiles(e.dataTransfer.files);
        }}
        className={cn(
          "flex aspect-square flex-col items-center justify-center gap-1.5 rounded-lg border border-dashed text-muted-foreground transition-colors hover:border-ring hover:text-foreground",
          isDragging ? "border-ring bg-muted text-foreground" : "border-border"
        )}
      >
        <ImagePlus className="size-5" />
        <span className="text-center text-[11px] leading-tight">
          Agregar
          <br />
          imágenes
        </span>
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
