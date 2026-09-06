"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2, PackageSearch, Pencil, Warehouse } from "lucide-react";
import { enviatodoService } from "@/services/enviatodo-service";
import { ApiError } from "@/lib/api-client";
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
import type { ApiEnviatodoPackage, ApiShippingOrigin, MxState } from "@/types/shipping";

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

export default function ShippingAutomationPage() {
  const router = useRouter();
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

  const form = useForm<OriginFormValues>({
    resolver: zodResolver(originSchema),
    defaultValues: emptyValues,
    mode: "onBlur",
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
