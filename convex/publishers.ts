import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requirePermission } from "./lib/auth";
import { requiredText, slugify } from "./lib/validation";
import { recordAudit } from "./lib/audit";
import { insertPublisher } from "./lib/productDomain";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.read");
    return ctx.db
      .query("publishers")
      .withIndex("by_active", (query) => query.eq("isActive", true))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    return insertPublisher(ctx, user._id, args.name);
  },
});

export const listForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "books.manage");
    return ctx.db.query("publishers").withIndex("by_created_at").order("desc").take(200);
  },
});

export const update = mutation({
  args: { publisherId: v.id("publishers"), name: v.string(), isActive: v.boolean() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const publisher = await ctx.db.get(args.publisherId);
    if (!publisher) fail("VALIDATION_FAILED", "publisher does not exist");
    const name = requiredText(args.name, "publisher name");
    const slug = slugify(name, "publisher name");
    const duplicate = await ctx.db
      .query("publishers")
      .withIndex("by_slug", (index) => index.eq("slug", slug))
      .unique();
    if (duplicate && duplicate._id !== publisher._id) fail("DUPLICATE_SLUG");
    await ctx.db.patch(publisher._id, { name, slug, isActive: args.isActive, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "publisher.updated", "publisher", publisher._id, {
      active: String(args.isActive),
    });
    return publisher._id;
  },
});

export const remove = mutation({
  args: { publisherId: v.id("publishers") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const publisher = await ctx.db.get(args.publisherId);
    if (!publisher) fail("VALIDATION_FAILED", "publisher does not exist");
    // ponytail: bounded dependency scan; add a publisher index before the master exceeds 500 books.
    const books = await ctx.db.query("books").take(501);
    if (books.length > 500 || books.some((book) => book.publisherId === publisher._id)) {
      fail("ENTITY_IN_USE", "publisher is referenced by a book");
    }
    await ctx.db.delete(publisher._id);
    await recordAudit(ctx, user._id, "publisher.deleted", "publisher", publisher._id);
    return { removed: true };
  },
});
