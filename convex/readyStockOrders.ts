import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveCustomer, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { nextInvoiceNumber } from "./lib/invoiceNumbers";
import { notifyAdmins, notifyUser } from "./lib/notifications";
import { enforceRateLimit } from "./lib/rateLimit";
import { positiveQuantity, requiredText } from "./lib/validation";

type DataCtx = QueryCtx | MutationCtx;
const adminStageValidator = v.union(v.literal("packing"), v.literal("shipping"), v.literal("delivered"));
const operationalStatusValidator = v.union(
  v.literal("waiting_payment"),
  v.literal("verifying_payment"),
  v.literal("paid"),
  v.literal("packing"),
  v.literal("shipping"),
  v.literal("delivered"),
  v.literal("cancelled"),
);

const TIMELINE = [
  { key: "waiting_payment", label: "Blessy menunggu pembayaran" },
  { key: "verifying_payment", label: "Blessy memverifikasi pembayaran" },
  { key: "paid", label: "Pembayaran berhasil" },
  { key: "packing", label: "Paket sedang dikemas Blessy" },
  { key: "shipping", label: "Paket sedang diantar Blessy" },
  { key: "delivered", label: "Paket sampai" },
] as const;

type TimelineKey = (typeof TIMELINE)[number]["key"];

function currentStatus(order: Doc<"readyStockOrders">, invoice: Doc<"invoices"> | null): TimelineKey | "cancelled" {
  if (order.stage === "cancelled") return "cancelled";
  if (order.stage === "delivered") return "delivered";
  if (order.stage === "shipping") return "shipping";
  if (order.stage === "packing") return "packing";
  if (invoice?.paymentStatus === "paid") return "paid";
  if (invoice?.paymentStatus === "payment_submitted") return "verifying_payment";
  return "waiting_payment";
}

function timelineFor(status: TimelineKey | "cancelled") {
  if (status === "cancelled") return [];
  const currentIndex = TIMELINE.findIndex((step) => step.key === status);
  return TIMELINE.map((step, index) => ({
    ...step,
    state:
      index < currentIndex
        ? ("complete" as const)
        : index === currentIndex
          ? ("current" as const)
          : ("upcoming" as const),
  }));
}

async function orderView(ctx: DataCtx, order: Doc<"readyStockOrders">) {
  const [invoice, customer] = await Promise.all([
    order.invoiceId ? ctx.db.get(order.invoiceId) : Promise.resolve(null),
    ctx.db.get(order.customerUserId),
  ]);
  const status = currentStatus(order, invoice);
  return {
    orderId: order._id,
    listingId: order.listingId,
    invoiceId: order.invoiceId ?? null,
    customerUserId: order.customerUserId,
    customerName: customer?.displayNameSnapshot || customer?.emailSnapshot || "Blessfriend",
    customerEmail: customer?.emailSnapshot ?? null,
    customerMemberCode: customer?.memberCode ?? null,
    title: order.titleSnapshot,
    format: order.formatSnapshot,
    unitPriceAmount: order.unitPriceAmountSnapshot,
    quantity: order.quantity,
    totalAmount: order.totalAmount,
    operationalStatus: status,
    timeline: timelineFor(status),
    invoiceNumber: invoice?.invoiceNumber ?? null,
    invoiceStatus: invoice?.status ?? null,
    paymentStatus: invoice?.paymentStatus ?? null,
    outstandingAmount: invoice?.outstandingAmount ?? order.totalAmount,
    shippingAddress: {
      recipientName: order.recipientName,
      recipientPhone: order.recipientPhone,
      addressLine1: order.addressLine1,
      addressLine2: order.addressLine2 ?? null,
      city: order.city,
      province: order.province,
      postalCode: order.postalCode,
    },
    createdAt: order.createdAt,
    updatedAt: order.updatedAt,
  };
}

export const checkout = mutation({
  args: { listingId: v.id("readyStockListings"), quantity: v.number(), requestKey: v.string() },
  handler: async (ctx, args) => {
    const customer = await requireActiveCustomer(ctx);
    const requestKey = requiredText(args.requestKey, "checkout request key");
    if (requestKey.length > 128) fail("VALIDATION_FAILED", "checkout request key is invalid");
    const quantity = positiveQuantity(args.quantity);
    const previous = await ctx.db
      .query("readyStockOrders")
      .withIndex("by_customer_and_request_key", (q) =>
        q.eq("customerUserId", customer._id).eq("requestKey", requestKey),
      )
      .unique();
    if (previous) {
      if (previous.listingId !== args.listingId || previous.quantity !== quantity) {
        fail("VALIDATION_FAILED", "checkout request key is already used");
      }
      return orderView(ctx, previous);
    }
    await enforceRateLimit(ctx, "readyStockOrderUser", String(customer._id));
    const listing = await ctx.db.get(args.listingId);
    if (!listing || listing.status !== "published") fail("READY_STOCK_UNAVAILABLE");
    const available = listing.quantity - listing.reservedQuantity;
    if (available < quantity)
      fail("READY_STOCK_UNAVAILABLE", available > 0 ? "Jumlah melebihi stok." : "Stok baru saja habis.");

    const address =
      (await ctx.db
        .query("customerAddresses")
        .withIndex("by_user_id_and_default", (q) => q.eq("userId", customer._id).eq("isDefault", true))
        .first()) ||
      (await ctx.db
        .query("customerAddresses")
        .withIndex("by_user_id", (q) => q.eq("userId", customer._id))
        .first());
    if (!address) fail("VALIDATION_FAILED", "Tambahkan alamat pengiriman sebelum checkout Ready Stock");

    const totalAmount = listing.priceAmount * quantity;
    if (!Number.isSafeInteger(totalAmount) || totalAmount <= 0) fail("INVOICE_TOTAL_INVALID");
    const now = Date.now();

    const orderId = await ctx.db.insert("readyStockOrders", {
      customerUserId: customer._id,
      requestKey,
      listingId: listing._id,
      titleSnapshot: listing.title,
      formatSnapshot: listing.format,
      unitPriceAmountSnapshot: listing.priceAmount,
      quantity,
      totalAmount,
      stage: "waiting_payment",
      recipientName: address.recipientName,
      recipientPhone: address.phone,
      addressLine1: address.addressLine1,
      addressLine2: address.addressLine2,
      city: address.city,
      province: address.province,
      postalCode: address.postalCode,
      createdAt: now,
      updatedAt: now,
      createdByUserId: customer._id,
    });
    await ctx.db.patch(listing._id, {
      reservedQuantity: listing.reservedQuantity + quantity,
      updatedAt: now,
      updatedByUserId: customer._id,
    });
    await ctx.db.insert("readyStockOrderEvents", {
      orderId,
      stage: "waiting_payment",
      actorUserId: customer._id,
      note: "Checkout Ready Stock dibuat",
      createdAt: now,
    });

    const invoiceNumber = await nextInvoiceNumber(ctx, now);
    const invoiceId = await ctx.db.insert("invoices", {
      readyStockOrderId: orderId,
      customerUserId: customer._id,
      invoiceNumber,
      status: "issued",
      currency: "IDR",
      subtotalAmount: totalAmount,
      totalAmount,
      adjustedTotalAmount: totalAmount,
      financialAdjustmentAmount: 0,
      depositRequirementMode: "none",
      depositRequiredAmount: 0,
      allocatedDepositAmount: 0,
      verifiedPaymentAmount: 0,
      outstandingAmount: totalAmount,
      overpaymentAmount: 0,
      refundObligationAmount: 0,
      refundObligationStatus: "none",
      paymentStatus: "unpaid",
      createdAt: now,
      updatedAt: now,
      issuedAt: now,
      createdByUserId: customer._id,
    });
    await ctx.db.insert("invoiceItems", {
      invoiceId,
      readyStockOrderId: orderId,
      descriptionSnapshot: `${listing.title} · ${listing.format} · Ready Stock`,
      bookTitleSnapshot: listing.title,
      formatSnapshot: listing.format,
      quantity,
      unitPriceAmountSnapshot: listing.priceAmount,
      subtotalAmount: totalAmount,
      createdAt: now,
    });
    await ctx.db.patch(orderId, { invoiceId, updatedAt: now });

    await recordAudit(ctx, customer._id, "ready_stock_order.created", "readyStockOrder", orderId, {
      listingId: String(listing._id),
      quantity: String(quantity),
      totalAmount: String(totalAmount),
    });
    await recordAudit(ctx, customer._id, "invoice.issued", "invoice", invoiceId, {
      source: "ready_stock",
      readyStockOrderId: String(orderId),
    });
    await notifyUser(ctx, customer._id, {
      surface: "notification",
      eventType: "ready_stock.order_created",
      title: "Ready Stock berhasil dicheckout",
      body: `Tagihan ${invoiceNumber} sudah tersedia. Blessy menunggu pembayaranmu.`,
      destination: "/account/orders",
      relatedEntityType: "readyStockOrder",
      relatedEntityId: String(orderId),
    });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "ready_stock.order_created",
      title: "Order Ready Stock baru",
      body: `${customer.displayNameSnapshot || customer.emailSnapshot || "Blessfriend"} checkout ${listing.title}.`,
      destination: "/admin/ready-stock",
      relatedEntityType: "readyStockOrder",
      relatedEntityId: String(orderId),
    });
    const created = await ctx.db.get(orderId);
    if (!created) fail("VALIDATION_FAILED", "Ready Stock order tidak ditemukan");
    return orderView(ctx, created);
  },
});

export const listMine = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const customer = await requireActiveCustomer(ctx);
    const page = await ctx.db
      .query("readyStockOrders")
      .withIndex("by_customer_and_created_at", (q) => q.eq("customerUserId", customer._id))
      .order("desc")
      .paginate(args.paginationOpts);
    return { ...page, page: await Promise.all(page.page.map((order) => orderView(ctx, order))) };
  },
});

export const listForAdmin = query({
  args: { search: v.optional(v.string()), status: v.optional(operationalStatusValidator) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "orders.manage");
    const rows = await ctx.db.query("readyStockOrders").withIndex("by_created_at").order("desc").take(500);
    const views = await Promise.all(rows.map((order) => orderView(ctx, order)));
    const search = args.search?.trim().toLowerCase() || "";
    return views.filter((row) => {
      if (args.status && row.operationalStatus !== args.status) return false;
      if (!search) return true;
      return [row.customerName, row.customerEmail, row.customerMemberCode, row.title, row.invoiceNumber]
        .filter((value): value is string => Boolean(value))
        .some((value) => value.toLowerCase().includes(search));
    });
  },
});

export const updateStage = mutation({
  args: { orderId: v.id("readyStockOrders"), stage: adminStageValidator },
  handler: async (ctx, args) => {
    const admin = await requirePermission(ctx, "orders.manage");
    const order = await ctx.db.get(args.orderId);
    if (!order) fail("VALIDATION_FAILED", "Ready Stock order tidak ditemukan");
    const invoice = order.invoiceId ? await ctx.db.get(order.invoiceId) : null;
    if (!invoice || invoice.status === "void" || invoice.paymentStatus !== "paid") {
      fail("INVOICE_INVALID_STATE", "Pembayaran Ready Stock belum lunas");
    }
    const allowed =
      (order.stage === "waiting_payment" && args.stage === "packing") ||
      (order.stage === "paid" && args.stage === "packing") ||
      (order.stage === "packing" && args.stage === "shipping") ||
      (order.stage === "shipping" && args.stage === "delivered");
    if (!allowed) fail("VALIDATION_FAILED", "Tahap Ready Stock tidak dapat dilewati");

    const now = Date.now();
    if (args.stage === "delivered") {
      const listing = await ctx.db.get(order.listingId);
      if (!listing || listing.reservedQuantity < order.quantity || listing.quantity < order.quantity) {
        fail("READY_STOCK_UNAVAILABLE");
      }
      await ctx.db.patch(listing._id, {
        quantity: listing.quantity - order.quantity,
        reservedQuantity: listing.reservedQuantity - order.quantity,
        updatedAt: now,
        updatedByUserId: admin._id,
      });
    }
    await ctx.db.patch(order._id, { stage: args.stage, updatedAt: now });
    await ctx.db.insert("readyStockOrderEvents", {
      orderId: order._id,
      stage: args.stage,
      actorUserId: admin._id,
      createdAt: now,
    });
    const label =
      args.stage === "packing"
        ? "Paket sedang dikemas Blessy"
        : args.stage === "shipping"
          ? "Paket sedang diantar Blessy"
          : "Paket sampai";
    await notifyUser(ctx, order.customerUserId, {
      surface: "notification",
      eventType: "ready_stock.stage_updated",
      title: label,
      body: `${order.titleSnapshot} · ${label}`,
      destination: "/account/orders",
      relatedEntityType: "readyStockOrder",
      relatedEntityId: String(order._id),
    });
    await recordAudit(ctx, admin._id, "ready_stock_order.stage_updated", "readyStockOrder", order._id, {
      stage: args.stage,
    });
    return orderView(ctx, (await ctx.db.get(order._id))!);
  },
});
