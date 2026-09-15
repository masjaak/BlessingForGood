import { formatGbpMinor } from "@/lib/gbp";
import { formatBfgCalendarDate } from "@/lib/calendar-date";

function excelCell(value: string | number): string {
  const text = String(value);
  const dangerous = /^[=+\-@]/.test(text);
  const safe = dangerous ? `'${text}` : text;
  return dangerous || /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toExcelCsv(rows: Array<Array<string | number>>): string {
  return `\uFEFF${rows.map((row) => row.map(excelCell).join(",")).join("\r\n")}`;
}

export type PurchaseSummaryExportRow = {
  publisherName: string;
  isbn: string;
  bookTitle: string;
  format: string;
  quantity: number;
  supplierPriceGbpMinor: number | null;
  unitPriceAmount: number;
};

export type PurchaseSummaryExportContext = {
  batchName: string;
  cargoName: string | null;
  closeDate: number | null;
};

export function purchaseSummaryCsvRows(
  items: PurchaseSummaryExportRow[],
  context: PurchaseSummaryExportContext,
): Array<Array<string | number>> {
  const closeDate = context.closeDate === null ? "" : formatBfgCalendarDate(context.closeDate);
  const rows: Array<Array<string | number>> = [
    [
      "NAMA BATCH",
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
  ];
  const groups = new Map<string, PurchaseSummaryExportRow[]>();
  for (const item of items) {
    const group = groups.get(item.publisherName) || [];
    group.push(item);
    groups.set(item.publisherName, group);
  }
  for (const [publisher, groupedItems] of [...groups.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    rows.push([context.batchName, publisher, "", "", "", "", context.cargoName ?? "", closeDate, "", ""]);
    for (const item of groupedItems.sort((left, right) => left.bookTitle.localeCompare(right.bookTitle))) {
      rows.push([
        context.batchName,
        publisher,
        item.isbn,
        item.bookTitle,
        item.format,
        item.quantity,
        context.cargoName ?? "",
        closeDate,
        item.supplierPriceGbpMinor === null ? "" : formatGbpMinor(item.supplierPriceGbpMinor),
        item.unitPriceAmount,
      ]);
    }
  }
  return rows;
}
