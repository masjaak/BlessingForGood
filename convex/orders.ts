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
import { notifyAdmins, notifyUser } from "./lib/notifications";
import { hasUnresolvedException } from "./lib/orderExceptionState";
import { fulfillReadyStockReservationsForOrder, reserveReadyStock } from "./lib/readyStockReservations";
import { positiveQuantity, requiredText } from "./lib/validation";
import { nextOrderCode } from "./lib/orderCodes";
import { enforceRateLimit } from "./lib/rateLimit";

const orderItemInput = v.object({ variantId: v.id("bookVariants"), quantity: v.number() });
type DataCtx = QueryCtx | MutationCtx;
type ReadyStockStage =
  | "auth"
  | "customer"
  | "rate_limit"
  | "deduplication"
  | "product"
  | "stock"
  | "availability"
  | "reference"
  | "order"
  | "reservation"
  | "audit"
  | "activity"
  | "complete";
type ReadyStockDiagnosticValue = string | number | boolean | null;

function readyStockCorrelationId() {
  return globalThis.crypto.randomUUID();
}

function logReadyStockStage(
  correlationId: string,
  stage: ReadyStockStage,
  fields: Record<string, ReadyStockDiagnosticValue> = {},
) {
  console.log("ready_stock_attempt_stage", { correlationId, stage, ...fields });
}

function readyStockErrorDetails(error: unknown) {
  const data =
    typeof error === "object" && error !== null && "data" in error ? (error as { data?: unknown }).data : undefined;
  const errorCode =
    typeof data === "object" && data !== null && "code" in data && typeof data.code === "string" ? data.code : null;
  return { errorClass: error instanceof Error ? error.name : typeof error, errorCode };
}

function logReadyStockFailure(correlationId: string, stage: ReadyStockStage, source: string, error: unknown) {
  console.error("ready_stock_attempt_failed", {
    correlationId,
    stage,
    source,
    ...readyStockErrorDetails(error),
  });
}

function logReadyStockStarted(correlationId: string, source: string) {
  console.log("ready_stock_attempt_started", { correlationId, stage: "auth", source });
}

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
  const [customer, items, history] = await Promise.all([
    ctx.db.get(order.customerUserId),
    ctx.db
      .query("orderItems")
      .withIndex("by_order", (query) => query.eq("orderId", orderId))
      .order("asc")
      .take(200),
    ctx.db
      .query("orderStatusHistory")
      .withIndex("by_order_and_changed_at", (query) => query.eq("orderId", orderId))
      .order("asc")
      .take(100),
  ]);
  return {
    orderId: order._id,
    id: order._id,
    customerUserId: order.customerUserId,
    catalogId: order.catalogId ?? null,
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerMemberCode: customer?.memberCode ?? null,
    orderCode: order.orderCode || null,
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
  const orderCode = await nextOrderCode(ctx, now);
  const orderId = await ctx.db.insert("orders", {
    customerUserId: input.customerUserId,
    catalogId: input.catalogId,
    source: input.source,
    assistedSubmissionKey: input.assistedSubmissionKey,
    orderCode,
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
    await enforceRateLimit(ctx, "orderSubmitUser", String(user._id));
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

async function resolveReadyStockItem(
  ctx: MutationCtx,
  variantId: Id<"bookVariants">,
  quantityInput: number,
  reportStage: (stage: ReadyStockStage, fields?: Record<string, ReadyStockDiagnosticValue>) => void,
) {
  const quantity = positiveQuantity(quantityInput);
  const variant = await ctx.db.get(variantId);
  const book = variant && (await ctx.db.get(variant.bookId));
  const publisher = book && (await ctx.db.get(book.publisherId));
  const inventory = await ctx.db
    .query("readyStockInventory")
    .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", variantId))
    .unique();
  const available = inventory ? inventory.quantity - (inventory.reservedQuantity ?? 0) : 0;
  reportStage("product", {
    variantRecordExists: Boolean(variant),
    variantActive: variant?.isAvailable ?? false,
    bookRecordExists: Boolean(book),
    bookActive: book?.isActive ?? false,
    bookPublished: book?.publicationStatus === "published",
    publisherRecordExists: Boolean(publisher),
    publisherActive: publisher?.isActive ?? false,
  });
  reportStage("stock", {
    inventoryRecordExists: Boolean(inventory),
    requestedQty: quantity,
    onHand: inventory?.quantity ?? 0,
    reserved: inventory?.reservedQuantity ?? 0,
    available,
  });
  if (
    !variant ||
    !variant.isAvailable ||
    !book ||
    !book.isActive ||
    book.publicationStatus !== "published" ||
    !publisher?.isActive ||
    !inventory
  ) {
    fail("READY_STOCK_UNAVAILABLE", "Stok baru saja habis.");
  }
  reportStage("availability", {
    requestedQty: quantity,
    onHand: inventory.quantity,
    reserved: inventory.reservedQuantity ?? 0,
    available,
  });
  if (available < quantity) {
    fail("READY_STOCK_UNAVAILABLE", available > 0 ? "Jumlah melebihi stok." : "Stok baru saja habis.");
  }
  const subtotalAmount = variant.priceAmount * quantity;
  if (!Number.isSafeInteger(subtotalAmount)) fail("INVOICE_TOTAL_INVALID");
  return { variant, book, publisher, quantity, subtotalAmount };
}

async function createReadyStockOrder(
  ctx: MutationCtx,
  input: {
    actorUserId: Id<"appUsers">;
    customerUserId: Id<"appUsers">;
    variantId: Id<"bookVariants">;
    quantity: number;
    submissionKey?: string;
    assisted: boolean;
    correlationId: string;
  },
) {
  let stage: ReadyStockStage = "product";
  const reportStage = (nextStage: ReadyStockStage, fields: Record<string, ReadyStockDiagnosticValue> = {}) => {
    stage = nextStage;
    logReadyStockStage(input.correlationId, nextStage, fields);
  };
  try {
    const item = await resolveReadyStockItem(ctx, input.variantId, input.quantity, reportStage);
    reportStage("customer");
    const customer = await ctx.db.get(input.customerUserId);
    logReadyStockStage(input.correlationId, "customer", {
      customerRecordExists: Boolean(customer),
      customerIsCustomer: customer?.role === "customer",
      customerIsActive: customer?.status === "active",
    });
    if (!customer || customer.role !== "customer" || customer.status !== "active") fail("CUSTOMER_REQUIRED");
    const profile = await ctx.db
      .query("customerProfiles")
      .withIndex("by_user_id", (index) => index.eq("userId", input.customerUserId))
      .unique();
    const customerName =
      profile?.displayName || customer.displayNameSnapshot || customer.emailSnapshot || "BFG customer";
    const now = Date.now();
    reportStage("reference");
    const orderCode = await nextOrderCode(ctx, now);
    reportStage("order");
    const orderId = await ctx.db.insert("orders", {
      customerUserId: input.customerUserId,
      source: "ready_stock",
      assistedSubmissionKey: input.submissionKey,
      orderCode,
      customerName,
      customerEmail: customer.emailSnapshot,
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
    reportStage("reservation");
    await reserveReadyStock(
      ctx,
      { orderId, orderItemId, bookVariantId: item.variant._id, quantity: item.quantity },
      input.actorUserId,
    );
    reportStage("audit");
    await ctx.db.insert("orderStatusHistory", {
      orderId,
      toStatus: "submitted",
      changedAt: now,
      changedByUserId: input.actorUserId,
      note: input.assisted ? "Admin-assisted Ready Stock order" : "Ready Stock order created",
    });
    await recordAudit(
      ctx,
      input.actorUserId,
      input.assisted ? "order.admin_assisted_created" : "order.ready_stock_created",
      "order",
      orderId,
      { source: "ready_stock", forCustomerUserId: String(input.customerUserId), quantity: String(item.quantity) },
    );
    reportStage("activity", { target: "admin" });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "order.ready_stock_created",
      title: "Order Ready Stock baru",
      body: customerName + " membuat order Ready Stock.",
      destination: "/admin/orders/" + orderId,
      relatedEntityType: "order",
      relatedEntityId: String(orderId),
    });
    reportStage("activity", { target: "customer" });
    await notifyUser(ctx, input.customerUserId, {
      surface: "notification",
      eventType: "order.ready_stock_created",
      title: "Pesanan Ready Stock tercatat",
      body: "Pesanan Ready Stock berhasil dicatat dan stok sudah diamankan.",
      destination: "/account/orders/" + orderId,
      relatedEntityType: "order",
      relatedEntityId: String(orderId),
    });
    reportStage("complete", { orderCreated: true, reservationCreated: true, activityCreated: true });
    return orderView(ctx, orderId);
  } catch (error) {
    logReadyStockFailure(input.correlationId, stage, input.assisted ? "admin_assisted" : "customer", error);
    throw error;
  }
}

export const createReadyStock = mutation({
  args: { variantId: v.id("bookVariants"), quantity: v.number() },
  handler: async (ctx, args) => {
    const correlationId = readyStockCorrelationId();
    let stage: ReadyStockStage = "auth";
    logReadyStockStarted(correlationId, "customer");
    try {
      const user = await requireActiveUser(ctx);
      stage = "customer";
      logReadyStockStage(correlationId, stage, {
        appUserExists: true,
        customerRole: user.role === "customer",
        customerActive: user.status === "active",
      });
      if (user.role !== "customer") fail("CUSTOMER_REQUIRED");
      stage = "rate_limit";
      logReadyStockStage(correlationId, stage);
      await enforceRateLimit(ctx, "readyStockOrderUser", String(user._id));
      stage = "product";
      return createReadyStockOrder(ctx, {
        actorUserId: user._id,
        customerUserId: user._id,
        variantId: args.variantId,
        quantity: args.quantity,
        assisted: false,
        correlationId,
      });
    } catch (error) {
      if (stage !== "product") logReadyStockFailure(correlationId, stage, "customer", error);
      throw error;
    }
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
      memberCode: user.memberCode || null,
    }));
  },
});

export const createAssisted = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    catalogId: v.optional(v.id("secretCatalogs")),
    source: v.optional(v.union(v.literal("preorder"), v.literal("ready_stock"))),
    submissionKey: v.string(),
    items: v.array(orderItemInput),
  },
  handler: async (ctx, args) => {
    const isReadyStock = args.source === "ready_stock";
    const correlationId = isReadyStock ? readyStockCorrelationId() : null;
    let stage: ReadyStockStage = "auth";
    if (correlationId) logReadyStockStarted(correlationId, "admin_assisted");
    try {
      const actor = await requirePermission(ctx, "orders.manage");
      const submissionKey = requiredText(args.submissionKey, "submission key");
      stage = "deduplication";
      if (correlationId) logReadyStockStage(correlationId, stage);
      if (submissionKey.length > 120) fail("VALIDATION_FAILED", "submission key is too long");
      const duplicate = await ctx.db
        .query("orders")
        .withIndex("by_assisted_submission_key", (index) => index.eq("assistedSubmissionKey", submissionKey))
        .first();
      if (duplicate) fail("ASSISTED_ORDER_DUPLICATE");
      stage = "customer";
      const customer = await ctx.db.get(args.customerUserId);
      if (correlationId) {
        logReadyStockStage(correlationId, stage, {
          customerRecordExists: Boolean(customer),
          customerIsCustomer: customer?.role === "customer",
          customerIsActive: customer?.status === "active",
        });
      }
      if (!customer || customer.role !== "customer" || customer.status !== "active") {
        fail("CUSTOMER_REQUIRED");
      }
      if (args.source === "ready_stock") {
        stage = "product";
        if (args.catalogId || args.items.length !== 1) {
          fail("VALIDATION_FAILED", "Ready Stock needs one variant without a catalog");
        }
        return createReadyStockOrder(ctx, {
          actorUserId: actor._id,
          customerUserId: customer._id,
          variantId: args.items[0].variantId,
          quantity: args.items[0].quantity,
          submissionKey,
          assisted: true,
          correlationId: correlationId as string,
        });
      }
      if (!args.catalogId) fail("CATALOG_NOT_FOUND");
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
    } catch (error) {
      if (correlationId && stage !== "product") logReadyStockFailure(correlationId, stage, "admin_assisted", error);
      throw error;
    }
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

export const backfillOrderCodes = mutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "orders.manage");
    const limit = Math.min(Math.max(Math.floor(args.limit || 200), 1), 2000);
    // ponytail: bounded one-time migration; rerun after the ceiling if BFG exceeds 2,000 legacy orders.
    const orders = await ctx.db.query("orders").withIndex("by_created_at").order("asc").take(2000);
    const missing = orders.filter((order) => !order.orderCode).slice(0, limit);
    let updated = 0;
    for (const order of missing) {
      const orderCode = await nextOrderCode(ctx, order.createdAt);
      await ctx.db.patch(order._id, { orderCode, updatedAt: Date.now() });
      await recordAudit(ctx, user._id, "order.reference_backfilled", "order", order._id, { orderCode });
      updated += 1;
    }
    return {
      updated,
      scanned: orders.length,
      hasMore: orders.some((order) => !order.orderCode) && missing.length === limit,
    };
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
