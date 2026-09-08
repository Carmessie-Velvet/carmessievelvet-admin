"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  exportProductionReport,
  todayRange,
  thisWeekRange,
  type ProductionReportRange,
} from "@/lib/export-production-report";
import type { ApiOrder } from "@/types/orders";

interface ExportProductionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Todas las órdenes ya cargadas en `/ordenes` — el filtro de rango corre acá mismo, sin volver a pegarle a la API. */
  orders: ApiOrder[];
}

/**
 * Diálogo para descargar el reporte de producción en Excel (hoy / esta
 * semana) — pedido explícito de la clienta para saber qué elaborar sin
 * tener que abrir cada orden a mano. Excluye CANCELLED/REFUNDED/
 * PARTIALLY_REFUNDED (ver `export-production-report.ts`), nunca inventa
 * un rango — solo los dos presets pedidos.
 */
export function ExportProductionDialog({
  open,
  onOpenChange,
  orders,
}: ExportProductionDialogProps) {
  const [exporting, setExporting] = useState(false);

  async function handleExport(range: ProductionReportRange) {
    setExporting(true);
    try {
      const count = await exportProductionReport(orders, range);
      if (count === 0) {
        toast.warning(`No hay órdenes por producir (${range.label.toLowerCase()}) — el archivo salió vacío.`);
      } else {
        toast.success(
          `Excel generado: ${count} orden${count === 1 ? "" : "es"} (${range.label.toLowerCase()}).`
        );
      }
      onOpenChange(false);
    } catch {
      toast.error("No se pudo generar el archivo.");
    } finally {
      setExporting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !exporting && onOpenChange(next)}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Exportar producción</DialogTitle>
          <DialogDescription>
            Descarga un Excel con lo que hay que elaborar: un resumen por producto y talla, más
            el detalle de cada orden. No incluye órdenes canceladas o reembolsadas.
          </DialogDescription>
        </DialogHeader>

        <div className="flex flex-col gap-2">
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            disabled={exporting}
            onClick={() => handleExport(todayRange())}
          >
            <CalendarDays className="size-4" />
            Órdenes de hoy
          </Button>
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            disabled={exporting}
            onClick={() => handleExport(thisWeekRange())}
          >
            <CalendarDays className="size-4" />
            Órdenes de esta semana (lunes a domingo)
          </Button>
        </div>

        <DialogFooter>
          {exporting && (
            <span className="mr-auto inline-flex items-center gap-1.5 text-xs text-muted-foreground">
              <Loader2 className="size-3.5 animate-spin" />
              Generando...
            </span>
          )}
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={exporting}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
