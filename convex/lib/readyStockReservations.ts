import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import { recordAudit } from "./audit";
import { fail } from "./errors";

function reservedQuantity(inventory: Doc<"readyStockInventory">): number {
  return inventory.reservedQuantity ?? 0;
}

async function inventoryForVariant(ctx: MutationCtx, bookVariantId: Id<"bookVariants">) {
  return ctx.db
    .query("readyStockInventory")
    .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", bookVariantId))
    .unique();
}

export async function reserveReadyStock(
  ctx: MutationCtx,
  input: { orderId: Id<"orders">; orderItemId: Id<"orderItems">; bookVariantId: Id<"bookVariants">; quantity: number },
  actorUserId: Id<"appUsers">,
) {
  const inventory = await inventoryForVariant(ctx, input.bookVariantId);
  const reserved = inventory ? reservedQuantity(inventory) : 0;
  if (
    !inventory ||
    !Number.isSafeInteger(input.quantity) ||
    input.quantity < 1 ||
    input.quantity > inventory.quantity - reserved
  ) {
    fail("READY_STOCK_UNAVAILABLE");
  }
  const now = Date.now();
  await ctx.db.patch(inventory._id, {
    reservedQuantity: reserved + input.quantity,
    updatedAt: now,
    updatedByUserId: actorUserId,
  });
  const reservationId = await ctx.db.insert("readyStockReservations", {
    ...input,
    status: "active",
    createdAt: now,
    updatedAt: now,
    changedByUserId: actorUserId,
  });
  await recordAudit(ctx, actorUserId, "ready_stock.reservation_created", "readyStockReservation", reservationId, {
    orderId: String(input.orderId),
    orderItemId: String(input.orderItemId),
    quantity: String(input.quantity),
  });
  return reservationId;
}

async function changeActiveReservation(
  ctx: MutationCtx,
  reservation: Doc<"readyStockReservations">,
  actorUserId: Id<"appUsers">,
  outcome: "released" | "fulfilled",
) {
  if (reservation.status !== "active") return false;
  const inventory = await inventoryForVariant(ctx, reservation.bookVariantId);
  if (!inventory || reservedQuantity(inventory) < reservation.quantity) fail("READY_STOCK_RESERVATION_NOT_FOUND");
  const reserved = reservedQuantity(inventory);
  const patch = {
    quantity: outcome === "fulfilled" ? inventory.quantity - reservation.quantity : inventory.quantity,
    reservedQuantity: reserved - reservation.quantity,
    updatedAt: Date.now(),
    updatedByUserId: actorUserId,
  };
  if (patch.quantity < 0) fail("READY_STOCK_RESERVATION_NOT_FOUND");
  await ctx.db.patch(inventory._id, patch);
  const now = Date.now();
  await ctx.db.patch(reservation._id, {
    status: outcome,
    updatedAt: now,
    changedByUserId: actorUserId,
    ...(outcome === "fulfilled" ? { fulfilledAt: now } : { releasedAt: now }),
  });
  await recordAudit(ctx, actorUserId, `ready_stock.reservation_${outcome}`, "readyStockReservation", reservation._id, {
    orderId: String(reservation.orderId),
    quantity: String(reservation.quantity),
  });
  return true;
}

export async function releaseReadyStockReservationsForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  actorUserId: Id<"appUsers">,
) {
  const reservations = await ctx.db
    .query("readyStockReservations")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(100);
  let released = 0;
  for (const reservation of reservations) {
    if (await changeActiveReservation(ctx, reservation, actorUserId, "released")) released += reservation.quantity;
  }
  return released;
}

export async function fulfillReadyStockReservationsForOrder(
  ctx: MutationCtx,
  orderId: Id<"orders">,
  actorUserId: Id<"appUsers">,
) {
  const reservations = await ctx.db
    .query("readyStockReservations")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(100);
  let fulfilled = 0;
  for (const reservation of reservations) {
    if (await changeActiveReservation(ctx, reservation, actorUserId, "fulfilled")) fulfilled += reservation.quantity;
  }
  return fulfilled;
}
