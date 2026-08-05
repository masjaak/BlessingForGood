import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { catalogIsOpen } from "./lib/catalogView";
import { fail } from "./lib/errors";
import { OPEN_ENDED_TIMESTAMP_MS, requireSession } from "./lib/sessions";
import { positiveQuantity, requiredText } from "./lib/validation";

const orderItemInput = v.object({ variantId: v.id("bookVariants"), quantity: v.number() });
type DataCtx = QueryCtx | MutationCtx;

async function activeGrant(ctx: DataCtx, sessionId: Id<"prototypeSessions">, catalogId: Id<"secretCatalogs">) {
  const grant = await ctx.db
    .query("catalogAccessGrants")
    .withIndex("by_session_and_catalog", (query) => query.eq("sessionId", sessionId).eq("catalogId", catalogId))
    .first();
  if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) fail("ACCESS_GRANT_REQUIRED");
  return grant;
}

async function orderView(ctx: DataCtx, orderId: Id<"orders">) {
  const order = await ctx.db.get(orderId);
  if (!order) fail("ORDER_NOT_FOUND");
  const items = await ctx.db
    .query("orderItems")
    .withIndex("by_order", (query) => query.eq("orderId", orderId))
    .order("asc")
    .take(200);
  const history = await ctx.db
    .query("orderStatusHistory")
    .withIndex("by_order_and_changed_at", (query) => query.eq("orderId", orderId))
    .order("asc")
    .take(100);
  return {
    orderId: order._id,
    id: order._id,
    catalogId: order.catalogId,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    status: order.status,
    currency: order.currency,
    subtotalAmount: order.subtotalAmount,
    totalAmount: order.totalAmount,
    createdAt: new Date(order.createdAt).toISOString(),
    updatedAt: new Date(order.updatedAt).toISOString(),
    submittedAt: new Date(order.submittedAt).toISOString(),
    editableUntil: new Date(order.editableUntil).toISOString(),
    items,
    statusHistory: history.map((event) => ({
      status: event.toStatus,
      at: new Date(event.changedAt).toISOString(),
      note: event.note,
    })),
  };
}

async function resolveItems(
  ctx: MutationCtx,
  catalogId: Id<"secretCatalogs">,
  requestedItems: Array<{ variantId: Id<"bookVariants">; quantity: number }>,
) {
  if (!requestedItems.length) fail("ORDER_EMPTY");
  const seen = new Set<string>();
  const resolved = [];
  for (const requested of requestedItems) {
    if (seen.has(requested.variantId)) fail("VALIDATION_FAILED", "duplicate order item");
    seen.add(requested.variantId);
    const quantity = positiveQuantity(requested.quantity);
    const catalogItem = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog_and_variant", (query) =>
        query.eq("catalogId", catalogId).eq("bookVariantId", requested.variantId),
      )
      .unique();
    if (!catalogItem || !catalogItem.isAvailable) fail("BOOK_VARIANT_UNAVAILABLE");
    const variant = await ctx.db.get(requested.variantId);
    const book = variant && (await ctx.db.get(variant.bookId));
    const publisher = book && (await ctx.db.get(book.publisherId));
    if (!variant || !variant.isAvailable || !book || !book.isActive || !publisher || !publisher.isActive) {
      fail("BOOK_VARIANT_UNAVAILABLE");
    }
    const unitPriceAmount = catalogItem.priceOverrideAmount ?? variant.priceAmount;
    const subtotalAmount = unitPriceAmount * quantity;
    resolved.push({ catalogItem, variant, book, publisher, quantity, unitPriceAmount, subtotalAmount });
  }
  return resolved;
}

export const submit = mutation({
  args: {
    sessionToken: v.string(),
    catalogId: v.id("secretCatalogs"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (!(await catalogIsOpen(ctx, args.catalogId))) fail("CATALOG_NOT_OPEN");
    await activeGrant(ctx, session._id, args.catalogId);
    const customerName = requiredText(args.customerName, "customer name");
    const resolved = await resolveItems(ctx, args.catalogId, args.items);
    const totalAmount = resolved.reduce((total, item) => total + item.subtotalAmount, 0);
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      sessionId: session._id,
      catalogId: args.catalogId,
      customerName,
      customerEmail: args.customerEmail?.trim() || undefined,
      status: "submitted",
      currency: "IDR",
      subtotalAmount: totalAmount,
      totalAmount,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      editableUntil: catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS,
    });
    for (const item of resolved) {
      await ctx.db.insert("orderItems", {
        orderId,
        catalogItemId: item.catalogItem._id,
        bookId: item.book._id,
        bookVariantId: item.variant._id,
        bookTitleSnapshot: item.book.title,
        publisherNameSnapshot: item.publisher.name,
        formatSnapshot: item.variant.format,
        isbnSnapshot: item.variant.isbn,
        unitPriceAmountSnapshot: item.unitPriceAmount,
        currencySnapshot: "IDR",
        quantity: item.quantity,
        subtotalAmount: item.subtotalAmount,
        createdAt: now,
      });
    }
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      toStatus: "submitted",
      changedAt: now,
      changedBySessionId: session._id,
    });
    return orderView(ctx, orderId);
  },
});

export const listMine = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const page = await ctx.db
      .query("orders")
      .withIndex("by_session_and_created_at", (query) => query.eq("sessionId", session._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((order) => orderView(ctx, order._id))) };
  },
});

export const listForAdmin = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const page = await ctx.db.query("orders").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((order) => orderView(ctx, order._id))) };
  },
});

export const getMine = query({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.sessionId !== session._id) fail("ORDER_ACCESS_DENIED");
    return orderView(ctx, args.orderId);
  },
});

export const getForAdmin = query({
  args: { sessionToken: v.string(), orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    if (!(await ctx.db.get(args.orderId))) fail("ORDER_NOT_FOUND");
    return orderView(ctx, args.orderId);
  },
});

export const edit = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const order = await ctx.db.get(args.orderId);
    if (!order || order.sessionId !== session._id) fail("ORDER_ACCESS_DENIED");
    if (order.status !== "submitted" || order.editableUntil <= Date.now()) fail("ORDER_LOCKED");
    if (!(await catalogIsOpen(ctx, order.catalogId))) fail("ORDER_LOCKED");
    const resolved = await resolveItems(ctx, order.catalogId, args.items);
    const totalAmount = resolved.reduce((total, item) => total + item.subtotalAmount, 0);
    const now = Date.now();
    const oldItems = await ctx.db
      .query("orderItems")
      .withIndex("by_order", (query) => query.eq("orderId", order._id))
      .collect();
    for (const item of oldItems) await ctx.db.delete(item._id);
    for (const item of resolved) {
      await ctx.db.insert("orderItems", {
        orderId: order._id,
        catalogItemId: item.catalogItem._id,
        bookId: item.book._id,
        bookVariantId: item.variant._id,
        bookTitleSnapshot: item.book.title,
        publisherNameSnapshot: item.publisher.name,
        formatSnapshot: item.variant.format,
        isbnSnapshot: item.variant.isbn,
        unitPriceAmountSnapshot: item.unitPriceAmount,
        currencySnapshot: "IDR",
        quantity: item.quantity,
        subtotalAmount: item.subtotalAmount,
        createdAt: now,
      });
    }
    await ctx.db.patch(order._id, {
      customerName: requiredText(args.customerName, "customer name"),
      customerEmail: args.customerEmail?.trim() || undefined,
      subtotalAmount: totalAmount,
      totalAmount,
      updatedAt: now,
    });
    await ctx.db.insert("orderStatusHistory", {
      orderId: order._id,
      fromStatus: "submitted",
      toStatus: "submitted",
      changedAt: now,
      changedBySessionId: session._id,
      note: "Order edited before catalog close",
    });
    return orderView(ctx, order._id);
  },
});

export const updateStatus = mutation({
  args: {
    sessionToken: v.string(),
    orderId: v.id("orders"),
    status: v.union(v.literal("cancelled"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    if (order.status !== "submitted") fail("VALIDATION_FAILED", "order transition is not allowed");
    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: args.status,
      updatedAt: now,
      cancelledAt: args.status === "cancelled" ? now : undefined,
    });
    await ctx.db.insert("orderStatusHistory", {
      orderId: order._id,
      fromStatus: order.status,
      toStatus: args.status,
      changedAt: now,
      changedBySessionId: session._id,
    });
    return orderView(ctx, order._id);
  },
});
