import { formatBfgCalendarDate } from "@/lib/calendar-date";
import { formatGbpMinor } from "@/lib/gbp";

export type OrderAnalyticsExportRow = {
  customerName: string;
  publisherName: string;
  isbn: string;
  bookTitle: string;
  format: string;
  quantity: number;
  catalogName: string | null;
  closeDate: number | null;
  supplierPriceGbpMinor: number | null;
  unitPriceAmount: number;
};

export function orderAnalyticsCsvRows(rows: OrderAnalyticsExportRow[]): Array<Array<string | number>> {
  return [
    [
      "NAMA CUSTOMER",
      "PUBLISHER",
      "ISBN",
      "JUDUL",
      "FORMAT",
      "QTY",
      "NAMA CARGO",
      "TANGGAL CLOSE",
      "HARGA GBP",
      "HARGA IDR",
    ],
    ...rows.map((row) => [
      row.customerName,
      row.publisherName,
      row.isbn,
      row.bookTitle,
      row.format,
      row.quantity,
      row.catalogName ?? "",
      row.closeDate === null ? "" : formatBfgCalendarDate(row.closeDate),
      row.supplierPriceGbpMinor === null ? "" : formatGbpMinor(row.supplierPriceGbpMinor),
      row.unitPriceAmount,
    ]),
  ];
}
