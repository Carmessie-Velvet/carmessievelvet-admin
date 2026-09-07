"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PackageSearch, Pencil, PlusCircle, Trash2, Warehouse } from "lucide-react";
import { enviatodoService } from "@/services/enviatodo-service";
import { ApiError } from "@/lib/api-client";
import { useConfirmDialog } from "@/components/ui/confirm-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SectionIcon } from "@/components/ui/section-icon";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type {
  ApiEnviatodoPackage,
  ApiShippingOrigin,
  CreateApiEnviatodoPackagePayload,
  MxState,
} from "@/types/shipping";

const originSchema = z.object({
  name: z.string().min(1, "Requerido"),
  company: z.string(),
  phone: z.string().min(1, "Requerido"),
  email: z.string().email("Email inválido"),
  street: z.string().min(1, "Requerido"),
  extNumber: z.string().min(1, "Requerido"),
  intNumber: z.string(),
  suburb: z.string().min(1, "Requerido"),
  municipality: z.string().min(1, "Requerido"),
  town: z.string().min(1, "Requerido"),
  stateCode: z.string().min(1, "Selecciona un estado"),
  postalCode: z.string().min(1, "Requerido"),
  reference: z.string(),
});

type OriginFormValues = z.infer<typeof originSchema>;

const emptyValues: OriginFormValues = {
  name: "",
  company: "",
  phone: "",
  email: "",
  street: "",
  extNumber: "",
  intNumber: "",
  suburb: "",
  municipality: "",
  town: "",
  stateCode: "",
  postalCode: "",
  reference: "",
};

function toFormValues(origin: ApiShippingOrigin): OriginFormValues {
  return {
    name: origin.name,
    company: origin.company ?? "",
    phone: origin.phone,
    email: origin.email,
    street: origin.street,
    extNumber: origin.extNumber,
    intNumber: origin.intNumber ?? "",
    suburb: origin.suburb,
    municipality: origin.municipality,
    town: origin.town,
    stateCode: origin.stateCode,
    postalCode: origin.postalCode,
    reference: origin.reference ?? "",
  };
}

function toPayload(values: OriginFormValues): ApiShippingOrigin {
  return {
    name: values.name,
    company: values.company || undefined,
    phone: values.phone,
    email: values.email,
    street: values.street,
    extNumber: values.extNumber,
    intNumber: values.intNumber || undefined,
    suburb: values.suburb,
    municipality: values.municipality,
    town: values.town,
    stateCode: values.stateCode,
    postalCode: values.postalCode,
    reference: values.reference || undefined,
  };
}

/**
 * `POST /shipping/packages` no tiene un `PATCH` equivalente (Enviatodo no lo
 * expone de forma confiable) — "editar" un paquete en este form crea uno
 * nuevo con estos valores y borra el anterior, ver `onSubmitPackage`.
 */
const packageFormSchema = z.object({
  name: z.string().min(1, "Requerido").max(100, "Máximo 100 caracteres"),
  packageContent: z.string().min(1, "Requerido").max(200, "Máximo 200 caracteres"),
  height: z.number().positive("Debe ser mayor a 0"),
  width: z.number().positive("Debe ser mayor a 0"),
  length: z.number().positive("Debe ser mayor a 0"),
  weight: z.number().positive("Debe ser mayor a 0"),
  amountPkg: z.number().min(0).optional(),
});

type PackageFormValues = z.infer<typeof packageFormSchema>;

const emptyPackageValues: PackageFormValues = {
  name: "",
  packageContent: "",
  height: 0,
  width: 0,
  length: 0,
  weight: 0,
  amountPkg: undefined,
};

/** Los campos numéricos del paquete llegan como string del backend (passthrough de Enviatodo). */
function packageToFormValues(pkg: ApiEnviatodoPackage): PackageFormValues {
  return {
    name: pkg.name ?? "",
    packageContent: pkg.package_content ?? "",
    height: Number(pkg.height ?? 0),
    width: Number(pkg.width ?? 0),
    length: Number(pkg.length ?? 0),
    weight: Number(pkg.weight ?? 0),
    amountPkg: pkg.amount_pkg ? Number(pkg.amount_pkg) : undefined,
  };
}

function numberFieldProps(value: number, onChange: (n: number) => void) {
  return {
    type: "number" as const,
    min: 0,
    step: "0.01",
    inputMode: "decimal" as const,
    value: value || "",
    onChange: (e: React.ChangeEvent<HTMLInputElement>) =>
      onChange(Number.isNaN(e.target.valueAsNumber) ? 0 : e.target.valueAsNumber),
  };
}

export default function ShippingAutomationPage() {
  const router = useRouter();
  const { confirm } = useConfirmDialog();
  const [states, setStates] = useState<MxState[]>([]);
  const [packages, setPackages] = useState<ApiEnviatodoPackage[] | null>(null);
  const [packagesError, setPackagesError] = useState<string | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [origin, setOrigin] = useState<ApiShippingOrigin | null>(null);
  // Si ya hay una dirección guardada, arranca en modo vista (no en el
  // formulario completo) — mostrar todos los campos vacíos-para-llenar
  // encima de una dirección que sí existe daba la impresión de que no
  // había nada guardado.
  const [mode, setMode] = useState<"view" | "edit">("edit");

  const [packageDialogOpen, setPackageDialogOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<ApiEnviatodoPackage | null>(null);
  const [packageBusyId, setPackageBusyId] = useState<string | null>(null);

  const form = useForm<OriginFormValues>({
    resolver: zodResolver(originSchema),
    defaultValues: emptyValues,
    mode: "onBlur",
  });

  const packageForm = useForm<PackageFormValues>({
    resolver: zodResolver(packageFormSchema),
    defaultValues: emptyPackageValues,
  });

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      enviatodoService.getMxStates(),
      enviatodoService.getShippingOrigin(),
    ])
      .then(([mxStates, fetchedOrigin]) => {
        if (cancelled) return;
        setStates(mxStates);
        setOrigin(fetchedOrigin);
        if (fetchedOrigin) {
          form.reset(toFormValues(fetchedOrigin));
          setMode("view");
        }
        setLoaded(true);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setLoadError(
          err instanceof ApiError ? err.message : "No se pudo cargar la configuración."
        );
      });

    enviatodoService
      .getPackages()
      .then((data) => {
        if (!cancelled) setPackages(data);
      })
      .catch(() => {
        if (!cancelled) setPackagesError("No se pudieron cargar los paquetes de Enviatodo.");
      });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function onSubmit(values: OriginFormValues) {
    try {
      const updated = await enviatodoService.updateShippingOrigin(toPayload(values));
      form.reset(toFormValues(updated));
      setOrigin(updated);
      setMode("view");
      toast.success("Dirección de origen guardada.");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo guardar la dirección de origen."
      );
    }
  }

  function cancelEdit() {
    if (origin) form.reset(toFormValues(origin));
    setMode("view");
  }

  function openCreatePackage() {
    setEditingPackage(null);
    packageForm.reset(emptyPackageValues);
    setPackageDialogOpen(true);
  }

  function openEditPackage(pkg: ApiEnviatodoPackage) {
    setEditingPackage(pkg);
    packageForm.reset(packageToFormValues(pkg));
    setPackageDialogOpen(true);
  }

  async function onSubmitPackage(values: PackageFormValues) {
    const payload: CreateApiEnviatodoPackagePayload = {
      name: values.name,
      packageContent: values.packageContent,
      height: values.height,
      width: values.width,
      length: values.length,
      weight: values.weight,
      amountPkg: values.amountPkg,
    };

    try {
      // La respuesta del propio POST es el registro completo y confiable
      // (ver CLAUDE.md de la API) — a diferencia de GET /shipping/packages,
      // que puede tardar en reflejar un paquete recién creado ("sandbox
      // quirk" documentado por backend). Por eso el estado local se
      // actualiza con esta respuesta directamente, nunca recargando la
      // lista después de escribir.
      const created = await enviatodoService.createPackage(payload);
      const previousId = editingPackage?.id;

      if (previousId) {
        try {
          await enviatodoService.deletePackage(previousId);
        } catch {
          // "Editar" es crear + borrar (Enviatodo no tiene PATCH). Si el
          // borrado falla (ej. era el paquete default, que rechaza DELETE),
          // el nuevo ya quedó guardado — avisamos en vez de fingir que todo
          // salió perfecto, y dejamos el anterior en la lista tal cual.
          toast.error(
            "Se creó el paquete nuevo, pero no se pudo borrar el anterior (puede ser el paquete default) — bórralo a mano si ya no lo necesitas."
          );
          setPackages((prev) => [...(prev ?? []), created]);
          setPackageDialogOpen(false);
          return;
        }
      }

      setPackages((prev) => {
        const withoutOld = previousId ? (prev ?? []).filter((p) => p.id !== previousId) : (prev ?? []);
        return [...withoutOld, created];
      });
      setPackageDialogOpen(false);
      toast.success(editingPackage ? "Paquete actualizado." : "Paquete creado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo guardar el paquete.");
    }
  }

  async function handleDeletePackage(pkg: ApiEnviatodoPackage) {
    if (!pkg.id) return;
    const ok = await confirm({
      title: `¿Eliminar el paquete "${pkg.name ?? pkg.id}"?`,
      confirmLabel: "Eliminar",
      destructive: true,
    });
    if (!ok) return;

    setPackageBusyId(pkg.id);
    try {
      await enviatodoService.deletePackage(pkg.id);
      setPackages((prev) => (prev ?? []).filter((p) => p.id !== pkg.id));
      toast.success("Paquete eliminado.");
    } catch (err) {
      toast.error(err instanceof ApiError ? err.message : "No se pudo eliminar el paquete.");
    } finally {
      setPackageBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Envíos automatizados</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Configuración para generar guías de Estafeta vía Enviatodo — la dirección de
          origen es un requisito único antes de poder generar la primera guía desde una orden.
        </p>
      </div>

      {loadError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {loadError}
        </div>
      )}

      {!loaded && !loadError && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {loaded && mode === "view" && origin && (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <SectionIcon icon={Warehouse} index={0} />
              <div>
                <CardTitle>Dirección de origen</CardTitle>
                <CardDescription>
                  La bodega/remitente que usa Enviatodo para cotizar y generar la guía.
                </CardDescription>
              </div>
            </div>
            <CardAction>
              <Button type="button" variant="outline" className="gap-1.5" onClick={() => setMode("edit")}>
                <Pencil className="size-4" />
                Editar
              </Button>
            </CardAction>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted-foreground">Nombre / razón social</p>
              <p className="font-medium">{origin.name}</p>
            </div>
            {origin.company && (
              <div>
                <p className="text-xs text-muted-foreground">Empresa</p>
                <p className="font-medium">{origin.company}</p>
              </div>
            )}
            <div>
              <p className="text-xs text-muted-foreground">Teléfono</p>
              <p className="font-medium">{origin.phone}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Email</p>
              <p className="font-medium">{origin.email}</p>
            </div>
            <div className="sm:col-span-2">
              <p className="text-xs text-muted-foreground">Dirección</p>
              <p className="font-medium">
                {origin.street} {origin.extNumber}
                {origin.intNumber ? `, Int. ${origin.intNumber}` : ""}, {origin.suburb}
              </p>
              <p className="text-muted-foreground">
                {origin.municipality}, {origin.town},{" "}
                {states.find((s) => s.code === origin.stateCode)?.name ?? origin.stateCode} — CP{" "}
                {origin.postalCode}
              </p>
            </div>
            {origin.reference && (
              <div className="sm:col-span-2">
                <p className="text-xs text-muted-foreground">Referencia</p>
                <p className="font-medium">{origin.reference}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {loaded && mode === "edit" && (
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col gap-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-3">
                  <SectionIcon icon={Warehouse} index={0} />
                  <div>
                    <CardTitle>Dirección de origen</CardTitle>
                    <CardDescription>
                      La bodega/remitente que usa Enviatodo para cotizar y generar la guía.
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-4">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre / razón social</FormLabel>
                        <FormControl>
                          <Input placeholder="Carmessie Bodega" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="company"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Empresa (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Carmessie SA de CV" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Teléfono</FormLabel>
                        <FormControl>
                          <Input placeholder="+52 55 1234 5678" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="envios@carmessie.com" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="street"
                    render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Calle</FormLabel>
                        <FormControl>
                          <Input placeholder="Av. Reforma" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="extNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número ext.</FormLabel>
                        <FormControl>
                          <Input placeholder="123" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="intNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Número int. (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Bodega 4" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="suburb"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Colonia</FormLabel>
                        <FormControl>
                          <Input placeholder="Roma Norte" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <FormField
                    control={form.control}
                    name="municipality"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Municipio/Alcaldía</FormLabel>
                        <FormControl>
                          <Input placeholder="Cuauhtémoc" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="town"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input placeholder="Ciudad de México" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="stateCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Estado</FormLabel>
                        <Select value={field.value || null} onValueChange={(v) => field.onChange(v ?? "")}>
                          <FormControl>
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Selecciona">
                                {(code: string) =>
                                  code ? states.find((s) => s.code === code)?.name ?? code : "Selecciona"
                                }
                              </SelectValue>
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            {states.map((state) => (
                              <SelectItem key={state.code} value={state.code}>
                                {state.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="postalCode"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Código postal</FormLabel>
                        <FormControl>
                          <Input placeholder="06700" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="reference"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Referencia (opcional)</FormLabel>
                        <FormControl>
                          <Input placeholder="Portón negro, junto a la farmacia" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              {origin && (
                <Button type="button" variant="outline" onClick={cancelEdit}>
                  Cancelar
                </Button>
              )}
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Guardando..." : "Guardar dirección de origen"}
              </Button>
            </div>
          </form>
        </Form>
      )}

      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <SectionIcon icon={PackageSearch} index={1} />
            <div>
              <CardTitle>Paquetes disponibles</CardTitle>
              <CardDescription>
                Catálogo de cajas guardado en Enviatodo — se elige uno al generar cada guía,
                desde el detalle de la orden.
              </CardDescription>
            </div>
          </div>
          <CardAction>
            <Button type="button" className="gap-1.5" onClick={openCreatePackage}>
              <PlusCircle className="size-4" />
              Nuevo paquete
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          {packagesError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
              {packagesError}
            </div>
          )}

          {!packages && !packagesError && (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          )}

          {packages && packages.length === 0 && (
            <p className="py-4 text-sm text-muted-foreground">
              Todavía no hay paquetes guardados en Enviatodo.
            </p>
          )}

          {packages && packages.length > 0 && (
            <div className="overflow-hidden rounded-lg border border-border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Dimensiones (L×A×A cm)</TableHead>
                    <TableHead>Peso</TableHead>
                    <TableHead></TableHead>
                    <TableHead className="w-20"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {packages.map((pkg) => (
                    <TableRow key={pkg.id}>
                      <TableCell className="font-medium">
                        {pkg.name ?? pkg.id}
                        <div className="text-xs font-normal text-muted-foreground">
                          {pkg.package_content}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pkg.length && pkg.width && pkg.height
                          ? `${pkg.length}×${pkg.width}×${pkg.height}`
                          : "—"}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {pkg.weight ? `${pkg.weight} kg` : "—"}
                      </TableCell>
                      <TableCell>
                        {pkg.isDefault && (
                          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                            Default
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Editar ${pkg.name ?? pkg.id}`}
                            onClick={() => openEditPackage(pkg)}
                          >
                            <Pencil className="size-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            aria-label={`Eliminar ${pkg.name ?? pkg.id}`}
                            disabled={pkg.isDefault || packageBusyId === pkg.id}
                            title={
                              pkg.isDefault
                                ? "No se puede borrar el paquete default (configurado en el backend)"
                                : undefined
                            }
                            onClick={() => handleDeletePackage(pkg)}
                          >
                            <Trash2 className="size-3.5 text-destructive" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={packageDialogOpen} onOpenChange={setPackageDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingPackage ? "Editar paquete" : "Nuevo paquete"}</DialogTitle>
            <DialogDescription>
              {editingPackage
                ? "Enviatodo no permite editar un paquete directamente — esto crea uno nuevo con estos datos y borra el anterior."
                : "Dimensiones físicas de la caja — el peso facturable lo calcula Enviatodo."}
            </DialogDescription>
          </DialogHeader>
          <Form {...packageForm}>
            <form onSubmit={packageForm.handleSubmit(onSubmitPackage)} className="flex flex-col gap-4">
              <FormField
                control={packageForm.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre</FormLabel>
                    <FormControl>
                      <Input placeholder="Caja chica" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={packageForm.control}
                name="packageContent"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contenido</FormLabel>
                    <FormControl>
                      <Input placeholder="PLAYERAS" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-3 gap-3">
                <FormField
                  control={packageForm.control}
                  name="length"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Largo (cm)</FormLabel>
                      <FormControl>
                        <Input {...numberFieldProps(field.value, field.onChange)} onBlur={field.onBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="width"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ancho (cm)</FormLabel>
                      <FormControl>
                        <Input {...numberFieldProps(field.value, field.onChange)} onBlur={field.onBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="height"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Alto (cm)</FormLabel>
                      <FormControl>
                        <Input {...numberFieldProps(field.value, field.onChange)} onBlur={field.onBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <FormField
                  control={packageForm.control}
                  name="weight"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Peso (kg)</FormLabel>
                      <FormControl>
                        <Input {...numberFieldProps(field.value, field.onChange)} onBlur={field.onBlur} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={packageForm.control}
                  name="amountPkg"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Cantidad declarada (opcional)</FormLabel>
                      <FormControl>
                        <Input
                          {...numberFieldProps(field.value ?? 0, field.onChange)}
                          onBlur={field.onBlur}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setPackageDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={packageForm.formState.isSubmitting}>
                  {packageForm.formState.isSubmitting
                    ? "Guardando..."
                    : editingPackage
                      ? "Guardar cambios"
                      : "Crear paquete"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
