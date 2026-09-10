"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { heroService } from "@/services/hero-service";
import { catalogService } from "@/services/catalog-service";
import { ApiError } from "@/lib/api-client";
import type { ApiCategory } from "@/types/catalog";
import type { ApiHero } from "@/types/hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroEditor } from "@/components/hero/HeroEditor";
import { cn } from "@/lib/utils";

/**
 * Portadas del inicio de la tienda — cada `ApiHero` es una posible pieza de
 * ese primer bloque full-bleed. `GET /store/hero` (público) devuelve todas
 * las `active`, ordenadas por `sortOrder`, así que este admin no fuerza
 * "una sola" — puede haber varias activas (un carrusel del lado de la
 * tienda) o una sola. La edición vive en `HeroEditor`, sobre una
 * previsualización que imita el hero real.
 */
export default function StoreHeroPage() {
  const router = useRouter();
  const [heroes, setHeroes] = useState<ApiHero[] | null>(null);
  const [categories, setCategories] = useState<ApiCategory[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    Promise.all([heroService.getHeroes(), catalogService.getCategories()])
      .then(([loadedHeroes, loadedCategories]) => {
        if (cancelled) return;
        setHeroes(loadedHeroes);
        setCategories(loadedCategories);
        setSelectedId((prev) => prev ?? loadedHeroes[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar las portadas.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate() {
    setCreating(true);
    try {
      // `showTitle`/`showContent`/`showButton` default to `true` at the
      // entity level, but a fresh hero has no title/content/button yet —
      // sending nothing 400s ("showTitle requires title to be set"), so
      // they're turned off explicitly until the admin fills something in
      // and flips them on from the editor.
      const created = await heroService.createHero({
        showTitle: false,
        showContent: false,
        showButton: false,
      });
      setHeroes((prev) => (prev ? [...prev, created] : [created]));
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear la portada.");
    } finally {
      setCreating(false);
    }
  }

  const selected = heroes?.find((h) => h.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Inicio de la tienda</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            La imagen y el texto de la portada de <span className="font-medium">carmessievelvet.com</span>.
            Edita directo sobre la previsualización — se ve igual a como lo verá quien entre a la tienda.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={creating} className="shrink-0 gap-1.5">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Nueva portada
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!heroes && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {heroes && heroes.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay portadas. Crea una para empezar.
        </div>
      )}

      {heroes && heroes.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {heroes
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((hero) => (
              <button
                key={hero.id}
                type="button"
                onClick={() => setSelectedId(hero.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  hero.id === selectedId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-ring"
                )}
              >
                <div className="size-8 shrink-0 overflow-hidden rounded bg-muted">
                  {hero.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={hero.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span className="max-w-[10rem] truncate">
                  {hero.title || hero.content || "Sin texto todavía"}
                </span>
                <Badge variant={hero.active ? "default" : "secondary"} className="ml-1">
                  {hero.active ? "Activa" : "Inactiva"}
                </Badge>
              </button>
            ))}
        </div>
      )}

      {selected && (
        <HeroEditor
          key={selected.id}
          hero={selected}
          categories={categories}
          onChange={(updated) =>
            setHeroes((prev) => prev?.map((h) => (h.id === updated.id ? updated : h)) ?? prev)
          }
          onDeleted={() => {
            setHeroes((prev) => prev?.filter((h) => h.id !== selected.id) ?? prev);
            setSelectedId((prev) => {
              const remaining = heroes?.filter((h) => h.id !== selected.id) ?? [];
              return prev === selected.id ? remaining[0]?.id ?? null : prev;
            });
            toast.success("Portada eliminada.");
          }}
        />
      )}
    </div>
  );
}
