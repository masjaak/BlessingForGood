import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { getBatchSummary } from "./batches";
import { canTransitionShipment } from "./lib/shipmentTransitions";
import { fail } from "./lib/errors";
import { requireSession } from "./lib/sessions";
import { positiveQuantity } from "./lib/validation";

type DataCtx = QueryCtx | MutationCtx;

async function linkedCatalog(ctx: DataCtx, catalogId: Id<"secretCatalogs">, batchId: Id<"batches">) {
  return ctx.db
    .query("catalogBatchLinks")
    .withIndex("by_catalog_and_batch", (index) => index.eq("catalogId", catalogId).eq("batchId", batchId))
    .unique();
}

async function historyView(ctx: QueryCtx, batchId: Id<"batches">, includeNote = false) {
  const history = await ctx.db
    .query("batchStatusHistory")
    .withIndex("by_batch_and_changed_at", (index) => index.eq("batchId", batchId))
    .order("asc")
    .take(100);
  return history.map((event) => ({
    fromStage: event.fromStage || null,
    toStage: event.toStage,
    at: new Date(event.changedAt).toISOString(),
    ...(includeNote ? { note: event.note || null } : {}),
  }));
}

export const assignOrderItem = mutation({
  args: {
    sessionToken: v.string(),
    orderItemId: v.id("orderItems"),
    batchId: v.id("batches"),
    assignedQuantity: v.number(),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const quantity = positiveQuantity(args.assignedQuantity);
    const orderItem = await ctx.db.get(args.orderItemId);
    const batch = await ctx.db.get(args.batchId);
    const order = orderItem && (await ctx.db.get(orderItem.orderId));
    if (!orderItem || !order || !batch) fail("BATCH_ASSIGNMENT_INVALID");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    if (!(await linkedCatalog(ctx, order.catalogId, args.batchId))) fail("BATCH_CATALOG_MISMATCH");
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_order_item", (index) => index.eq("orderItemId", args.orderItemId))
      .take(200);
    const existing = assignments.find((assignment) => assignment.batchId === args.batchId);
    const assignedTotal = assignments.reduce((total, assignment) => total + assignment.assignedQuantity, quantity);
    const totalAfterUpdate = assignedTotal - (existing?.assignedQuantity || 0);
    if (totalAfterUpdate > orderItem.quantity) fail("BATCH_ASSIGNMENT_EXCEEDS_QUANTITY");
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        assignedQuantity: quantity,
        updatedAt: now,
        assignedBySessionId: session._id,
      });
      return existing._id;
    }
    return ctx.db.insert("orderItemBatchAssignments", {
      orderItemId: args.orderItemId,
      batchId: args.batchId,
      assignedQuantity: quantity,
      createdAt: now,
      updatedAt: now,
      assignedBySessionId: session._id,
    });
  },
});

export const updateShipmentStage = mutation({
  args: {
    sessionToken: v.string(),
    batchId: v.id("batches"),
    toStage: v.union(
      v.literal("po_closed"),
      v.literal("ordered_to_supplier"),
      v.literal("shipped_internationally"),
      v.literal("customs"),
      v.literal("to_indonesia_warehouse"),
      v.literal("at_store"),
    ),
    allowSkip: v.optional(v.boolean()),
    note: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    if (!canTransitionShipment(batch.currentShipmentStage, args.toStage, args.allowSkip === true)) {
      fail("INVALID_SHIPMENT_TRANSITION");
    }
    const now = Date.now();
    await ctx.db.patch(args.batchId, { currentShipmentStage: args.toStage, updatedAt: now });
    await ctx.db.insert("batchStatusHistory", {
      batchId: args.batchId,
      fromStage: batch.currentShipmentStage,
      toStage: args.toStage,
      changedAt: now,
      changedBySessionId: session._id,
      note: args.note?.trim() || undefined,
    });
    return getBatchSummary(ctx, args.batchId);
  },
});

export const getMine = query({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.sessionId !== session._id) fail("ORDER_ACCESS_DENIED");
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    const sections = new Map<string, { batchId: Id<"batches">; assignments: unknown[] }>();
    for (const item of items) {
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_order_item", (index) => index.eq("orderItemId", item._id))
        .take(200);
      for (const assignment of assignments) {
        const section = sections.get(assignment.batchId) || { batchId: assignment.batchId, assignments: [] };
        section.assignments.push({
          orderItemId: item._id,
          bookTitle: item.bookTitleSnapshot,
          format: item.formatSnapshot,
          quantity: assignment.assignedQuantity,
        });
        sections.set(assignment.batchId, section);
      }
    }
    const batches = await Promise.all(
      Array.from(sections.values()).map(async (section) => {
        const batch = await ctx.db.get(section.batchId);
        if (!batch) return null;
        return {
          batchId: batch._id,
          name: batch.name,
          referenceCode: batch.referenceCode || null,
          currentShipmentStage: batch.currentShipmentStage || null,
          updatedAt: new Date(batch.updatedAt).toISOString(),
          assignments: section.assignments,
          history: await historyView(ctx, batch._id),
        };
      }),
    );
    return { orderId: order._id, batches: batches.filter((batch) => batch !== null) };
  },
});

export const getForAdmin = query({
  args: { sessionToken: v.string(), batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const summary = await getBatchSummary(ctx, args.batchId);
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    const assignedItems = await Promise.all(
      assignments.map(async (assignment) => {
        const orderItem = await ctx.db.get(assignment.orderItemId);
        const order = orderItem && (await ctx.db.get(orderItem.orderId));
        if (!orderItem || !order) return null;
        return {
          assignmentId: assignment._id,
          orderId: order._id,
          customerName: order.customerName,
          orderItemId: orderItem._id,
          bookTitle: orderItem.bookTitleSnapshot,
          format: orderItem.formatSnapshot,
          assignedQuantity: assignment.assignedQuantity,
          orderedQuantity: orderItem.quantity,
        };
      }),
    );
    return {
      ...summary,
      assignments: assignedItems.filter((item) => item !== null),
      history: await historyView(ctx, args.batchId, true),
    };
  },
});
