function excelCell(value: string | number): string {
  const text = String(value);
  const dangerous = /^[=+\-@]/.test(text);
  const safe = dangerous ? `'${text}` : text;
  return dangerous || /[",\r\n]/.test(safe) ? `"${safe.replaceAll('"', '""')}"` : safe;
}

export function toExcelCsv(rows: Array<Array<string | number>>): string {
  return `\uFEFF${rows.map((row) => row.map(excelCell).join(",")).join("\r\n")}`;
}
