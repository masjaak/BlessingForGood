import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requirePermission } from "./lib/auth";
import { requiredText, slugify } from "./lib/validation";

export const list = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "books.read");
    return ctx.db
      .query("books")
      .withIndex("by_active", (query) => query.eq("isActive", true))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: {
    publisherId: v.id("publishers"),
    title: v.string(),
    slug: v.optional(v.string()),
    description: v.optional(v.string()),
    coverImageUrl: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "books.manage");
    const publisher = await ctx.db.get(args.publisherId);
    if (!publisher || !publisher.isActive) fail("VALIDATION_FAILED", "publisher is unavailable");
    const title = requiredText(args.title, "book title");
    const slug = slugify(args.slug || title, "book slug");
    const existing = await ctx.db
      .query("books")
      .withIndex("by_publisher_and_slug", (query) => query.eq("publisherId", args.publisherId).eq("slug", slug))
      .unique();
    if (existing) fail("DUPLICATE_SLUG");
    const now = Date.now();
    return ctx.db.insert("books", {
      publisherId: args.publisherId,
      title,
      slug,
      description: args.description?.trim() || undefined,
      coverImageUrl: args.coverImageUrl?.trim() || undefined,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
  },
});
