import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { requireActiveUser } from "./lib/auth";
import { fail } from "./lib/errors";

const surface = v.union(v.literal("notification"), v.literal("inbox"));

export const listMine = query({
  args: { surface },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const notices = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_surface_created_at", (index) =>
        index.eq("recipientUserId", user._id).eq("surface", args.surface),
      )
      .order("desc")
      .take(100);
    return notices.map((notice) => ({
      notificationId: notice._id,
      eventType: notice.eventType,
      title: notice.title,
      body: notice.body,
      destination: notice.destination,
      relatedEntityType: notice.relatedEntityType ?? null,
      relatedEntityId: notice.relatedEntityId ?? null,
      createdAt: notice.createdAt,
      readAt: notice.readAt ?? null,
    }));
  },
});

export const unreadCount = query({
  args: { surface },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    // ponytail: badge caps at 100; add counter aggregation only if notification volume exceeds that ceiling.
    const unread = await ctx.db
      .query("notifications")
      .withIndex("by_recipient_surface_read_at", (index) =>
        index.eq("recipientUserId", user._id).eq("surface", args.surface).eq("readAt", undefined),
      )
      .take(100);
    return unread.length;
  },
});

export const markRead = mutation({
  args: { notificationId: v.id("notifications") },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const notice = await ctx.db.get(args.notificationId);
    if (!notice || notice.recipientUserId !== user._id) fail("NOTIFICATION_ACCESS_DENIED");
    if (!notice.readAt) await ctx.db.patch(notice._id, { readAt: Date.now() });
    return { read: true };
  },
});
