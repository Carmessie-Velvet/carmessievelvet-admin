"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, PlusCircle, Tag as TagIcon, Trash2, X } from "lucide-react";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiTag } from "@/types/catalog";

export default function TagsPage() {
  const router = useRouter();
  const [tags, setTags] = useState<ApiTag[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [creating, setCreating] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    catalogService
      .getTags()
      .then((data) => {
        if (!cancelled) setTags(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las tags.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate() {
    const name = newName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const created = await catalogService.createTag(name);
      setTags((prev) => (prev ? [...prev, created] : [created]));
      setNewName("");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la tag.");
    } finally {
      setCreating(false);
    }
  }

  function startEdit(tag: ApiTag) {
    setEditingId(tag.id);
    setEditValue(tag.name);
  }

  async function saveEdit(id: string) {
    const name = editValue.trim();
    if (!name) return;

    setBusyId(id);
    try {
      const updated = await catalogService.updateTag(id, name);
      setTags((prev) => prev?.map((t) => (t.id === id ? updated : t)) ?? prev);
      setEditingId(null);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo renombrar la tag.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(tag: ApiTag) {
    if (!window.confirm(`¿Eliminar la tag "${tag.name}"?`)) return;

    setBusyId(tag.id);
    try {
      await catalogService.deleteTag(tag.id);
      setTags((prev) => prev?.filter((t) => t.id !== tag.id) ?? prev);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar la tag.");
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tags</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Se usan para clasificar y buscar productos en la tienda pública.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <span className="flex size-9 items-center justify-center rounded-md bg-primary/10 text-primary">
              <TagIcon className="size-4" />
            </span>
            <div>
              <CardTitle>Nueva tag</CardTitle>
              <CardDescription>Ej. encaje, satín, temporada-verano.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <Input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Nombre de la tag"
            />
            <Button type="submit" disabled={creating || !newName.trim()} className="gap-1.5">
              <PlusCircle className="size-4" />
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      {!tags && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {tags && tags.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay tags.
        </div>
      )}

      {tags && tags.length > 0 && (
        <div className="flex flex-col gap-2">
          {tags.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 rounded-lg border border-border px-3 py-2"
            >
              {editingId === tag.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    autoFocus
                    className="h-7"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === tag.id}
                    onClick={() => saveEdit(tag.id)}
                    aria-label="Guardar"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === tag.id}
                    onClick={() => setEditingId(null)}
                    aria-label="Cancelar"
                  >
                    <X className="size-3.5" />
                  </Button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => startEdit(tag)}
                    className="flex-1 text-left text-sm hover:underline"
                  >
                    {tag.name}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === tag.id}
                    onClick={() => handleDelete(tag)}
                    aria-label={`Eliminar ${tag.name}`}
                  >
                    {busyId === tag.id ? (
                      <Loader2 className="size-3.5 animate-spin" />
                    ) : (
                      <Trash2 className="size-3.5 text-muted-foreground" />
                    )}
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
