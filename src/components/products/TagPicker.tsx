"use client";

import { cn } from "@/lib/utils";
import type { ApiTag } from "@/types/catalog";

interface TagPickerProps {
  tags: ApiTag[];
  value: string[];
  onChange: (tagIds: string[]) => void;
}

export function TagPicker({ tags, value, onChange }: TagPickerProps) {
  if (tags.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No hay tags todavía — crealas en la sección Tags del menú.
      </p>
    );
  }

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map((tag) => {
        const selected = value.includes(tag.id);
        return (
          <button
            key={tag.id}
            type="button"
            onClick={() =>
              onChange(
                selected ? value.filter((id) => id !== tag.id) : [...value, tag.id]
              )
            }
            className={cn(
              "rounded-full border px-2.5 py-1 text-xs transition-colors",
              selected
                ? "border-primary bg-primary text-primary-foreground"
                : "border-border bg-background hover:bg-muted"
            )}
          >
            {tag.name}
          </button>
        );
      })}
    </div>
  );
}
