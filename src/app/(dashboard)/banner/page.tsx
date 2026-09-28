"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { heroService } from "@/services/hero-service";
import { ApiError } from "@/lib/api-client";
import type { ApiHero } from "@/types/hero";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BannerEditor } from "@/components/hero/BannerEditor";
import { cn } from "@/lib/utils";

/**
 * Banner secundario de la tienda — misma tabla/pipeline que el hero
 * principal (`/inicio`), filtrada por `section: "BANNER"` (ver "Banner
 * section" en `carmessievelvet-api/src/modules/hero/CLAUDE.md`). Se muestra
 * en la tienda debajo del mensaje de la compañía, solo imagen (sin
 * título/botón) — de ahí que use `BannerEditor` en vez de `HeroEditor`.
 */
export default function BannerPage() {
  const router = useRouter();
  const [banners, setBanners] = useState<ApiHero[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    heroService
      .getHeroes("BANNER")
      .then((loaded) => {
        if (cancelled) return;
        setBanners(loaded);
        setSelectedId((prev) => prev ?? loaded[0]?.id ?? null);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los banners.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate() {
    setCreating(true);
    try {
      const created = await heroService.createHero({ section: "BANNER" });
      setBanners((prev) => (prev ? [...prev, created] : [created]));
      setSelectedId(created.id);
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo crear el banner.");
    } finally {
      setCreating(false);
    }
  }

  const selected = banners?.find((b) => b.id === selectedId) ?? null;

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Banner</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Imagen que se muestra debajo del mensaje de la compañía en{" "}
            <span className="font-medium">carmessievelvet.com</span> — solo imagen, sin texto ni
            botón.
          </p>
        </div>
        <Button type="button" onClick={handleCreate} disabled={creating} className="shrink-0 gap-1.5">
          {creating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
          Nuevo banner
        </Button>
      </div>

      {error && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      )}

      {!banners && !error && (
        <div className="flex items-center justify-center py-16 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {banners && banners.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay banners. Crea uno para empezar.
        </div>
      )}

      {banners && banners.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {banners
            .slice()
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((banner) => (
              <button
                key={banner.id}
                type="button"
                onClick={() => setSelectedId(banner.id)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-left text-sm transition-colors",
                  banner.id === selectedId
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-ring"
                )}
              >
                <div className="size-8 shrink-0 overflow-hidden rounded bg-muted">
                  {banner.imageUrl && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={banner.imageUrl} alt="" className="h-full w-full object-cover" />
                  )}
                </div>
                <span>Banner</span>
                <Badge variant={banner.active ? "default" : "secondary"} className="ml-1">
                  {banner.active ? "Activo" : "Inactivo"}
                </Badge>
              </button>
            ))}
        </div>
      )}

      {selected && (
        <BannerEditor
          key={selected.id}
          hero={selected}
          onChange={(updated) =>
            setBanners((prev) => prev?.map((b) => (b.id === updated.id ? updated : b)) ?? prev)
          }
          onDeleted={() => {
            setBanners((prev) => prev?.filter((b) => b.id !== selected.id) ?? prev);
            setSelectedId((prev) => {
              const remaining = banners?.filter((b) => b.id !== selected.id) ?? [];
              return prev === selected.id ? remaining[0]?.id ?? null : prev;
            });
            toast.success("Banner eliminado.");
          }}
        />
      )}
    </div>
  );
}
