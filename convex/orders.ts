import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveUser, requireOwnedResource, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { catalogIsOpen } from "./lib/catalogView";
import { fail } from "./lib/errors";
import { OPEN_ENDED_TIMESTAMP_MS } from "./lib/sessions";
import { notifyAdmins } from "./lib/notifications";
import { hasUnresolvedException } from "./lib/orderExceptionState";
import { fulfillReadyStockReservationsForOrder, reserveReadyStock } from "./lib/readyStockReservations";
import { positiveQuantity, requiredText } from "./lib/validation";

const orderItemInput = v.object({ variantId: v.id("bookVariants"), quantity: v.number() });
type DataCtx = QueryCtx | MutationCtx;

async function activeGrant(ctx: DataCtx, appUserId: Id<"appUsers">, catalogId: Id<"secretCatalogs">) {
  const grant = await ctx.db
    .query("catalogAccessGrants")
    .withIndex("by_app_user_id_and_catalog_id", (query) => query.eq("appUserId", appUserId).eq("catalogId", catalogId))
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
    customerUserId: order.customerUserId,
    catalogId: order.catalogId ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    source: order.source ?? "customer_self_service",
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

async function insertOrder(
  ctx: MutationCtx,
  input: {
    customerUserId: Id<"appUsers">;
    catalogId?: Id<"secretCatalogs">;
    customerName: string;
    customerEmail?: string;
    source: "customer_self_service" | "admin_assisted" | "ready_stock";
    actorUserId: Id<"appUsers">;
    assistedSubmissionKey?: string;
    note?: string;
  },
  resolved: Awaited<ReturnType<typeof resolveItems>>,
  editableUntil: number,
) {
  const totalAmount = resolved.reduce((total, item) => total + item.subtotalAmount, 0);
  const now = Date.now();
  const orderId = await ctx.db.insert("orders", {
    customerUserId: input.customerUserId,
    catalogId: input.catalogId,
    source: input.source,
    assistedSubmissionKey: input.assistedSubmissionKey,
    customerName: input.customerName,
    customerEmail: input.customerEmail,
    status: "submitted",
    currency: "IDR",
    subtotalAmount: totalAmount,
    totalAmount,
    createdAt: now,
    updatedAt: now,
    submittedAt: now,
    editableUntil,
  });
  for (const item of resolved) {
    await ctx.db.insert("orderItems", {
      orderId,
      catalogItemId: item.catalogItem?._id,
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
    changedByUserId: input.actorUserId,
    note: input.note,
  });
  return orderView(ctx, orderId);
}

export const submit = mutation({
  args: {
    catalogId: v.id("secretCatalogs"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (!(await catalogIsOpen(ctx, args.catalogId))) fail("CATALOG_NOT_OPEN");
    await activeGrant(ctx, user._id, args.catalogId);
    const customerName = requiredText(args.customerName, "customer name");
    const resolved = await resolveItems(ctx, args.catalogId, args.items);
    const order = await insertOrder(
      ctx,
      {
        customerUserId: user._id,
        catalogId: args.catalogId,
        customerName,
        customerEmail: args.customerEmail?.trim() || undefined,
        source: "customer_self_service",
        actorUserId: user._id,
      },
      resolved,
      catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS,
    );
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "order.submitted",
      title: "Order baru diterima",
      body: `${customerName} mengirim preorder baru.`,
      destination: `/admin/orders/${order.orderId}`,
      relatedEntityType: "order",
      relatedEntityId: String(order.orderId),
    });
    return order;
  },
});

async function resolveReadyStockItem(ctx: MutationCtx, variantId: Id<"bookVariants">, quantityInput: number) {
  const quantity = positiveQuantity(quantityInput);
  const variant = await ctx.db.get(variantId);
  const book = variant && (await ctx.db.get(variant.bookId));
  const publisher = book && (await ctx.db.get(book.publisherId));
  const inventory = await ctx.db
    .query("readyStockInventory")
    .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", variantId))
    .unique();
  const available = inventory ? inventory.quantity - (inventory.reservedQuantity ?? 0) : 0;
  if (
    !variant ||
    !variant.isAvailable ||
    !book ||
    !book.isActive ||
    book.publicationStatus !== "published" ||
    !publisher?.isActive ||
    !inventory ||
    available < quantity
  ) {
    fail("READY_STOCK_UNAVAILABLE");
  }
  const subtotalAmount = variant.priceAmount * quantity;
  if (!Number.isSafeInteger(subtotalAmount)) fail("INVOICE_TOTAL_INVALID");
  return { variant, book, publisher, quantity, subtotalAmount };
}

export const createReadyStock = mutation({
  args: { variantId: v.id("bookVariants"), quantity: v.number() },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    if (user.role !== "customer") fail("CUSTOMER_REQUIRED");
    const item = await resolveReadyStockItem(ctx, args.variantId, args.quantity);
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", user._id))
      .unique();
    const customerName = profile?.displayName || user.displayNameSnapshot || user.emailSnapshot || "BFG customer";
    const now = Date.now();
    const orderId = await ctx.db.insert("orders", {
      customerUserId: user._id,
      source: "ready_stock",
      customerName,
      customerEmail: user.emailSnapshot,
      status: "submitted",
      currency: "IDR",
      subtotalAmount: item.subtotalAmount,
      totalAmount: item.subtotalAmount,
      createdAt: now,
      updatedAt: now,
      submittedAt: now,
      editableUntil: now,
    });
    const orderItemId = await ctx.db.insert("orderItems", {
      orderId,
      bookId: item.book._id,
      bookVariantId: item.variant._id,
      bookTitleSnapshot: item.book.title,
      publisherNameSnapshot: item.publisher.name,
      formatSnapshot: item.variant.format,
      isbnSnapshot: item.variant.isbn,
      unitPriceAmountSnapshot: item.variant.priceAmount,
      currencySnapshot: "IDR",
      quantity: item.quantity,
      subtotalAmount: item.subtotalAmount,
      createdAt: now,
    });
    await reserveReadyStock(
      ctx,
      { orderId, orderItemId, bookVariantId: item.variant._id, quantity: item.quantity },
      user._id,
    );
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      toStatus: "submitted",
      changedAt: now,
      changedByUserId: user._id,
      note: "Ready Stock order created",
    });
    await recordAudit(ctx, user._id, "order.ready_stock_created", "order", orderId, {
      source: "ready_stock",
      quantity: String(item.quantity),
    });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "order.ready_stock_created",
      title: "Order Ready Stock baru",
      body: `${customerName} membuat order Ready Stock.`,
      destination: `/admin/orders/${orderId}`,
      relatedEntityType: "order",
      relatedEntityId: String(orderId),
    });
    return orderView(ctx, orderId);
  },
});

export const listEligibleCustomers = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "orders.manage");
    return (
      await ctx.db
        .query("appUsers")
        .withIndex("by_role_and_status", (index) => index.eq("role", "customer").eq("status", "active"))
        .order("desc")
        .take(200)
    ).map((user) => ({
      customerUserId: user._id,
      displayName: user.displayNameSnapshot || user.emailSnapshot || "BFG customer",
      email: user.emailSnapshot || null,
    }));
  },
});

export const createAssisted = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    catalogId: v.id("secretCatalogs"),
    submissionKey: v.string(),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "orders.manage");
    const submissionKey = requiredText(args.submissionKey, "submission key");
    if (submissionKey.length > 120) fail("VALIDATION_FAILED", "submission key is too long");
    const duplicate = await ctx.db
      .query("orders")
      .withIndex("by_assisted_submission_key", (index) => index.eq("assistedSubmissionKey", submissionKey))
      .first();
    if (duplicate) fail("ASSISTED_ORDER_DUPLICATE");
    const customer = await ctx.db.get(args.customerUserId);
    if (!customer || customer.role !== "customer" || customer.status !== "active") {
      fail("CUSTOMER_REQUIRED");
    }
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (!(await catalogIsOpen(ctx, args.catalogId))) fail("CATALOG_NOT_OPEN");
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", customer._id))
      .unique();
    const customerName =
      profile?.displayName || customer.displayNameSnapshot || customer.emailSnapshot || "BFG customer";
    const resolved = await resolveItems(ctx, args.catalogId, args.items);
    const order = await insertOrder(
      ctx,
      {
        customerUserId: customer._id,
        catalogId: args.catalogId,
        customerName,
        customerEmail: customer.emailSnapshot,
        source: "admin_assisted",
        actorUserId: actor._id,
        assistedSubmissionKey: submissionKey,
        note: "Admin-assisted order",
      },
      resolved,
      catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS,
    );
    await recordAudit(ctx, actor._id, "order.admin_assisted_created", "order", order.orderId, {
      source: "admin_assisted",
    });
    return order;
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const page = await ctx.db
      .query("orders")
      .withIndex("by_customer_user_id_and_created_at", (query) => query.eq("customerUserId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((order) => orderView(ctx, order._id))) };
  },
});

export const listForAdmin = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    const page = await ctx.db.query("orders").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((order) => orderView(ctx, order._id))) };
  },
});

export const getMine = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.own");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    return orderView(ctx, args.orderId);
  },
});

export const getForAdmin = query({
  args: { orderId: v.id("orders") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.read.all");
    if (!(await ctx.db.get(args.orderId))) fail("ORDER_NOT_FOUND");
    return orderView(ctx, args.orderId);
  },
});

export const edit = mutation({
  args: {
    orderId: v.id("orders"),
    customerName: v.string(),
    customerEmail: v.optional(v.string()),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.read.own");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    await requireOwnedResource(ctx, order.customerUserId, "ORDER_ACCESS_DENIED");
    if (order.source === "ready_stock" || !order.catalogId) fail("ORDER_LOCKED");
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
      changedByUserId: user._id,
      note: "Order edited before catalog close",
    });
    return orderView(ctx, order._id);
  },
});

export const updateStatus = mutation({
  args: {
    orderId: v.id("orders"),
    status: v.union(v.literal("cancelled"), v.literal("completed")),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("ORDER_NOT_FOUND");
    if (args.status === "cancelled") fail("CANCELLATION_REQUIRES_EXCEPTION");
    if (args.status === "completed" && (await hasUnresolvedException(ctx, order._id))) {
      fail("EXCEPTION_REQUIRES_RESOLUTION");
    }
    if (order.status !== "submitted") fail("VALIDATION_FAILED", "order transition is not allowed");
    if (args.status === "completed" && order.source === "ready_stock") {
      await fulfillReadyStockReservationsForOrder(ctx, order._id, user._id);
    }
    const now = Date.now();
    await ctx.db.patch(order._id, {
      status: args.status,
      updatedAt: now,
      cancelledAt: undefined,
    });
    await ctx.db.insert("orderStatusHistory", {
      orderId: order._id,
      fromStatus: order.status,
      toStatus: args.status,
      changedAt: now,
      changedByUserId: user._id,
    });
    await recordAudit(ctx, user._id, "order.status_changed", "order", order._id, { status: args.status });
    return orderView(ctx, order._id);
  },
});
