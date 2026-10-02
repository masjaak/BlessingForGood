import type { InvoiceView } from "@/domain/prototype/operations-context";
import { formatBfgCalendarDate } from "@/lib/calendar-date";

function formatEtaMonth(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(`${value}-01T00:00:00.000Z`);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(date);
}

export type CustomerInvoiceContext = {
  label: string;
  title: string;
  details: string[];
};

export function customerInvoiceContext(invoice: InvoiceView): CustomerInvoiceContext {
  if (invoice.source === "manual_po") {
    return {
      label: "PO Random",
      title: invoice.manualPoTitle || "Pesanan Khusus",
      details: invoice.manualPoEtaText ? [`ETA ${invoice.manualPoEtaText}`] : [],
    };
  }

  if (invoice.source === "ready_stock") {
    return {
      label: "Ready Stock",
      title: invoice.readyStockTitle || "Ready Stock",
      details: [],
    };
  }

  if (invoice.batchName) {
    const eta = formatEtaMonth(invoice.batchEtaCargoMonth);
    return {
      label: "Batch / Cargo",
      title: invoice.batchName,
      details: [
        invoice.batchPoDeadlineAt ? `Close PO ${formatBfgCalendarDate(invoice.batchPoDeadlineAt)}` : null,
        eta ? `ETA ${eta}` : null,
      ].filter((value): value is string => Boolean(value)),
    };
  }

  return {
    label: "Pesanan reguler",
    title: invoice.orderCode || "Pesanan reguler",
    details: [],
  };
}
