"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Check, Loader2, PlusCircle, Truck, Trash2, X } from "lucide-react";
import { shippingMethodService } from "@/services/shipping-method-service";
import { ApiError } from "@/lib/api-client";
import { formatCurrency } from "@/lib/format-currency";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import type { ApiShippingMethod } from "@/types/shipping";

const CODE_PATTERN = /^[A-Z0-9_-]{2,50}$/;

function pesosToMinor(pesos: string): number | null {
  const value = Number(pesos);
  if (Number.isNaN(value) || value < 0) return null;
  return Math.round(value * 100);
}

export default function ShippingMethodsPage() {
  const router = useRouter();
  const [methods, setMethods] = useState<ApiShippingMethod[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [newCode, setNewCode] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [creating, setCreating] = useState(false);

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    shippingMethodService
      .getShippingMethods()
      .then((data) => {
        if (!cancelled) setMethods(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError("No se pudieron cargar los métodos de envío.");
      });

    return () => {
      cancelled = true;
    };
  }, [router]);

  async function handleCreate() {
    const code = newCode.trim().toUpperCase();
    const priceMinor = pesosToMinor(newPrice);

    if (!CODE_PATTERN.test(code)) {
      toast.error("El código debe tener 2-50 letras, números, guiones o guiones bajos.");
      return;
    }
    if (priceMinor === null) {
      toast.error("Ingresa un costo válido.");
      return;
    }

    setCreating(true);
    try {
      const created = await shippingMethodService.createShippingMethod({
        code,
        priceMinor,
        description: newDescription.trim() || undefined,
      });
      setMethods((prev) => (prev ? [...prev, created] : [created]));
      setNewCode("");
      setNewPrice("");
      setNewDescription("");
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo crear el método de envío."
      );
    } finally {
      setCreating(false);
    }
  }

  function startEdit(method: ApiShippingMethod) {
    setEditingId(method.id);
    setEditPrice((method.priceMinor / 100).toString());
  }

  async function saveEdit(id: string) {
    const priceMinor = pesosToMinor(editPrice);
    if (priceMinor === null) {
      toast.error("Ingresa un costo válido.");
      return;
    }

    setBusyId(id);
    try {
      const updated = await shippingMethodService.updateShippingMethodPrice(id, priceMinor);
      setMethods((prev) => prev?.map((m) => (m.id === id ? updated : m)) ?? prev);
      setEditingId(null);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo actualizar el costo."
      );
    } finally {
      setBusyId(null);
    }
  }

  async function handleDelete(method: ApiShippingMethod) {
    if (!window.confirm(`¿Eliminar el método de envío "${method.code}"?`)) return;

    setBusyId(method.id);
    try {
      await shippingMethodService.deleteShippingMethod(method.id);
      setMethods((prev) => prev?.filter((m) => m.id !== method.id) ?? prev);
    } catch (err) {
      toast.error(
        err instanceof ApiError ? err.message : "No se pudo eliminar el método de envío."
      );
      setBusyId(null);
    }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Métodos de envío</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Catálogo de opciones de envío disponibles en el checkout de la tienda.
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
              <Truck className="size-4" />
            </span>
            <div>
              <CardTitle>Nuevo método de envío</CardTitle>
              <CardDescription>
                El código es permanente una vez creado — si queda mal, crea uno
                nuevo en vez de intentar corregir este.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <form
            className="flex flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              handleCreate();
            }}
          >
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Input
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Código (ej. EXPRESS)"
              />
              <Input
                type="number"
                min={0}
                step="0.01"
                inputMode="decimal"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                placeholder="Costo (MXN)"
              />
            </div>
            <Input
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value)}
              placeholder="Descripción (opcional, ej. Estafeta, 2-5 días hábiles)"
            />
            <Button
              type="submit"
              disabled={creating || !newCode.trim() || !newPrice.trim()}
              className="gap-1.5 self-start"
            >
              <PlusCircle className="size-4" />
              Agregar
            </Button>
          </form>
        </CardContent>
      </Card>

      {!methods && !error && (
        <div className="flex items-center justify-center py-12 text-muted-foreground">
          <Loader2 className="size-5 animate-spin" />
        </div>
      )}

      {methods && methods.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-10 text-center text-sm text-muted-foreground">
          Todavía no hay métodos de envío.
        </div>
      )}

      {methods && methods.length > 0 && (
        <div className="flex flex-col gap-2">
          {methods.map((method) => (
            <div
              key={method.id}
              className="flex items-center gap-3 rounded-lg border border-border px-3 py-2"
            >
              <div className="flex-1">
                <p className="text-sm font-medium">{method.code}</p>
                {method.description && (
                  <p className="text-xs text-muted-foreground">{method.description}</p>
                )}
              </div>

              {editingId === method.id ? (
                <>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    inputMode="decimal"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    autoFocus
                    className="h-7 w-28"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === method.id}
                    onClick={() => saveEdit(method.id)}
                    aria-label="Guardar"
                  >
                    <Check className="size-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === method.id}
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
                    onClick={() => startEdit(method)}
                    className="text-sm hover:underline"
                  >
                    {formatCurrency(method.priceMinor / 100)}
                  </button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    disabled={busyId === method.id}
                    onClick={() => handleDelete(method)}
                    aria-label={`Eliminar ${method.code}`}
                  >
                    {busyId === method.id ? (
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
