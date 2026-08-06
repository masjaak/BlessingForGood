import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requireSession } from "./lib/sessions";
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
  return {
    batchId: batch._id,
    id: batch._id,
    name: batch.name,
    referenceCode: batch.referenceCode || null,
    description: batch.description || null,
    currentShipmentStage: batch.currentShipmentStage || null,
    isArchived: batch.isArchived,
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
    sessionToken: v.string(),
    name: v.string(),
    referenceCode: v.optional(v.string()),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
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
      createdBySessionId: session._id,
      isArchived: false,
    });
    return getBatchSummary(ctx, batchId);
  },
});

export const listForAdmin = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const page = await ctx.db.query("batches").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((batch) => getBatchSummary(ctx, batch._id))) };
  },
});

export const getForAdmin = query({
  args: { sessionToken: v.string(), batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    return getBatchSummary(ctx, args.batchId);
  },
});

export const linkCatalog = mutation({
  args: { sessionToken: v.string(), batchId: v.id("batches"), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const batch = await ctx.db.get(args.batchId);
    const catalog = await ctx.db.get(args.catalogId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
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
      createdBySessionId: session._id,
    });
    return getBatchSummary(ctx, args.batchId);
  },
});

export const unlinkCatalog = mutation({
  args: { sessionToken: v.string(), batchId: v.id("batches"), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
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
    return getBatchSummary(ctx, args.batchId);
  },
});

export const archive = mutation({
  args: { sessionToken: v.string(), batchId: v.id("batches") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) return getBatchSummary(ctx, args.batchId);
    await ctx.db.patch(args.batchId, { isArchived: true, updatedAt: Date.now() });
    return getBatchSummary(ctx, args.batchId);
  },
});
