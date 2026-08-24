import type { MutationCtx } from "../_generated/server";

const MAX_SEQUENCE = 36 ** 4 - 1;

export function invoiceDatePart(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("invoice date is invalid");
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export function invoiceNumberForSequence(datePart: string, sequence: number): string {
  if (!/^\d{6}$/.test(datePart) || !Number.isSafeInteger(sequence) || sequence < 1 || sequence > MAX_SEQUENCE) {
    throw new Error("invoice reference sequence is invalid");
  }
  return `BFG-INV-${datePart}-${sequence.toString(36).toUpperCase().padStart(4, "0")}`;
}

export function isCanonicalInvoiceNumber(value: string): boolean {
  return /^BFG-INV-\d{6}-[0-9A-Z]{4}$/.test(value.trim());
}

export async function nextInvoiceNumber(ctx: MutationCtx, createdAt: number): Promise<string> {
  const datePart = invoiceDatePart(createdAt);
  const counter = await ctx.db
    .query("invoiceReferenceCounters")
    .withIndex("by_date_part", (index) => index.eq("datePart", datePart))
    .unique();
  let sequence = counter?.nextNumber ?? 1;
  for (; sequence <= MAX_SEQUENCE; sequence += 1) {
    const reference = invoiceNumberForSequence(datePart, sequence);
    const existing = await ctx.db
      .query("invoices")
      .withIndex("by_invoice_number", (index) => index.eq("invoiceNumber", reference))
      .first();
    if (existing) continue;
    const nextNumber = sequence + 1;
    if (counter) await ctx.db.patch(counter._id, { nextNumber, updatedAt: createdAt });
    else await ctx.db.insert("invoiceReferenceCounters", { datePart, nextNumber, updatedAt: createdAt });
    return reference;
  }
  throw new Error("invoice reference sequence exhausted");
}
