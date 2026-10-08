import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requireActiveCustomer, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";

const statusValidator = v.union(v.literal("active"), v.literal("arrived"), v.literal("cancelled"));
const queueStatusValidator = v.union(
  v.literal("all"),
  v.literal("unbilled"),
  v.literal("awaiting_payment"),
  v.literal("payment_submitted"),
  v.literal("paid"),
  v.literal("paid_waiting_arrival"),
  v.literal("received"),
);

function normalizedTitle(value: string) {
  const title = value.trim();
  if (!title || title.length > 200) fail("VALIDATION_FAILED", "manual PO title is invalid");
  return title;
}

function normalizedEta(value: string) {
  const etaText = value.trim();
  if (!etaText || etaText.length > 120) fail("VALIDATION_FAILED", "manual PO ETA is invalid");
  return etaText;
}

function normalizedPrice(value: number) {
  if (!Number.isSafeInteger(value) || value <= 0 || value > 1_000_000_000)
    fail("VALIDATION_FAILED", "manual PO price is invalid");
  return value;
}

function view(entry: Doc<"manualPoEntries">) {
  return {
    entryId: entry._id,
    customerUserId: entry.customerUserId,
    title: entry.title,
    priceAmount: entry.priceAmount,
    etaText: entry.etaText,
    status: entry.status,
    billingStatus: entry.billingStatus ?? "unbilled",
    invoiceId: entry.invoiceId ?? null,
    billedAt: entry.billedAt ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    cancelledAt: entry.cancelledAt ?? null,
    archivedAt: entry.archivedAt ?? null,
  };
}

async function targetCustomer(ctx: QueryCtx | MutationCtx, customerUserId: Id<"appUsers">, requireActive = false) {
  const customer = await ctx.db.get(customerUserId);
  if (!customer || customer.role !== "customer" || customer.status === "removed") fail("USER_NOT_FOUND");
  if (requireActive && customer.status !== "active") fail("USER_SUSPENDED");
  return customer;
}

async function targetEntry(ctx: QueryCtx | MutationCtx, entryId: Id<"manualPoEntries">) {
  const entry = await ctx.db.get(entryId);
  if (!entry) fail("VALIDATION_FAILED", "manual PO entry does not exist");
  return entry;
}

function operationalStatus(entry: Doc<"manualPoEntries">, invoice: Doc<"invoices"> | null | undefined) {
  if (entry.status === "arrived") return "received" as const;
  if (!invoice || invoice.status === "void") return "unbilled" as const;
  if (invoice.paymentStatus === "paid") return "paid_waiting_arrival" as const;
  if (invoice.paymentStatus === "payment_submitted") return "payment_submitted" as const;
  return "awaiting_payment" as const;
}

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const customer = await requirePermission(ctx, "orders.read.own");
    const entries = await ctx.db
      .query("manualPoEntries")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", customer._id))
      .order("desc")
      .take(200);
    const visible = entries.filter((entry) => !entry.archivedAt && entry.status !== "cancelled");
    return Promise.all(
      visible.map(async (entry) => {
        const invoice = entry.invoiceId ? await ctx.db.get(entry.invoiceId) : null;
        return {
          ...view(entry),
          invoiceStatus: invoice?.status ?? null,
          paymentStatus: invoice?.paymentStatus ?? null,
          outstandingAmount: invoice?.status === "void" ? 0 : (invoice?.outstandingAmount ?? 0),
          operationalStatus: operationalStatus(entry, invoice),
        };
      }),
    );
  },
});

export const listBilledMine = query({
  args: {},
  handler: async (ctx) => {
    const customer = await requireActiveCustomer(ctx);
    const entries = await ctx.db
      .query("manualPoEntries")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", customer._id))
      .order("desc")
      .take(200);
    return entries
      .filter(
        (entry) =>
          !entry.archivedAt && entry.status !== "cancelled" && (entry.billingStatus ?? "unbilled") === "billed",
      )
      .map(view);
  },
});

export const listForAdmin = query({
  args: {
    customerUserId: v.id("appUsers"),
    includeArchived: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    await targetCustomer(ctx, args.customerUserId);
    const entries = await ctx.db
      .query("manualPoEntries")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", args.customerUserId))
      .order("desc")
      .take(500);
    const visible = entries.filter((entry) =>
      args.includeArchived ? true : !entry.archivedAt && entry.status !== "cancelled",
    );
    return Promise.all(
      visible.map(async (entry) => {
        const invoice = entry.invoiceId ? await ctx.db.get(entry.invoiceId) : null;
        return {
          ...view(entry),
          invoiceStatus: invoice?.status ?? null,
          paymentStatus: invoice?.paymentStatus ?? null,
          outstandingAmount: invoice?.status === "void" ? 0 : (invoice?.outstandingAmount ?? 0),
          operationalStatus: operationalStatus(entry, invoice),
        };
      }),
    );
  },
});

export const listQueueForAdmin = query({
  args: {
    search: v.optional(v.string()),
    status: v.optional(queueStatusValidator),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    const rawEntries = await ctx.db.query("manualPoEntries").withIndex("by_created_at").order("desc").take(501);
    const truncated = rawEntries.length > 500;
    const entries = rawEntries.slice(0, 500).filter((entry) => !entry.archivedAt && entry.status !== "cancelled");

    const customerIds = [...new Set(entries.map((entry) => String(entry.customerUserId)))];
    const invoiceIds = [
      ...new Set(
        entries.map((entry) => entry.invoiceId).filter((invoiceId): invoiceId is Id<"invoices"> => Boolean(invoiceId)),
      ),
    ];

    const customerPairs = await Promise.all(
      customerIds.map(async (customerId) => {
        const customer = await ctx.db.get(customerId as Id<"appUsers">);
        const profile = customer
          ? await ctx.db
              .query("customerProfiles")
              .withIndex("by_user_id", (index) => index.eq("userId", customer._id))
              .unique()
          : null;
        return [customerId, { customer, profile }] as const;
      }),
    );
    const invoicePairs = await Promise.all(
      invoiceIds.map(async (invoiceId) => [String(invoiceId), await ctx.db.get(invoiceId)] as const),
    );
    const customerMap = new Map(customerPairs);
    const invoiceMap = new Map(invoicePairs);
    const search = args.search?.trim().toLowerCase() ?? "";
    const statusFilter = args.status ?? "all";

    const rows = entries
      .map((entry) => {
        const customerRecord = customerMap.get(String(entry.customerUserId));
        const customer = customerRecord?.customer;
        if (!customer || customer.role !== "customer" || customer.status === "removed") return null;
        const profile = customerRecord?.profile;
        const invoice = entry.invoiceId ? (invoiceMap.get(String(entry.invoiceId)) ?? null) : null;
        const displayName =
          profile?.displayName || customer.displayNameSnapshot || customer.emailSnapshot || "BFG customer";
        const email = customer.emailSnapshot ?? null;
        const memberCode = customer.memberCode ?? null;
        const queueStatus = operationalStatus(entry, invoice);
        const searchable = [displayName, email, memberCode, entry.title, entry.etaText]
          .filter((value): value is string => Boolean(value))
          .join(" ")
          .toLowerCase();
        if (search && !searchable.includes(search)) return null;
        const normalizedStatusFilter = statusFilter === "paid" ? "paid_waiting_arrival" : statusFilter;
        if (normalizedStatusFilter !== "all" && queueStatus !== normalizedStatusFilter) return null;
        return {
          entryId: entry._id,
          customerUserId: entry.customerUserId,
          customerName: displayName,
          customerEmail: email,
          memberCode,
          title: entry.title,
          priceAmount: entry.priceAmount,
          etaText: entry.etaText,
          queueStatus,
          invoiceId: invoice?.status === "void" ? null : (entry.invoiceId ?? null),
          invoiceNumber: invoice?.status === "void" ? null : (invoice?.invoiceNumber ?? null),
          invoiceStatus: invoice?.status === "void" ? null : (invoice?.status ?? null),
          paymentStatus: invoice?.status === "void" ? null : (invoice?.paymentStatus ?? null),
          outstandingAmount: invoice?.status === "void" ? 0 : (invoice?.outstandingAmount ?? 0),
          createdAt: entry.createdAt,
          updatedAt: entry.updatedAt,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const summarySource = entries
      .map((entry) => {
        const customerRecord = customerMap.get(String(entry.customerUserId));
        const customer = customerRecord?.customer;
        if (!customer || customer.role !== "customer" || customer.status === "removed") return null;
        const invoice = entry.invoiceId ? (invoiceMap.get(String(entry.invoiceId)) ?? null) : null;
        const queueStatus = operationalStatus(entry, invoice);
        return {
          customerUserId: entry.customerUserId,
          priceAmount: entry.priceAmount,
          queueStatus,
          outstandingAmount: invoice?.status === "void" ? 0 : (invoice?.outstandingAmount ?? 0),
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row));

    const grouped = new Map<
      string,
      {
        customerUserId: Id<"appUsers">;
        customerName: string;
        customerEmail: string | null;
        memberCode: string | null;
        latestCreatedAt: number;
        itemCount: number;
        totalAmount: number;
        unbilledCount: number;
        awaitingPaymentCount: number;
        paymentSubmittedCount: number;
        paidCount: number;
        receivedCount: number;
        entries: typeof rows;
      }
    >();
    for (const row of rows) {
      const key = String(row.customerUserId);
      const current = grouped.get(key) ?? {
        customerUserId: row.customerUserId,
        customerName: row.customerName,
        customerEmail: row.customerEmail,
        memberCode: row.memberCode,
        latestCreatedAt: row.createdAt,
        itemCount: 0,
        totalAmount: 0,
        unbilledCount: 0,
        awaitingPaymentCount: 0,
        paymentSubmittedCount: 0,
        paidCount: 0,
        receivedCount: 0,
        entries: [],
      };
      current.latestCreatedAt = Math.max(current.latestCreatedAt, row.createdAt);
      current.itemCount += 1;
      current.totalAmount += row.priceAmount;
      if (row.queueStatus === "unbilled") current.unbilledCount += 1;
      if (row.queueStatus === "awaiting_payment") current.awaitingPaymentCount += 1;
      if (row.queueStatus === "payment_submitted") current.paymentSubmittedCount += 1;
      if (row.queueStatus === "paid_waiting_arrival") current.paidCount += 1;
      if (row.queueStatus === "received") current.receivedCount += 1;
      current.entries.push(row);
      grouped.set(key, current);
    }

    return {
      customers: [...grouped.values()].sort((left, right) => right.latestCreatedAt - left.latestCreatedAt),
      summary: {
        customerCount: new Set(summarySource.map((row) => String(row.customerUserId))).size,
        itemCount: summarySource.length,
        totalAmount: summarySource.reduce((sum, row) => sum + row.priceAmount, 0),
        unbilledCount: summarySource.filter((row) => row.queueStatus === "unbilled").length,
        awaitingPaymentCount: summarySource.filter((row) => row.queueStatus === "awaiting_payment").length,
        paymentSubmittedCount: summarySource.filter((row) => row.queueStatus === "payment_submitted").length,
        paidCount: summarySource.filter((row) => row.queueStatus === "paid_waiting_arrival").length,
        receivedCount: summarySource.filter((row) => row.queueStatus === "received").length,
        outstandingAmount: summarySource.reduce((sum, row) => sum + row.outstandingAmount, 0),
      },
      truncated,
    };
  },
});

export const create = mutation({
  args: {
    customerUserId: v.id("appUsers"),
    title: v.string(),
    priceAmount: v.number(),
    etaText: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "customers.manage");
    await targetCustomer(ctx, args.customerUserId, true);
    const now = Date.now();
    const entryId = await ctx.db.insert("manualPoEntries", {
      customerUserId: args.customerUserId,
      title: normalizedTitle(args.title),
      priceAmount: normalizedPrice(args.priceAmount),
      etaText: normalizedEta(args.etaText),
      status: "active",
      billingStatus: "unbilled",
      createdByUserId: actor._id,
      updatedByUserId: actor._id,
      createdAt: now,
      updatedAt: now,
    });
    await recordAudit(ctx, actor._id, "manual_po.created", "manualPoEntry", entryId, {
      customerUserId: String(args.customerUserId),
      status: "active",
    });
    const entry = await ctx.db.get(entryId);
    if (!entry) fail("VALIDATION_FAILED", "manual PO entry missing after create");
    return view(entry);
  },
});

export const update = mutation({
  args: {
    entryId: v.id("manualPoEntries"),
    title: v.string(),
    priceAmount: v.number(),
    etaText: v.string(),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "customers.manage");
    const entry = await targetEntry(ctx, args.entryId);
    if (entry.archivedAt) fail("VALIDATION_FAILED", "archived manual PO cannot be edited");
    await ctx.db.patch(entry._id, {
      title: normalizedTitle(args.title),
      priceAmount: normalizedPrice(args.priceAmount),
      etaText: normalizedEta(args.etaText),
      updatedByUserId: actor._id,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, actor._id, "manual_po.updated", "manualPoEntry", entry._id, {
      customerUserId: String(entry.customerUserId),
      status: entry.status,
    });
    const updated = await ctx.db.get(entry._id);
    if (!updated) fail("VALIDATION_FAILED", "manual PO entry missing after update");
    return view(updated);
  },
});

export const setStatus = mutation({
  args: {
    entryId: v.id("manualPoEntries"),
    status: statusValidator,
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "customers.manage");
    const entry = await targetEntry(ctx, args.entryId);
    if (entry.archivedAt) fail("VALIDATION_FAILED", "archived manual PO cannot change status");
    if (entry.status === args.status) return view(entry);
    const now = Date.now();
    await ctx.db.patch(entry._id, {
      status: args.status,
      cancelledAt: args.status === "cancelled" ? now : undefined,
      updatedByUserId: actor._id,
      updatedAt: now,
    });
    await recordAudit(ctx, actor._id, "manual_po.status_changed", "manualPoEntry", entry._id, {
      customerUserId: String(entry.customerUserId),
      status: args.status,
    });
    const updated = await ctx.db.get(entry._id);
    if (!updated) fail("VALIDATION_FAILED", "manual PO entry missing after status change");
    return view(updated);
  },
});

export const setBillingStatus = mutation({
  args: {
    entryId: v.id("manualPoEntries"),
    billingStatus: v.union(v.literal("unbilled"), v.literal("billed")),
  },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "invoices.manage");
    const entry = await targetEntry(ctx, args.entryId);
    if (entry.archivedAt) fail("VALIDATION_FAILED", "archived manual PO cannot change billing status");
    if (entry.status === "cancelled") fail("VALIDATION_FAILED", "cancelled manual PO cannot be billed");
    const current = entry.billingStatus ?? "unbilled";
    if (current === args.billingStatus) return view(entry);
    const now = Date.now();
    await ctx.db.patch(entry._id, {
      billingStatus: args.billingStatus,
      billedAt: args.billingStatus === "billed" ? now : undefined,
      billedByUserId: args.billingStatus === "billed" ? actor._id : undefined,
      updatedByUserId: actor._id,
      updatedAt: now,
    });
    await recordAudit(
      ctx,
      actor._id,
      args.billingStatus === "billed" ? "manual_po.billed" : "manual_po.billing_reverted",
      "manualPoEntry",
      entry._id,
      {
        customerUserId: String(entry.customerUserId),
        billingStatus: args.billingStatus,
      },
    );
    const updated = await ctx.db.get(entry._id);
    if (!updated) fail("VALIDATION_FAILED", "manual PO entry missing after billing update");
    return view(updated);
  },
});

export const archive = mutation({
  args: { entryId: v.id("manualPoEntries") },
  handler: async (ctx, args) => {
    const actor = await requirePermission(ctx, "customers.manage");
    const entry = await targetEntry(ctx, args.entryId);
    if (entry.archivedAt) return view(entry);
    const now = Date.now();
    await ctx.db.patch(entry._id, {
      archivedAt: now,
      updatedByUserId: actor._id,
      updatedAt: now,
    });
    await recordAudit(ctx, actor._id, "manual_po.archived", "manualPoEntry", entry._id, {
      customerUserId: String(entry.customerUserId),
      status: entry.status,
    });
    const updated = await ctx.db.get(entry._id);
    if (!updated) fail("VALIDATION_FAILED", "manual PO entry missing after archive");
    return view(updated);
  },
});
