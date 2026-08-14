import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";

const key = v.union(v.literal("community"), v.literal("how_to_order"), v.literal("help"));

function required(value: string, max: number) {
  const result = value.trim();
  if (!result || result.length > max) fail("VALIDATION_FAILED");
  return result;
}

export const getForAdmin = query({
  args: { key },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "content.manage");
    return ctx.db
      .query("contentBlocks")
      .withIndex("by_key", (index) => index.eq("key", args.key))
      .unique();
  },
});

export const getPublished = query({
  args: { key },
  handler: async (ctx, args) => {
    const block = await ctx.db
      .query("contentBlocks")
      .withIndex("by_key", (index) => index.eq("key", args.key))
      .unique();
    return block?.status === "published"
      ? { eyebrow: block.eyebrow, title: block.title, body: block.body, updatedAt: block.updatedAt }
      : null;
  },
});

export const upsert = mutation({
  args: { key, eyebrow: v.string(), title: v.string(), body: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "content.manage");
    const existing = await ctx.db
      .query("contentBlocks")
      .withIndex("by_key", (index) => index.eq("key", args.key))
      .unique();
    const now = Date.now();
    const values = {
      eyebrow: required(args.eyebrow, 80),
      title: required(args.title, 180),
      body: required(args.body, 1000),
      status: "draft" as const,
      updatedAt: now,
      updatedByUserId: user._id,
      publishedAt: undefined,
    };
    let blockId;
    if (existing) {
      await ctx.db.patch(existing._id, values);
      blockId = existing._id;
    } else {
      blockId = await ctx.db.insert("contentBlocks", { key: args.key, ...values, createdAt: now });
    }
    await recordAudit(ctx, user._id, "content.updated", "contentBlock", blockId, { key: args.key });
    return blockId;
  },
});

export const publish = mutation({
  args: { key },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "content.manage");
    const block = await ctx.db
      .query("contentBlocks")
      .withIndex("by_key", (index) => index.eq("key", args.key))
      .unique();
    if (!block) fail("VALIDATION_FAILED", "save content before publishing");
    const now = Date.now();
    await ctx.db.patch(block._id, { status: "published", publishedAt: now, updatedAt: now, updatedByUserId: user._id });
    await recordAudit(ctx, user._id, "content.published", "contentBlock", block._id, { key: args.key });
    return { published: true };
  },
});
