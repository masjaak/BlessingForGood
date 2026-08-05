import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { fail } from "./lib/errors";
import { requiredText, slugify } from "./lib/validation";
import { requireSession } from "./lib/sessions";

export const list = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    return ctx.db
      .query("publishers")
      .withIndex("by_active", (query) => query.eq("isActive", true))
      .order("desc")
      .paginate(args.paginationOpts);
  },
});

export const create = mutation({
  args: { sessionToken: v.string(), name: v.string() },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "admin");
    const name = requiredText(args.name, "publisher name");
    const slug = slugify(name, "publisher name");
    const existing = await ctx.db
      .query("publishers")
      .withIndex("by_slug", (query) => query.eq("slug", slug))
      .unique();
    if (existing) fail("DUPLICATE_SLUG");
    const now = Date.now();
    return ctx.db.insert("publishers", {
      name,
      slug,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      createdBySessionId: session._id,
    });
  },
});
