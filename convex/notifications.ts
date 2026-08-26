import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import type { QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requireActiveUser, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { projectActivity } from "./lib/notifications";

const surface = v.union(v.literal("notification"), v.literal("inbox"));
const workspace = v.union(v.literal("admin"), v.literal("customer"));

function belongsToWorkspace(
  notice: { audience?: "admin" | "customer"; destination: string },
  currentWorkspace: "admin" | "customer",
) {
  const audience = notice.audience ?? (notice.destination.startsWith("/admin") ? "admin" : "customer");
  return audience === currentWorkspace;
}

async function mineBySurface(ctx: QueryCtx, recipientUserId: Id<"appUsers">, currentWorkspace: "admin" | "customer") {
  return Promise.all(
    (["notification", "inbox"] as const).map((currentSurface) =>
      ctx.db
        .query("notifications")
        .withIndex("by_recipient_surface_created_at", (index) =>
          index.eq("recipientUserId", recipientUserId).eq("surface", currentSurface),
        )
        .order("desc")
        .take(100)
        .then((notices) => notices.filter((notice) => belongsToWorkspace(notice, currentWorkspace))),
    ),
  );
}

export const listActivity = query({
  args: { workspace },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const [notifications, inbox] = await mineBySurface(ctx, user._id, args.workspace);
    // ponytail: two bounded source reads, enough for the visible feed; add cursor pagination only when activity volume warrants it.
    return projectActivity([...notifications, ...inbox]);
  },
});

export const unreadActivityCount = query({
  args: { workspace },
  handler: async (ctx, args) => {
    const user = await requireActiveUser(ctx);
    const counts = await Promise.all(
      (["notification", "inbox"] as const).map((currentSurface) =>
        ctx.db
          .query("notifications")
          .withIndex("by_recipient_surface_read_at", (index) =>
            index.eq("recipientUserId", user._id).eq("surface", currentSurface).eq("readAt", undefined),
          )
          .take(100)
          .then((notices) => notices.filter((notice) => belongsToWorkspace(notice, args.workspace))),
      ),
    );
    // ponytail: badge caps at 200 unread rows; the UI already renders 99+.
    return projectActivity(counts.flat()).length;
  },
});

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

export const markReadByContext = mutation({
  args: { destination: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "customers.read");
    if (args.destination !== "/admin" && !args.destination.startsWith("/admin/")) {
      fail("VALIDATION_FAILED", "admin destination is invalid");
    }
    const unreadBySurface = await Promise.all(
      (["notification", "inbox"] as const).map((currentSurface) =>
        ctx.db
          .query("notifications")
          .withIndex("by_recipient_surface_read_at", (index) =>
            index.eq("recipientUserId", user._id).eq("surface", currentSurface).eq("readAt", undefined),
          )
          // ponytail: cap each surface scan at 200; add pagination only if this ceiling is reached in production.
          .take(200),
      ),
    );
    const matching = unreadBySurface
      .flat()
      .filter(
        (notice) =>
          notice.destination === args.destination &&
          (notice.audience === "admin" || (!notice.audience && notice.destination.startsWith("/admin"))),
      );
    const readAt = Date.now();
    await Promise.all(matching.map((notice) => ctx.db.patch(notice._id, { readAt })));
    return { read: matching.length };
  },
});
