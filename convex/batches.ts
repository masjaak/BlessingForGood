import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { requiredText } from "./lib/validation";

type DataCtx = QueryCtx | MutationCtx;

export async function getBatchSummary(ctx: DataCtx, batchId: Id<"batches">) {
  const batch = await ctx.db.get(batchId);
  if (!batch) fail("BATCH_NOT_FOUND");
  const links = await ctx.db
    .query("catalogBatchLinks")
    .withIndex("by_batch", (index) => index.eq("batchId", batch._id))
    .take(200);
  const catalogs = await Promise.all(links.map((link) => ctx.db.get(link.catalogId)));
  const assignments = await ctx.db
    .query("orderItemBatchAssignments")
    .withIndex("by_batch", (index) => index.eq("batchId", batch._id))
    .take(200);
  const customerIds = new Set<string>();
  let assignedQuantity = 0;
  for (const assignment of assignments) {
    assignedQuantity += assignment.assignedQuantity;
    const orderItem = await ctx.db.get(assignment.orderItemId);
    const order = orderItem && (await ctx.db.get(orderItem.orderId));
    if (order) customerIds.add(String(order.customerUserId));
  }
  return {
    batchId: batch._id,
    id: batch._id,
    name: batch.name,
    referenceCode: batch.referenceCode || null,
    description: batch.description || null,
    currentShipmentStage: batch.currentShipmentStage || null,
    rosterLocked: batch.currentShipmentStage !== undefined,
    isArchived: batch.isArchived,
    assignmentCount: assignments.length,
    assignedQuantity,
    customerCount: customerIds.size,
    createdAt: new Date(batch.createdAt).toISOString(),
    updatedAt: new Date(batch.updatedAt).toISOString(),
    catalogLinks: links.map((link, index) => ({
      catalogId: link.catalogId,
      catalogName: catalogs[index]?.name || "Unknown catalog",
      createdAt: new Date(link.createdAt).toISOString(),
    })),
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    referenceCode: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const name = requiredText(args.name, "batch name");
    const referenceCode = args.referenceCode?.trim() || undefined;
    if (referenceCode) {
      const duplicate = await ctx.db
        .query("batches")
        .withIndex("by_reference_code", (index) => index.eq("referenceCode", referenceCode))
        .unique();
      if (duplicate) fail("VALIDATION_FAILED", "batch reference code is already in use");
    }
    const now = Date.now();
    const batchId = await ctx.db.insert("batches", {
      name,
      referenceCode,
      description: args.description?.trim() || undefined,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
      isArchived: false,
    });
    await recordAudit(ctx, user._id, "batch.created", "batch", batchId);
    return getBatchSummary(ctx, batchId);
  },
});

export const listForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "batches.read");
    const page = await ctx.db.query("batches").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((batch) => getBatchSummary(ctx, batch._id))) };
  },
});

export const getForAdmin = query({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "batches.read");
    return getBatchSummary(ctx, args.batchId);
  },
});

export const linkCatalog = mutation({
  args: { batchId: v.id("batches"), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    const catalog = await ctx.db.get(args.catalogId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    if (batch.currentShipmentStage) fail("BATCH_LOCKED");
    if (!catalog) fail("CATALOG_NOT_FOUND");
    const duplicate = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_catalog_and_batch", (index) => index.eq("catalogId", args.catalogId).eq("batchId", args.batchId))
      .unique();
    if (duplicate) fail("VALIDATION_FAILED", "catalog is already linked to batch");
    await ctx.db.insert("catalogBatchLinks", {
      catalogId: args.catalogId,
      batchId: args.batchId,
      createdAt: Date.now(),
      createdByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "batch.catalog_linked", "batch", args.batchId, { catalogId: args.catalogId });
    return getBatchSummary(ctx, args.batchId);
  },
});

export const unlinkCatalog = mutation({
  args: { batchId: v.id("batches"), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.currentShipmentStage) fail("BATCH_LOCKED");
    const link = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_catalog_and_batch", (index) => index.eq("catalogId", args.catalogId).eq("batchId", args.batchId))
      .unique();
    if (!link) fail("BATCH_CATALOG_MISMATCH");
    const assignments = await ctx.db
      .query("orderItemBatchAssignments")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    for (const assignment of assignments) {
      const orderItem = await ctx.db.get(assignment.orderItemId);
      const order = orderItem && (await ctx.db.get(orderItem.orderId));
      if (order?.catalogId === args.catalogId) fail("BATCH_ASSIGNMENT_INVALID", "active assignment blocks unlink");
    }
    await ctx.db.delete(link._id);
    await recordAudit(ctx, user._id, "batch.catalog_unlinked", "batch", args.batchId, { catalogId: args.catalogId });
    return getBatchSummary(ctx, args.batchId);
  },
});

export const archive = mutation({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) return getBatchSummary(ctx, args.batchId);
    await ctx.db.patch(args.batchId, { isArchived: true, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "batch.archived", "batch", args.batchId);
    return getBatchSummary(ctx, args.batchId);
  },
});
