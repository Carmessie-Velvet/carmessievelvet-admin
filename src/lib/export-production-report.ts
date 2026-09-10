import ExcelJS from "exceljs";
import {
  ORDER_STATUS_LABEL,
  type ApiOrder,
  type OrderItem,
  type OrderStatus,
} from "@/types/orders";

/** Órdenes que ya no requieren producirse — se cancelaron o se devolvió el dinero. */
const EXCLUDED_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED", "PARTIALLY_REFUNDED"];

interface ProductionLine {
  product: string;
  sku: string;
  size: string;
  quantity: number;
}

/**
 * Una línea de un producto tipo set (`item.selections` no vacío) no tiene
 * una sola talla — se expande a una línea de producción **por prenda**
 * (ej. "Set Encaje Rojo — Top" talla M, "Set Encaje Rojo — Panty" talla S),
 * cada una con la misma `quantity` que la línea original (comprar
 * `quantity: 2` de un set son 2 sets completos, cada uno con las mismas
 * prendas). Una línea simple sigue siendo una sola línea de producción.
 */
function linesForItem(item: OrderItem): ProductionLine[] {
  if (item.selections && item.selections.length > 0) {
    return item.selections.map((selection) => ({
      product: `${item.productName} — ${selection.componentName}`,
      sku: item.productSku ?? "—",
      size: selection.size,
      quantity: item.quantity,
    }));
  }
  return [
    {
      product: item.productName,
      sku: item.productSku ?? "—",
      size: item.size ?? "—",
      quantity: item.quantity,
    },
  ];
}

export interface ProductionReportRange {
  from: Date;
  to: Date;
  label: string;
}

function startOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(0, 0, 0, 0);
  return copy;
}

function endOfDay(d: Date): Date {
  const copy = new Date(d);
  copy.setHours(23, 59, 59, 999);
  return copy;
}

export function todayRange(): ProductionReportRange {
  const now = new Date();
  return { from: startOfDay(now), to: endOfDay(now), label: "Hoy" };
}

/** Lunes a domingo de la semana actual. */
export function thisWeekRange(): ProductionReportRange {
  const now = new Date();
  const day = now.getDay(); // 0 = domingo
  const diffToMonday = day === 0 ? -6 : 1 - day;
  const monday = new Date(now);
  monday.setDate(now.getDate() + diffToMonday);
  const sunday = new Date(monday);
  sunday.setDate(monday.getDate() + 6);
  return { from: startOfDay(monday), to: endOfDay(sunday), label: "Esta semana" };
}

/**
 * Genera y descarga un Excel con dos hojas: un resumen de producción
 * (agrupado por producto + talla, para saber qué cortar/coser) y el
 * detalle de cada orden en el rango (para rastrear un pedido puntual).
 * Corre 100% en el navegador sobre las órdenes ya cargadas en `/ordenes`
 * — no pega a la API de nuevo. Devuelve cuántas órdenes entraron en el
 * rango, para que el llamador pueda avisar si el archivo salió vacío.
 */
export async function exportProductionReport(
  orders: ApiOrder[],
  range: ProductionReportRange
): Promise<number> {
  const inRange = orders.filter((order) => {
    const createdAt = new Date(order.createdAt);
    return (
      createdAt >= range.from &&
      createdAt <= range.to &&
      !EXCLUDED_STATUSES.includes(order.status)
    );
  });

  const workbook = new ExcelJS.Workbook();

  const summaryByKey = new Map<string, ProductionLine>();
  for (const order of inRange) {
    for (const item of order.items) {
      for (const line of linesForItem(item)) {
        const key = `${line.product}__${line.size}`;
        const existing = summaryByKey.get(key);
        if (existing) {
          existing.quantity += line.quantity;
        } else {
          summaryByKey.set(key, { ...line });
        }
      }
    }
  }

  const summarySheet = workbook.addWorksheet("Resumen de producción");
  summarySheet.columns = [
    { header: "Producto", key: "product", width: 34 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Talla", key: "size", width: 10 },
    { header: "Cantidad", key: "quantity", width: 12 },
  ];
  summarySheet.getRow(1).font = { bold: true };
  [...summaryByKey.values()]
    .sort((a, b) => b.quantity - a.quantity)
    .forEach((row) => summarySheet.addRow(row));

  const detailSheet = workbook.addWorksheet("Detalle de órdenes");
  detailSheet.columns = [
    { header: "Orden", key: "orderNumber", width: 14 },
    { header: "Cliente", key: "customer", width: 28 },
    { header: "Estado", key: "status", width: 16 },
    { header: "Producto", key: "product", width: 34 },
    { header: "SKU", key: "sku", width: 16 },
    { header: "Talla", key: "size", width: 10 },
    { header: "Cantidad", key: "quantity", width: 12 },
    { header: "Fecha", key: "date", width: 14 },
  ];
  detailSheet.getRow(1).font = { bold: true };
  for (const order of inRange) {
    for (const item of order.items) {
      for (const line of linesForItem(item)) {
        detailSheet.addRow({
          orderNumber: order.orderNumber,
          customer: order.shippingAddress.fullName,
          status: ORDER_STATUS_LABEL[order.status],
          product: line.product,
          sku: line.sku,
          size: line.size,
          quantity: line.quantity,
          date: new Date(order.createdAt).toLocaleDateString("es-MX"),
        });
      }
    }
  }

  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  const dateStamp = new Date().toISOString().slice(0, 10);
  const slug = range.label.toLowerCase().replace(/\s+/g, "-");
  link.download = `produccion-${slug}-${dateStamp}.xlsx`;
  link.click();
  URL.revokeObjectURL(url);

  return inRange.length;
}
