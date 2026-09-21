"use client";

import { useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CalendarRange, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  customRange,
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
 * semana / un rango de fechas a elegir) — pedido explícito de la clienta
 * para saber qué elaborar sin tener que abrir cada orden a mano. Excluye
 * CANCELLED/REFUNDED/PARTIALLY_REFUNDED (ver `export-production-report.ts`).
 */
export function ExportProductionDialog({
  open,
  onOpenChange,
  orders,
}: ExportProductionDialogProps) {
  const [exporting, setExporting] = useState(false);
  // Strings tal cual las da un <input type="date"> ("YYYY-MM-DD") — se
  // parsean solo al exportar, no en cada tecleo.
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

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

  // `<input type="date">` da la fecha en hora local ya sin componente de
  // hora ("YYYY-MM-DD") — `new Date("YYYY-MM-DD")` la interpreta como UTC
  // medianoche, lo que puede correr un día para atrás en zonas horarias
  // negativas (México). Partir a mano los componentes y construirla con el
  // constructor `Date(y, m, d)` (siempre hora local) evita ese corrimiento.
  function parseLocalDate(value: string): Date | null {
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
    if (!match) return null;
    const [, year, month, day] = match;
    return new Date(Number(year), Number(month) - 1, Number(day));
  }

  const parsedFrom = parseLocalDate(fromDate);
  const parsedTo = parseLocalDate(toDate);
  const customRangeValid = !!parsedFrom && !!parsedTo && parsedFrom <= parsedTo;

  function handleExportCustomRange() {
    if (!parsedFrom || !parsedTo) return;
    handleExport(customRange(parsedFrom, parsedTo));
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

        <div className="flex flex-col gap-2 border-t border-border pt-4">
          <Label className="text-sm font-medium">Rango personalizado</Label>
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <Label htmlFor="export-from-date" className="text-xs font-normal text-muted-foreground">
                Desde
              </Label>
              <Input
                id="export-from-date"
                type="date"
                value={fromDate}
                max={toDate || undefined}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="export-to-date" className="text-xs font-normal text-muted-foreground">
                Hasta
              </Label>
              <Input
                id="export-to-date"
                type="date"
                value={toDate}
                min={fromDate || undefined}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="justify-start gap-2"
            disabled={exporting || !customRangeValid}
            onClick={handleExportCustomRange}
          >
            <CalendarRange className="size-4" />
            Exportar rango
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
