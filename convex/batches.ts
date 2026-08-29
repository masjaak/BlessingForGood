import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { fulfillableQuantityForOrderItem } from "./lib/orderExceptionState";
import { requiredText } from "./lib/validation";
import { nextBatchReference } from "./lib/batchNumbers";
import { calendarDateKey } from "../src/lib/calendar-date";

type DataCtx = QueryCtx | MutationCtx;

export function assertBatchCatalogDeadline(batch: Doc<"batches">, catalog: Doc<"secretCatalogs">): void {
  const batchDeadline = batch.poDeadlineAt ?? null;
  const catalogDeadline = catalog.closesAt ?? null;
  const sameCalendarDate =
    batchDeadline === null && catalogDeadline === null
      ? true
      : batchDeadline !== null &&
        catalogDeadline !== null &&
        calendarDateKey(batchDeadline) === calendarDateKey(catalogDeadline);
  if (!sameCalendarDate) {
    fail("BATCH_DEADLINE_MISMATCH", "Batch dan Secret Catalog harus memiliki deadline PO yang sama");
  }
}

async function catalogRosterSummary(ctx: DataCtx, catalogId: Id<"secretCatalogs">) {
  const orders = await ctx.db
    .query("orders")
    .withIndex("by_catalog_and_status", (index) => index.eq("catalogId", catalogId).eq("status", "submitted"))
    .take(200);
  const customers = new Set<string>();
  const publishers = new Set<string>();
  let eligibleOrderItemCount = 0;
  let eligibleQuantity = 0;
  for (const order of orders) {
    if (order.source === "ready_stock") continue;
    const items = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (index) => index.eq("orderId", order._id))
      .take(200);
    for (const item of items) {
      const fulfillableQuantity = await fulfillableQuantityForOrderItem(ctx, item);
      if (fulfillableQuantity <= 0) continue;
      customers.add(String(order.customerUserId));
      eligibleOrderItemCount += 1;
      eligibleQuantity += fulfillableQuantity;
      publishers.add(item.publisherNameSnapshot);
    }
  }
  return {
    eligibleOrderItemCount,
    eligibleCustomerCount: customers.size,
    eligibleQuantity,
    publisherCount: publishers.size,
  };
}

function normalizedEtaCargoMonth(value: string | undefined): string | undefined {
  const month = value?.trim() || undefined;
  if (month && !/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) {
    fail("VALIDATION_FAILED", "ETA Cargo harus berupa bulan YYYY-MM");
  }
  return month;
}

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
  const catalogLinks = await Promise.all(
    links.map(async (link, index) => ({
      catalogId: link.catalogId,
      catalogName: catalogs[index]?.name || "Unknown catalog",
      closingAt: catalogs[index]?.closesAt ?? null,
      createdAt: new Date(link.createdAt).toISOString(),
      ...(catalogs[index]
        ? await catalogRosterSummary(ctx, link.catalogId)
        : {
            eligibleOrderItemCount: 0,
            eligibleCustomerCount: 0,
            eligibleQuantity: 0,
            publisherCount: 0,
          }),
    })),
  );
  return {
    batchId: batch._id,
    id: batch._id,
    name: batch.name,
    referenceCode: batch.referenceCode || null,
    description: batch.description || null,
    poDeadlineAt: batch.poDeadlineAt ?? null,
    etaCargoMonth: batch.etaCargoMonth ?? null,
    currentShipmentStage: batch.currentShipmentStage || null,
    rosterLocked: batch.currentShipmentStage !== undefined,
    isArchived: batch.isArchived,
    assignmentCount: assignments.length,
    assignedQuantity,
    customerCount: customerIds.size,
    createdAt: new Date(batch.createdAt).toISOString(),
    updatedAt: new Date(batch.updatedAt).toISOString(),
    catalogLinks,
  };
}

export const create = mutation({
  args: {
    name: v.string(),
    referenceCode: v.optional(v.string()),
    description: v.optional(v.string()),
    poDeadlineAt: v.optional(v.number()),
    etaCargoMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const name = requiredText(args.name, "batch name");
    const requestedReferenceCode = args.referenceCode?.trim() || undefined;
    const etaCargoMonth = normalizedEtaCargoMonth(args.etaCargoMonth);
    if (args.poDeadlineAt !== undefined && args.poDeadlineAt <= Date.now()) {
      fail("VALIDATION_FAILED", "PO deadline must be in the future");
    }
    const now = Date.now();
    const referenceCode = requestedReferenceCode || (await nextBatchReference(ctx, now));
    const duplicate = await ctx.db
      .query("batches")
      .withIndex("by_reference_code", (index) => index.eq("referenceCode", referenceCode))
      .unique();
    if (duplicate) fail("VALIDATION_FAILED", "batch reference code is already in use");
    const batchId = await ctx.db.insert("batches", {
      name,
      referenceCode,
      description: args.description?.trim() || undefined,
      poDeadlineAt: args.poDeadlineAt,
      etaCargoMonth,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
      isArchived: false,
    });
    await recordAudit(ctx, user._id, "batch.created", "batch", batchId);
    return getBatchSummary(ctx, batchId);
  },
});

export const update = mutation({
  args: {
    batchId: v.id("batches"),
    name: v.string(),
    description: v.optional(v.string()),
    poDeadlineAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    if (batch.currentShipmentStage) fail("BATCH_LOCKED");
    const poDeadlineAt = args.poDeadlineAt === undefined ? batch.poDeadlineAt : args.poDeadlineAt;
    if (poDeadlineAt !== undefined && poDeadlineAt <= Date.now()) {
      fail("VALIDATION_FAILED", "PO deadline must be in the future");
    }
    const links = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_batch", (index) => index.eq("batchId", args.batchId))
      .take(200);
    const nextBatch = { ...batch, poDeadlineAt };
    await Promise.all(
      links.map(async (link) => {
        const catalog = await ctx.db.get(link.catalogId);
        if (!catalog) fail("CATALOG_NOT_FOUND");
        assertBatchCatalogDeadline(nextBatch, catalog);
      }),
    );
    const name = requiredText(args.name, "batch name");
    const description = args.description === undefined ? batch.description : args.description.trim() || undefined;
    await ctx.db.patch(args.batchId, {
      name,
      description,
      poDeadlineAt,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, user._id, "batch.updated", "batch", args.batchId);
    return getBatchSummary(ctx, args.batchId);
  },
});

export const updateEtaCargoMonth = mutation({
  args: {
    batchId: v.id("batches"),
    etaCargoMonth: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived) fail("BATCH_ARCHIVED");
    const etaCargoMonth = normalizedEtaCargoMonth(args.etaCargoMonth);
    await ctx.db.patch(args.batchId, { etaCargoMonth, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "batch.eta_updated", "batch", args.batchId, {
      etaCargoMonth: etaCargoMonth || "",
    });
    return getBatchSummary(ctx, args.batchId);
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
    assertBatchCatalogDeadline(batch, catalog);
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

export const remove = mutation({
  args: { batchId: v.id("batches") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "batches.manage");
    const batch = await ctx.db.get(args.batchId);
    if (!batch) fail("BATCH_NOT_FOUND");
    if (batch.isArchived || batch.currentShipmentStage) {
      fail("ENTITY_DELETE_NOT_ALLOWED", "operational batches may only be archived");
    }
    const [link, assignment, history] = await Promise.all([
      ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_batch", (query) => query.eq("batchId", batch._id))
        .first(),
      ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (query) => query.eq("batchId", batch._id))
        .first(),
      ctx.db
        .query("batchStatusHistory")
        .withIndex("by_batch", (query) => query.eq("batchId", batch._id))
        .first(),
    ]);
    if (link || assignment || history) fail("ENTITY_IN_USE", "batch has operational history");
    await ctx.db.delete(batch._id);
    await recordAudit(ctx, user._id, "batch.deleted", "batch", batch._id);
    return { removed: true as const };
  },
});
