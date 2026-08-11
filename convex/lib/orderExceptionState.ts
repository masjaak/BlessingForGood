import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";

type DataCtx = QueryCtx | MutationCtx;

export function blocksNormalFulfillment(exception: Doc<"orderExceptions">): boolean {
  return !(
    exception.status === "rejected" ||
    (exception.status === "resolved" && exception.resolution === "no_action")
  );
}

export function needsResolution(exception: Doc<"orderExceptions">): boolean {
  return (
    exception.status === "opened" || exception.status === "under_review" || exception.status === "resolution_selected"
  );
}

export async function exceptionsForOrderItem(ctx: DataCtx, orderItemId: Id<"orderItems">) {
  return ctx.db
    .query("orderExceptions")
    .withIndex("by_order_item", (index) => index.eq("orderItemId", orderItemId))
    .take(200);
}

export async function blockedQuantityForOrderItem(
  ctx: DataCtx,
  orderItemId: Id<"orderItems">,
  excludeExceptionId?: Id<"orderExceptions">,
): Promise<number> {
  const exceptions = await exceptionsForOrderItem(ctx, orderItemId);
  return exceptions.reduce(
    (total, exception) =>
      total +
      (exception._id === excludeExceptionId || !blocksNormalFulfillment(exception) ? 0 : exception.affectedQuantity),
    0,
  );
}

export async function fulfillableQuantityForOrderItem(ctx: DataCtx, orderItem: Doc<"orderItems">): Promise<number> {
  return Math.max(0, orderItem.quantity - (await blockedQuantityForOrderItem(ctx, orderItem._id)));
}

export async function hasUnresolvedException(ctx: DataCtx, orderId: Id<"orders">): Promise<boolean> {
  const exceptions = await ctx.db
    .query("orderExceptions")
    .withIndex("by_order", (index) => index.eq("orderId", orderId))
    .take(200);
  return exceptions.some(needsResolution);
}
