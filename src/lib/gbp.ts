const GBP_MINOR_UNITS = 100;
const GBP_INPUT_PATTERN = /^(\d+)(?:\.(\d{1,2}))?$/;

export function normalizeGbpInput(value: string): string {
  return value.replace(",", ".");
}

export function parseGbpMinor(value: string): number | undefined {
  const normalized = normalizeGbpInput(value).trim();
  if (!normalized) return undefined;
  const match = GBP_INPUT_PATTERN.exec(normalized);
  if (!match) throw new Error("Harga GBP harus menggunakan angka dengan maksimal 2 desimal, contoh 19.99.");
  const whole = Number(match[1]);
  const fractional = match[2] ? Number(match[2].padEnd(2, "0")) : 0;
  const minor = whole * GBP_MINOR_UNITS + fractional;
  if (!Number.isSafeInteger(minor)) throw new Error("Harga GBP terlalu besar.");
  return minor;
}

export function formatGbpMinor(value: number): string {
  if (!Number.isSafeInteger(value) || value < 0) throw new Error("Nilai GBP tidak valid.");
  return `${Math.floor(value / GBP_MINOR_UNITS)}.${String(value % GBP_MINOR_UNITS).padStart(2, "0")}`;
}
