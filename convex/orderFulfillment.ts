import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { canTransitionFulfillment } from "./lib/fulfillmentTransitions";
import { fail } from "./lib/errors";
import { fulfillmentStageValidator } from "./validators";
import { hasUnresolvedException } from "./lib/orderExceptionState";

async function historyView(ctx: QueryCtx, orderId: Id<"orders">, includeNote = false) {
  const history = await ctx.db
    .query("orderFulfillmentHistory")
    .withIndex("by_order_and_changed_at", (index) => index.eq("orderId", orderId))
    .order("asc")
    .take(100);
  return history.map((event) => ({
    fromStage: event.fromStage || null,
    toStage: event.toStage,
    at: new Date(event.changedAt).toISOString(),
    ...(includeNote ? { note: event.note || null } : {}),
  }));
}

async function timelineView(ctx: QueryCtx, orderId: Id<"orders">, includeNote = false) {
  const order = await ctx.db.get(orderId);
  if (!order) fail("ORDER_NOT_FOUND");
  return {
    orderId: order._id,
    currentStage: order.currentFulfillmentStage || null,
    updatedAt: order.fulfillmentUpdatedAt ? new Date(order.fulfillmentUpdatedAt).toISOString() : null,
    history: await historyView(ctx, orderId, includeNote),
  };
}

export const updateStage = mutation({
  args: {
    orderId: v.id("orders"),
    toStage: fulfillmentStageValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "tracking.manage");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    if (args.toStage === "completed" && (await hasUnresolvedException(ctx, order._id))) {
      fail("EXCEPTION_REQUIRES_RESOLUTION");
    }
    if (!canTransitionFulfillment(order.currentFulfillmentStage, args.toStage)) {
      fail("INVALID_FULFILLMENT_TRANSITION");
    }
    const now = Date.now();
    await ctx.db.patch(order._id, {
      currentFulfillmentStage: args.toStage,
      fulfillmentUpdatedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("orderFulfillmentHistory", {
      orderId: order._id,
      fromStage: order.currentFulfillmentStage,
      toStage: args.toStage,
      changedAt: now,
      changedByUserId: user._id,
      note: args.note?.trim() || undefined,
    });
    await recordAudit(ctx, user._id, "tracking.fulfillment_stage_changed", "order", order._id, { stage: args.toStage });
    return timelineView(ctx, order._id, true);
  },
});

export const getMine = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.own");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    return timelineView(ctx, args.orderId);
  },
});

export const getForAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "tracking.read.all");
    return timelineView(ctx, args.orderId, true);
  },
});
