export const BFG_TIME_ZONE = "Asia/Jakarta";

const BFG_TIME_ZONE_OFFSET = "+07:00";
const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

function asDate(value: number | string | Date): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) throw new Error("Tanggal tidak valid.");
  return date;
}

export function calendarDateKey(value: number | string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    day: "2-digit",
    month: "2-digit",
    timeZone: BFG_TIME_ZONE,
    year: "numeric",
  }).formatToParts(asDate(value));
  const values: Record<string, string> = {};
  for (const part of parts) values[part.type] = part.value;
  return `${values.year}-${values.month}-${values.day}`;
}

export function calendarDateInputValue(value: number | null | undefined): string {
  return value === null || value === undefined ? "" : calendarDateKey(value);
}

export function formatBfgCalendarDate(value: number | string | Date): string {
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeZone: BFG_TIME_ZONE }).format(asDate(value));
}

export function calendarDateToEndTimestamp(value: string): number {
  if (!CALENDAR_DATE_PATTERN.test(value)) throw new Error("Tanggal harus menggunakan format YYYY-MM-DD.");
  const timestamp = Date.parse(`${value}T23:59:59.999${BFG_TIME_ZONE_OFFSET}`);
  if (Number.isNaN(timestamp) || calendarDateKey(timestamp) !== value) throw new Error("Tanggal tidak valid.");
  return timestamp;
}

export function calendarDateToStartTimestamp(value: string): number {
  if (!CALENDAR_DATE_PATTERN.test(value)) throw new Error("Tanggal harus menggunakan format YYYY-MM-DD.");
  const timestamp = Date.parse(`${value}T00:00:00${BFG_TIME_ZONE_OFFSET}`);
  if (Number.isNaN(timestamp) || calendarDateKey(timestamp) !== value) throw new Error("Tanggal tidak valid.");
  return timestamp;
}
