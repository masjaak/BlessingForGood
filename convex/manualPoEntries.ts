import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { requireActiveCustomer, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";

const statusValidator = v.union(v.literal("active"), v.literal("arrived"), v.literal("cancelled"));

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

export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const customer = await requireActiveCustomer(ctx);
    const entries = await ctx.db
      .query("manualPoEntries")
      .withIndex("by_customer_and_created_at", (index) => index.eq("customerUserId", customer._id))
      .order("desc")
      .take(200);
    return entries.filter((entry) => !entry.archivedAt).map(view);
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
    return entries.filter((entry) => args.includeArchived || !entry.archivedAt).map(view);
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
