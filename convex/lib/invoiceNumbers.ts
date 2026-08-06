export function invoiceNumberForId(invoiceId: string, createdAt: number): string {
  if (!invoiceId.trim()) throw new Error("invoice id is required");
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) throw new Error("invoice date is invalid");
  const period = `${date.getUTCFullYear()}${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
  return `BFG-${period}-${invoiceId.toUpperCase()}`;
}
