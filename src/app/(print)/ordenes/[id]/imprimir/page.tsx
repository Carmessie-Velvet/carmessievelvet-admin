"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Loader2, Printer } from "lucide-react";
import { ApiError } from "@/lib/api-client";
import { orderService } from "@/services/order-service";
import type { ApiOrder } from "@/types/orders";
import { Button } from "@/components/ui/button";

const THANK_YOU_TITLE = "Gracias por elegir Carmessie";
const THANK_YOU_LINES = [
  "Diseñamos y producimos cada prenda pensando en que te sientas más bonita y especial cada vez que te la pongas.",
  "No es solo moda. Es feminidad, es confianza, es arte.",
  "Bienvenida a nuestro mundo.",
];

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

/**
 * Resumen de pedido para meter dentro del paquete. Nunca lleva precios ni
 * notas internas (`adminNotes`) — lo ve la compradora — solo lo que ayuda a
 * verificar el empaque: a quién va, qué lleva y en qué talla/color.
 */
export default function OrderPrintPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const [order, setOrder] = useState<ApiOrder | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [logoLoaded, setLogoLoaded] = useState(false);
  const printed = useRef(false);

  useEffect(() => {
    let cancelled = false;
    orderService
      .getOrder(params.id)
      .then((data) => {
        if (!cancelled) setOrder(data);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        if (err instanceof ApiError && err.status === 401) {
          router.replace("/login");
          return;
        }
        setError(err instanceof ApiError ? err.message : "No se pudo cargar la orden.");
      });
    return () => {
      cancelled = true;
    };
  }, [params.id, router]);

  // Abre el diálogo de impresión solo una vez, cuando ya hay datos y el logo
  // cargó (si no, saldría un hueco donde va la marca).
  useEffect(() => {
    if (order && logoLoaded && !printed.current) {
      printed.current = true;
      window.print();
    }
  }, [order, logoLoaded]);

  if (error) {
    return <p className="p-8 text-sm text-destructive">{error}</p>;
  }

  if (!order) {
    return (
      <div className="flex min-h-svh items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const address = order.shippingAddress;
  const streetLine = [address.street, address.extNumber, address.intNumber && `Int. ${address.intNumber}`]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="min-h-svh bg-muted/40 py-6 print:bg-white print:py-0">
      <style>{`@page { size: letter; margin: 14mm; }`}</style>

      <div className="mx-auto mb-4 flex max-w-[8.5in] items-center justify-end gap-2 px-4 print:hidden">
        <Button type="button" variant="outline" onClick={() => window.close()}>
          Cerrar
        </Button>
        <Button type="button" onClick={() => window.print()}>
          <Printer className="size-4" />
          Imprimir
        </Button>
      </div>

      <main className="mx-auto max-w-[8.5in] bg-white px-10 py-10 text-[13px] leading-relaxed text-neutral-900 shadow-sm print:max-w-none print:p-0 print:shadow-none">
        <header className="flex items-start justify-between gap-6 border-b border-neutral-300 pb-5">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/carmessie-mark-ink.png"
            alt="Carmessie Velvet"
            className="h-10 w-auto"
            onLoad={() => setLogoLoaded(true)}
            onError={() => setLogoLoaded(true)}
          />
          <div className="text-right">
            <p className="text-xs font-medium tracking-[0.18em] text-neutral-500 uppercase">
              Resumen de pedido
            </p>
            <p className="mt-1 text-xl font-bold">{order.orderNumber}</p>
            <p className="text-xs text-neutral-500">{formatDate(order.createdAt)}</p>
          </div>
        </header>

        <section className="mt-6 grid grid-cols-2 gap-8">
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              Enviar a
            </p>
            <p className="mt-1.5 font-semibold">{address.fullName}</p>
            <p>{streetLine}</p>
            <p>{address.suburb}</p>
            <p>
              {address.city}
              {address.state ? `, ${address.state}` : ""} · C.P. {address.postalCode}
            </p>
            {address.reference && (
              <p className="mt-1 text-neutral-600">Referencia: {address.reference}</p>
            )}
            <p className="mt-1">Tel. {address.phone}</p>
          </div>
          <div>
            <p className="text-[11px] font-medium tracking-[0.16em] text-neutral-500 uppercase">
              Envío
            </p>
            <p className="mt-1.5">{order.shippingMethodDescription ?? order.shippingMethod}</p>
            {order.carrier && <p className="text-neutral-600">Paquetería: {order.carrier}</p>}
          </div>
        </section>

        <section className="mt-7">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-neutral-400 text-left text-[11px] tracking-[0.14em] text-neutral-500 uppercase">
                <th className="py-2 font-medium">Artículo</th>
                <th className="py-2 font-medium">Talla / color</th>
                <th className="py-2 text-right font-medium">Cant.</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-b border-neutral-200 align-top break-inside-avoid">
                  <td className="py-2.5 pr-4">
                    <p className="font-medium">{item.productName}</p>
                    {item.productSku && (
                      <p className="text-[11px] text-neutral-500">{item.productSku}</p>
                    )}
                  </td>
                  <td className="py-2.5 pr-4">
                    {item.selections && item.selections.length > 0 ? (
                      <ul className="flex flex-col gap-0.5">
                        {item.selections.map((selection) => (
                          <li key={selection.id}>
                            {selection.componentName}: {selection.size}
                            {selection.color ? ` · ${selection.color}` : ""}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <>
                        {item.size ?? "—"}
                        {item.color ? ` · ${item.color}` : ""}
                      </>
                    )}
                  </td>
                  <td className="py-2.5 text-right">{item.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <footer className="mt-12 border-t border-neutral-300 pt-6 text-center break-inside-avoid">
          <p className="text-base font-bold">{THANK_YOU_TITLE}</p>
          <div className="mx-auto mt-2 max-w-md text-neutral-600">
            {THANK_YOU_LINES.map((line) => (
              <p key={line} className="mt-1">
                {line}
              </p>
            ))}
          </div>
        </footer>
      </main>
    </div>
  );
}
