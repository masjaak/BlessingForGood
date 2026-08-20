import type { MutationCtx } from "../_generated/server";

function datePart(timestamp: number) {
  const date = new Date(timestamp);
  const year = String(date.getUTCFullYear()).slice(-2);
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function nextOrderCode(ctx: MutationCtx, createdAt: number) {
  const counter = await ctx.db
    .query("orderReferenceCounters")
    .withIndex("by_key", (index) => index.eq("key", "primary"))
    .unique();
  const sequence = counter?.nextNumber || 1;
  const nextNumber = sequence + 1;
  if (counter) {
    await ctx.db.patch(counter._id, { nextNumber, updatedAt: createdAt });
  } else {
    await ctx.db.insert("orderReferenceCounters", { key: "primary", nextNumber, updatedAt: createdAt });
  }
  return `BFG-ORD-${datePart(createdAt)}-${sequence.toString(36).toUpperCase().padStart(4, "0")}`;
}
