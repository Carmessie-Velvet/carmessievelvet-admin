"use client";

import { useRef, useState } from "react";
import { useForm, useWatch } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { ImagePlus, Loader2 } from "lucide-react";
import { heroService } from "@/services/hero-service";
import { ApiError } from "@/lib/api-client";
import type { ApiCategory } from "@/types/catalog";
import type { ApiHero } from "@/types/hero";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { HeroImageCropper } from "@/components/hero/HeroImageCropper";

// Mismo patrón que el backend (`hero.dto.ts`) — ruta interna de la tienda,
// nunca una URL completa, para que el botón no sea un open redirect.
const INTERNAL_PATH_PATTERN = /^\/(?!\/)(?!.*:\/\/).*$/;

const heroFormSchema = z
  .object({
    title: z.string().trim().max(160, "Máximo 160 caracteres"),
    content: z.string().trim(),
    buttonLabel: z.string().trim().max(60, "Máximo 60 caracteres"),
    buttonPath: z
      .string()
      .trim()
      .max(300, "Máximo 300 caracteres")
      .refine((v) => v === "" || INTERNAL_PATH_PATTERN.test(v), {
        message: 'Debe ser una ruta interna que empiece con "/" (no una URL completa)',
      }),
    showTitle: z.boolean(),
    showContent: z.boolean(),
    showButton: z.boolean(),
    sortOrder: z.number().int(),
  })
  .refine((data) => !data.showTitle || data.title !== "", {
    message: "Escribe la etiqueta o desactiva mostrarla",
    path: ["title"],
  })
  .refine((data) => !data.showContent || data.content !== "", {
    message: "Escribe el título o desactiva mostrarlo",
    path: ["content"],
  })
  .refine((data) => !data.showButton || (data.buttonLabel !== "" && data.buttonPath !== ""), {
    message: "El botón necesita texto y una ruta, o desactívalo",
    path: ["buttonLabel"],
  });

type HeroFormValues = z.infer<typeof heroFormSchema>;

function valuesFromHero(hero: ApiHero): HeroFormValues {
  return {
    title: hero.title ?? "",
    content: hero.content ?? "",
    buttonLabel: hero.buttonLabel ?? "",
    buttonPath: hero.buttonPath ?? "",
    showTitle: hero.showTitle,
    showContent: hero.showContent,
    showButton: hero.showButton,
    sortOrder: hero.sortOrder,
  };
}

// The storefront doesn't derive its category slugs from the name at all —
// `CATEGORY_OVERRIDES` in carmessievelvet-web's `product-service.ts` maps
// the two known seed categories by hand ("Corset" -> "corsets", "Sets" ->
// "Sets"), because the API's singular seed name ("Corset") doesn't match
// the plural URL the site already used. A naive slugify of "Corset" gives
// "corset" (singular) — a real link to an empty page, reported live by
// whoever's working the web side. Mirrored here so the suggestion chip
// actually points somewhere real for the two categories that exist today;
// any other category falls back to the plain slugify below (same
// best-effort caveat already noted where this is used).
const CATEGORY_SLUG_OVERRIDES: Record<string, string> = {
  corset: "corsets",
  sets: "sets",
};

function slugify(name: string): string {
  const override = CATEGORY_SLUG_OVERRIDES[name.trim().toLowerCase()];
  if (override) return override;

  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

interface HeroEditorProps {
  hero: ApiHero;
  categories: ApiCategory[];
  onChange: (hero: ApiHero) => void;
  onDeleted: () => void;
}

/**
 * Edición "WYSIWYG": el título/etiqueta/botón se editan directo sobre la
 * misma previsualización que imita el hero real de la tienda (mismos
 * colores/tipografía/tracking que `carmessievelvet-web`'s `src/app/page.tsx`
 * — Archivo ya es la fuente de este admin también, ver `layout.tsx`/
 * `globals.css`), así lo que el admin ve mientras escribe es exactamente lo
 * que vería un comprador. Los toggles "mostrar" ocultan/muestran ese mismo
 * bloque en vivo. El texto se guarda con un botón explícito (`PATCH
 * /heroes/:id`, patrón `isDirty` del resto del admin); la imagen y el
 * estado activo son sus propios endpoints y se aplican al instante, igual
 * que `ExistingImagesManager`/el toggle de cupones.
 */
export function HeroEditor({ hero, categories, onChange, onDeleted }: HeroEditorProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { confirm } = useConfirmDialog();
  const [uploadingImage, setUploadingImage] = useState(false);
  const [pendingCropFile, setPendingCropFile] = useState<File | null>(null);
  // Da un `key` nuevo al cropper por cada archivo elegido (ver
  // `HeroImageCropper`) para que remonte con estado (zoom/paneo) limpio,
  // incluso si el admin selecciona el mismo archivo dos veces seguidas.
  const [cropSession, setCropSession] = useState(0);
  const [togglingActive, setTogglingActive] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const form = useForm<HeroFormValues>({
    resolver: zodResolver(heroFormSchema),
    defaultValues: valuesFromHero(hero),
    values: valuesFromHero(hero),
  });

  const title = useWatch({ control: form.control, name: "title" });
  const content = useWatch({ control: form.control, name: "content" });
  const buttonLabel = useWatch({ control: form.control, name: "buttonLabel" });
  const buttonPath = useWatch({ control: form.control, name: "buttonPath" });
  const showTitle = useWatch({ control: form.control, name: "showTitle" });
  const showContent = useWatch({ control: form.control, name: "showContent" });
  const showButton = useWatch({ control: form.control, name: "showButton" });
  const sortOrder = useWatch({ control: form.control, name: "sortOrder" });

  // El título grande se limita a 3 líneas visuales (pedido explícito) — el
  // navegador ya reflejó el cambio en `e.target` antes de que este handler
  // corra, así que comparar `scrollHeight`/`clientHeight` aquí mismo (antes
  // de confirmarlo a react-hook-form) detecta de forma síncrona si el
  // nuevo valor necesitaría una 4ª línea, y de ser así revierte el DOM al
  // valor anterior en vez de aceptarlo.
  function handleContentChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    const el = e.target;
    if (el.scrollHeight > el.clientHeight + 1) {
      el.value = content;
      return;
    }
    form.setValue("content", el.value, { shouldDirty: true });
  }

  async function onSubmit(values: HeroFormValues) {
    try {
      const updated = await heroService.updateHero(hero.id, {
        title: values.title || undefined,
        content: values.content || undefined,
        buttonLabel: values.buttonLabel || undefined,
        buttonPath: values.buttonPath || undefined,
        showTitle: values.showTitle,
        showContent: values.showContent,
        showButton: values.showButton,
        sortOrder: values.sortOrder,
      });
      onChange(updated);
      toast.success("Portada actualizada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo guardar.");
    }
  }

  async function uploadCroppedImage(croppedFile: File) {
    setPendingCropFile(null);
    setUploadingImage(true);
    try {
      const updated = await heroService.uploadHeroImage(hero.id, croppedFile);
      onChange(updated);
      toast.success("Imagen actualizada.");
    } catch (error) {
      toast.error(error instanceof ApiError ? error.message : "No se pudo subir la imagen.");
    } finally {
      setUploadingImage(false);
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
      title: "¿Eliminar esta portada?",
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

  const categorySuggestions = categories
    .filter((c) => c.active)
    .map((c) => ({ label: c.name, path: `/tienda?categoria=${slugify(c.name)}` }));

  return (
    <div className="flex flex-col gap-4">
      {/*
        Previsualización — mismos tonos/tipografía que el hero real de la
        tienda. El hero real no tiene una proporción fija (`h-[88svh]
        w-full`, la altura depende del viewport de quien esté mirando) —
        no existe una sola proporción "correcta" que calcar. `aspect-[16/10]`
        es una aproximación razonable a un navegador de escritorio típico,
        más cercana a lo que se ve en la práctica que el 16:9 usado antes.
      */}
      <div
        className="relative aspect-[16/10] w-full overflow-hidden rounded-xl bg-[#2a1f1c] [container-type:inline-size]"
      >
        {hero.imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={hero.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover opacity-90"
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center px-6 text-center text-sm text-white/50">
            Sube una imagen para poder activar esta portada.
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#2a1f1c]/70 via-[#2a1f1c]/10 to-transparent" />
        <div className="absolute inset-x-0 top-0 h-1/4 bg-gradient-to-b from-[#2a1f1c]/70 via-[#2a1f1c]/25 to-transparent" />

        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploadingImage}
          className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-[#fffdfb]/90 px-3 py-1.5 text-xs font-medium text-[#2a1f1c] shadow-sm transition-opacity hover:bg-[#fffdfb] disabled:pointer-events-none disabled:opacity-60"
        >
          {uploadingImage ? (
            <Loader2 className="size-3.5 animate-spin" />
          ) : (
            <ImagePlus className="size-3.5" />
          )}
          {hero.imageUrl ? "Cambiar imagen" : "Subir imagen"}
        </button>

        <div className="absolute inset-x-0 bottom-0 px-[clamp(16px,2.65cqw,40px)] pb-[clamp(24px,4.2cqw,64px)]">
          {/*
            El hero real envuelve la etiqueta/título a un ancho fijo
            (`max-w-md`, 448px absolutos) sin importar el viewport — en un
            recuadro angosto como este, ese mismo ancho fijo es una
            fracción mucho más grande del recuadro que en un navegador de
            escritorio real, así que el texto envolvía distinto (una sola
            línea acá, dos en el sitio real). `29.63cqw` es la misma
            proporción (448/1512) que el resto de los tamaños de esta
            previsualización, para que el punto de quiebre de línea caiga
            en el mismo lugar relativo.
          */}
          <div className="max-w-[clamp(160px,29.63cqw,448px)]">
            {showTitle && (
              <input
                value={title}
                onChange={(e) => form.setValue("title", e.target.value, { shouldDirty: true })}
                placeholder="NUEVA COLECCIÓN"
                maxLength={160}
                className="w-full bg-transparent text-[clamp(9px,0.79cqw,13px)] font-medium uppercase tracking-[0.3em] text-[#f8f3ec]/80 outline-none placeholder:text-white/40"
              />
            )}
            {showContent && (
              <textarea
                value={content}
                onChange={handleContentChange}
                placeholder="Vestir con la textura de lo memorable."
                rows={3}
                className="mt-[clamp(6px,0.79cqw,12px)] w-full resize-none overflow-hidden bg-transparent text-[clamp(22px,3.97cqw,68px)] font-black leading-[1.05] tracking-tight text-[#f8f3ec] outline-none placeholder:text-white/30"
              />
            )}
          </div>
          {showButton && (
            <div className="mt-[clamp(12px,1.85cqw,28px)]">
              <input
                value={buttonLabel}
                onChange={(e) =>
                  form.setValue("buttonLabel", e.target.value, { shouldDirty: true })
                }
                placeholder="VER COLECCIÓN"
                maxLength={60}
                className="inline-block border border-[#fffdfb]/80 bg-transparent px-[clamp(10px,1.59cqw,24px)] py-[clamp(5px,0.79cqw,12px)] text-[clamp(9px,0.79cqw,13px)] font-medium uppercase tracking-[0.18em] text-[#fffdfb] outline-none placeholder:text-white/50"
              />
            </div>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) {
            setPendingCropFile(file);
            setCropSession((n) => n + 1);
          }
          e.target.value = "";
        }}
      />

      <HeroImageCropper
        key={cropSession}
        file={pendingCropFile}
        onCancel={() => setPendingCropFile(null)}
        onConfirm={uploadCroppedImage}
      />

      <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center gap-4">
          <Label className="text-sm font-normal">
            <Checkbox
              checked={showTitle}
              onCheckedChange={(v) => form.setValue("showTitle", !!v, { shouldDirty: true })}
            />
            Mostrar etiqueta
          </Label>
          <Label className="text-sm font-normal">
            <Checkbox
              checked={showContent}
              onCheckedChange={(v) => form.setValue("showContent", !!v, { shouldDirty: true })}
            />
            Mostrar título
          </Label>
          <Label className="text-sm font-normal">
            <Checkbox
              checked={showButton}
              onCheckedChange={(v) => form.setValue("showButton", !!v, { shouldDirty: true })}
            />
            Mostrar botón
          </Label>
        </div>
        {(form.formState.errors.title ||
          form.formState.errors.content ||
          form.formState.errors.buttonLabel) && (
          <p className="text-xs text-destructive">
            {form.formState.errors.title?.message ??
              form.formState.errors.content?.message ??
              form.formState.errors.buttonLabel?.message}
          </p>
        )}

        {showButton && (
          <div className="flex flex-col gap-1.5">
            <Label className="text-sm">A dónde va el botón</Label>
            <Input
              value={buttonPath}
              onChange={(e) =>
                form.setValue("buttonPath", e.target.value, { shouldDirty: true })
              }
              placeholder="/tienda"
            />
            {form.formState.errors.buttonPath && (
              <p className="text-xs text-destructive">
                {form.formState.errors.buttonPath.message}
              </p>
            )}
            <div className="flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => form.setValue("buttonPath", "/tienda", { shouldDirty: true })}
                className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
              >
                Toda la tienda
              </button>
              {categorySuggestions.map((s) => (
                <button
                  key={s.path}
                  type="button"
                  onClick={() => form.setValue("buttonPath", s.path, { shouldDirty: true })}
                  className="rounded-full border border-border px-2.5 py-1 text-xs text-muted-foreground hover:border-ring hover:text-foreground"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border pt-4">
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={togglingActive || (!hero.active && !hero.imageUrl)}
              title={!hero.active && !hero.imageUrl ? "Necesita una imagen para activarse" : undefined}
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
              Eliminar portada
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5">
              <Label htmlFor="sortOrder" className="text-xs text-muted-foreground">
                Orden
              </Label>
              <Input
                id="sortOrder"
                type="number"
                className="w-16"
                value={sortOrder}
                onChange={(e) =>
                  form.setValue("sortOrder", e.target.valueAsNumber || 0, {
                    shouldDirty: true,
                  })
                }
              />
            </div>
            <Button
              type="button"
              variant="outline"
              disabled={!form.formState.isDirty}
              onClick={() => form.reset(valuesFromHero(hero))}
            >
              Descartar
            </Button>
            <Button type="submit" disabled={!form.formState.isDirty || form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Guardando..." : "Guardar cambios"}
            </Button>
          </div>
        </div>
      </form>
    </div>
  );
}
