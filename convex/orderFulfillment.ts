import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { canTransitionFulfillment } from "./lib/fulfillmentTransitions";
import { fail } from "./lib/errors";
import { requireSession } from "./lib/sessions";
import { fulfillmentStageValidator } from "./validators";

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
    sessionToken: v.string(),
    orderId: v.id("orders"),
    toStage: fulfillmentStageValidator,
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
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
      changedBySessionId: session._id,
      note: args.note?.trim() || undefined,
    });
    return timelineView(ctx, order._id, true);
  },
});

export const getMine = query({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.sessionId !== session._id) fail("ORDER_ACCESS_DENIED");
    return timelineView(ctx, args.orderId);
  },
});

export const getForAdmin = query({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    return timelineView(ctx, args.orderId, true);
  },
});
