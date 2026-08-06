import { mutation, query } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { v } from "convex/values";
import { constantTimeEqual } from "./lib/crypto";
import { fail } from "./lib/errors";
import { requirePreviewCapability, requirePreviewSecret } from "./lib/previewCapability";
import { findSession, requireSession, sessionDigest, SESSION_TTL_MS } from "./lib/sessions";
import { requiredText, slugify } from "./lib/validation";

const sessionRoleValidator = v.union(v.literal("customer"), v.literal("admin"));

export const createCustomer = mutation({
  args: { token: v.string() },
  returns: v.object({ role: sessionRoleValidator, expiresAt: v.number() }),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const digest = await sessionDigest(args.token);
    const existing = await ctx.db
      .query("prototypeSessions")
      .withIndex("by_token_digest", (query) => query.eq("tokenDigest", digest))
      .unique();
    const now = Date.now();
    if (existing && !existing.revokedAt && existing.expiresAt > now) {
      return { role: existing.role, expiresAt: existing.expiresAt };
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        tokenDigest: digest,
        role: "customer",
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        revokedAt: undefined,
        failedAdminAttempts: 0,
        adminLockedUntil: undefined,
      });
      return { role: "customer" as const, expiresAt: now + SESSION_TTL_MS };
    }
    const sessionId = await ctx.db.insert("prototypeSessions", {
      tokenDigest: digest,
      role: "customer",
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      failedAdminAttempts: 0,
    });
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("session creation failed");
    return { role: session.role, expiresAt: session.expiresAt };
  },
});

export const claimAdmin = mutation({
  args: { token: v.string(), accessCode: v.string() },
  returns: v.object({
    ok: v.boolean(),
    role: v.optional(sessionRoleValidator),
    expiresAt: v.optional(v.number()),
    code: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const session = await requireSession(ctx, args.token);
    if (session.role === "admin") return { ok: true, role: "admin" as const, expiresAt: session.expiresAt };

    const now = Date.now();
    if (session.adminLockedUntil && session.adminLockedUntil > now) {
      return { ok: false, code: "ADMIN_ACCESS_LOCKED" };
    }
    const expected = requirePreviewSecret("BFG_PREVIEW_ADMIN_ACCESS_CODE");
    if (!constantTimeEqual(expected, args.accessCode)) {
      const failedAdminAttempts = (session.failedAdminAttempts || 0) + 1;
      await ctx.db.patch(session._id, {
        failedAdminAttempts,
        adminLockedUntil: failedAdminAttempts >= 5 ? now + 30_000 : undefined,
      });
      return { ok: false, code: "ADMIN_CODE_INVALID" };
    }

    await ctx.db.patch(session._id, {
      role: "admin",
      failedAdminAttempts: 0,
      adminLockedUntil: undefined,
      lastSeenAt: now,
    });
    return { ok: true, role: "admin" as const, expiresAt: session.expiresAt };
  },
});

export const me = query({
  args: { token: v.string() },
  returns: v.union(v.object({ role: sessionRoleValidator, expiresAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const session = await findSession(ctx, args.token);
    if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null;
    return { role: session.role, expiresAt: session.expiresAt };
  },
});

export const cleanupTest = mutation({
  args: {
    sessionToken: v.string(),
    customerSessionToken: v.optional(v.string()),
    testId: v.string(),
    catalogId: v.optional(v.id("secretCatalogs")),
    orphanBookIds: v.optional(v.array(v.id("books"))),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async (ctx, args) => {
    const admin = await requireSession(ctx, args.sessionToken, "admin");
    const testId = requiredText(args.testId, "test id");
    if (args.orphanBookIds) {
      if (testId !== "orphan-cleanup" || !args.orphanBookIds.length) fail("TEST_CLEANUP_NOT_ALLOWED");
      for (const bookId of args.orphanBookIds) {
        const book = await ctx.db.get(bookId);
        if (!book || !/^(QA Book|CLI (smoke|shape) book)( \d+-[a-z-]+)?$/.test(book.title)) {
          fail("TEST_CLEANUP_NOT_ALLOWED");
        }
        const variants = await ctx.db
          .query("bookVariants")
          .withIndex("by_book", (query) => query.eq("bookId", book._id))
          .take(1);
        if (variants.length) fail("TEST_CLEANUP_NOT_ALLOWED");
        const publisher = await ctx.db.get(book.publisherId);
        await ctx.db.delete(book._id);
        if (publisher) {
          const remainingBooks = await ctx.db
            .query("books")
            .withIndex("by_publisher", (query) => query.eq("publisherId", publisher._id))
            .take(1);
          if (!remainingBooks.length) await ctx.db.delete(publisher._id);
        }
      }
      await ctx.db.delete(admin._id);
      return { ok: true as const };
    }
    const expectedName = `Browser QA ${testId}`;
    const allowedNames = new Set([expectedName, `CLI smoke ${testId}`, `CLI shape ${testId}`]);
    const allowedBatchNames = new Set([`Browser QA Batch ${testId}`, `CLI smoke batch ${testId}`, `CLI shape batch ${testId}`]);
    const catalogSlug = slugify(expectedName, "catalog slug");
    const catalog = args.catalogId
      ? await ctx.db.get(args.catalogId)
      : await ctx.db
          .query("secretCatalogs")
          .withIndex("by_slug", (query) => query.eq("slug", catalogSlug))
          .unique();
    if (!catalog || !allowedNames.has(catalog.name) || (!args.catalogId && catalog.createdBySessionId !== admin._id)) {
      fail("TEST_CLEANUP_NOT_ALLOWED");
    }

    const batchIds = new Set<Id<"batches">>();
    const catalogBatchLinks = await ctx.db
      .query("catalogBatchLinks")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .take(500);
    for (const link of catalogBatchLinks) {
      batchIds.add(link.batchId);
      await ctx.db.delete(link._id);
    }
    const recentBatches = await ctx.db.query("batches").withIndex("by_created_at").order("desc").take(500);
    for (const batch of recentBatches) {
      if (batch.createdBySessionId === admin._id && allowedBatchNames.has(batch.name)) batchIds.add(batch._id);
    }

    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .take(500);
    for (const grant of grants) await ctx.db.delete(grant._id);

    const accessCodes = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .take(50);
    for (const accessCode of accessCodes) await ctx.db.delete(accessCode._id);

    const catalogItems = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .take(500);
    const variantIds = new Set(catalogItems.map((item) => item.bookVariantId));
    for (const item of catalogItems) await ctx.db.delete(item._id);

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalog._id))
      .take(500);
    for (const order of orders) {
      const items = await ctx.db
        .query("orderItems")
        .withIndex("by_order", (query) => query.eq("orderId", order._id))
        .take(500);
      for (const item of items) {
        const assignments = await ctx.db
          .query("orderItemBatchAssignments")
          .withIndex("by_order_item", (query) => query.eq("orderItemId", item._id))
          .take(500);
        for (const assignment of assignments) await ctx.db.delete(assignment._id);
        await ctx.db.delete(item._id);
      }
      const history = await ctx.db
        .query("orderStatusHistory")
        .withIndex("by_order", (query) => query.eq("orderId", order._id))
        .take(500);
      for (const event of history) await ctx.db.delete(event._id);
      const fulfillmentHistory = await ctx.db
        .query("orderFulfillmentHistory")
        .withIndex("by_order", (query) => query.eq("orderId", order._id))
        .take(500);
      for (const event of fulfillmentHistory) await ctx.db.delete(event._id);
      const invoices = await ctx.db
        .query("invoices")
        .withIndex("by_order", (query) => query.eq("orderId", order._id))
        .take(500);
      for (const invoice of invoices) {
        const invoiceItems = await ctx.db
          .query("invoiceItems")
          .withIndex("by_invoice", (query) => query.eq("invoiceId", invoice._id))
          .take(500);
        for (const item of invoiceItems) await ctx.db.delete(item._id);
        const allocations = await ctx.db
          .query("invoiceDepositAllocations")
          .withIndex("by_invoice", (query) => query.eq("invoiceId", invoice._id))
          .take(500);
        for (const allocation of allocations) await ctx.db.delete(allocation._id);
        const transactions = await ctx.db
          .query("depositTransactions")
          .withIndex("by_invoice", (query) => query.eq("invoiceId", invoice._id))
          .take(500);
        for (const transaction of transactions) await ctx.db.delete(transaction._id);
        await ctx.db.delete(invoice._id);
      }
      await ctx.db.delete(order._id);
    }

    const customer = args.customerSessionToken ? await findSession(ctx, args.customerSessionToken) : null;
    if (customer) {
      const account = await ctx.db
        .query("depositAccounts")
        .withIndex("by_customer_and_currency", (query) => query.eq("customerSessionId", customer._id).eq("currency", "IDR"))
        .unique();
      if (account) {
        const transactions = await ctx.db
          .query("depositTransactions")
          .withIndex("by_account", (query) => query.eq("accountId", account._id))
          .take(500);
        for (const transaction of transactions) await ctx.db.delete(transaction._id);
        await ctx.db.delete(account._id);
      }
    }

    for (const batchId of batchIds) {
      const assignments = await ctx.db
        .query("orderItemBatchAssignments")
        .withIndex("by_batch", (query) => query.eq("batchId", batchId))
        .take(500);
      for (const assignment of assignments) await ctx.db.delete(assignment._id);
      const history = await ctx.db
        .query("batchStatusHistory")
        .withIndex("by_batch", (query) => query.eq("batchId", batchId))
        .take(500);
      for (const event of history) await ctx.db.delete(event._id);
      const links = await ctx.db
        .query("catalogBatchLinks")
        .withIndex("by_batch", (query) => query.eq("batchId", batchId))
        .take(500);
      for (const link of links) await ctx.db.delete(link._id);
      const batch = await ctx.db.get(batchId);
      if (batch?.createdBySessionId === admin._id) await ctx.db.delete(batch._id);
    }

    const bookIds = new Set<Id<"books">>();
    for (const variantId of variantIds) {
      const variant = await ctx.db.get(variantId);
      if (!variant) continue;
      bookIds.add(variant.bookId);
      await ctx.db.delete(variant._id);
    }
    for (const bookId of bookIds) {
      const book = await ctx.db.get(bookId);
      if (!book || book.createdBySessionId !== admin._id) continue;
      const remainingVariants = await ctx.db
        .query("bookVariants")
        .withIndex("by_book", (query) => query.eq("bookId", book._id))
        .take(1);
      if (remainingVariants.length) continue;
      const publisher = await ctx.db.get(book.publisherId);
      await ctx.db.delete(book._id);
      if (!publisher || publisher.createdBySessionId !== admin._id) continue;
      const remainingBooks = await ctx.db
        .query("books")
        .withIndex("by_publisher", (query) => query.eq("publisherId", publisher._id))
        .take(1);
      if (!remainingBooks.length) await ctx.db.delete(publisher._id);
    }
    await ctx.db.delete(catalog._id);

    if (args.customerSessionToken) {
      const customer = await findSession(ctx, args.customerSessionToken);
      if (customer && customer._id !== admin._id) await ctx.db.delete(customer._id);
    }
    await ctx.db.delete(admin._id);
    return { ok: true as const };
  },
});
