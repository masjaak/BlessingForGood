import type { MutationCtx } from "../_generated/server";

const MAX_SEQUENCE = 36 ** 4 - 1;

function batchDatePart(timestamp: number): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) throw new Error("batch date is invalid");
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function nextBatchReference(ctx: MutationCtx, createdAt: number): Promise<string> {
  const datePart = batchDatePart(createdAt);
  const counter = await ctx.db
    .query("batchReferenceCounters")
    .withIndex("by_date_part", (index) => index.eq("datePart", datePart))
    .unique();
  let sequence = counter?.nextNumber ?? 1;
  for (; sequence <= MAX_SEQUENCE; sequence += 1) {
    const reference = `BFG-BAT-${datePart}-${sequence.toString(36).toUpperCase().padStart(4, "0")}`;
    const existing = await ctx.db
      .query("batches")
      .withIndex("by_reference_code", (index) => index.eq("referenceCode", reference))
      .first();
    if (existing) continue;
    const nextNumber = sequence + 1;
    if (counter) await ctx.db.patch(counter._id, { nextNumber, updatedAt: createdAt });
    else await ctx.db.insert("batchReferenceCounters", { datePart, nextNumber, updatedAt: createdAt });
    return reference;
  }
  throw new Error("batch reference sequence exhausted");
}
