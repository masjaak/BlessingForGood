import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { findCurrentUser, requireOwner } from "./lib/auth";
import { fail } from "./lib/errors";
import { roleValidator, userStatusValidator } from "./validators";

function appUserView(user: Doc<"appUsers">) {
  return {
    appUserId: user._id,
    role: user.role,
    status: user.status,
    emailSnapshot: user.emailSnapshot ?? null,
    displayNameSnapshot: user.displayNameSnapshot ?? null,
    imageUrlSnapshot: user.imageUrlSnapshot ?? null,
    createdAt: new Date(user.createdAt).toISOString(),
    updatedAt: new Date(user.updatedAt).toISOString(),
    lastSeenAt: new Date(user.lastSeenAt).toISOString(),
    suspendedAt: user.suspendedAt ? new Date(user.suspendedAt).toISOString() : null,
  };
}

export async function admitApprovedJoinRequest(
  ctx: MutationCtx,
  request: Doc<"joinRequests">,
  actorUserId: Id<"appUsers">,
): Promise<Doc<"appUsers"> | null> {
  if (request.status !== "approved") fail("JOIN_REQUEST_INVALID_STATE");
  const clerkUserId = request.applicantClerkUserId;
  if (!clerkUserId) return null;

  const existing = await ctx.db
    .query("appUsers")
    .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();
  if (existing) {
    await ctx.db.patch(request._id, {
      admittedAppUserId: existing._id,
      admissionError: undefined,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, actorUserId, "join_request.admission_succeeded", "join_request", request._id, {
      appUserId: existing._id,
    });
    return existing;
  }

  const now = Date.now();
  const appUserId = await ctx.db.insert("appUsers", {
    clerkUserId,
    role: "customer",
    status: "active",
    emailSnapshot: request.applicantEmailSnapshot,
    displayNameSnapshot: request.name,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  });
  const admitted = await ctx.db.get(appUserId);
  if (!admitted) fail("USER_NOT_FOUND");
  await ctx.db.patch(request._id, {
    admittedAppUserId: appUserId,
    admissionError: undefined,
    updatedAt: Date.now(),
  });
  await recordAudit(ctx, actorUserId, "join_request.admission_succeeded", "join_request", request._id, {
    appUserId,
  });
  return admitted;
}

export const ensureCurrentUser = mutation({
  args: {},
  returns: v.object({
    appUserId: v.id("appUsers"),
    role: roleValidator,
    status: userStatusValidator,
    emailSnapshot: v.union(v.string(), v.null()),
    displayNameSnapshot: v.union(v.string(), v.null()),
    imageUrlSnapshot: v.union(v.string(), v.null()),
    createdAt: v.string(),
    updatedAt: v.string(),
    lastSeenAt: v.string(),
    suspendedAt: v.union(v.string(), v.null()),
  }),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) fail("IDENTITY_REQUIRED");
    const ownerClerkUserId = process.env.BFG_OWNER_CLERK_USER_ID;
    if (!ownerClerkUserId) fail("AUTH_CONFIGURATION_MISSING");
    const now = Date.now();
    const existing = await findCurrentUser(ctx, identity);
    if (existing) {
      await ctx.db.patch(existing._id, {
        emailSnapshot: identity.email || existing.emailSnapshot,
        displayNameSnapshot: identity.name || existing.displayNameSnapshot,
        imageUrlSnapshot: identity.pictureUrl || existing.imageUrlSnapshot,
        updatedAt: now,
        lastSeenAt: now,
      });
      const updated = await ctx.db.get(existing._id);
      if (!updated) fail("USER_NOT_FOUND");
      return appUserView(updated);
    }
    let approvedRequest: Doc<"joinRequests"> | null = null;
    if (identity.subject !== ownerClerkUserId) {
      const normalizedEmail = identity.email?.trim().toLowerCase();
      if (!normalizedEmail) fail("ADMISSION_REQUIRED");
      approvedRequest = await ctx.db
        .query("joinRequests")
        .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedEmail))
        .filter((query) => query.eq(query.field("status"), "approved"))
        .filter((query) => query.eq(query.field("invitationStatus"), "ready"))
        .first();
      if (!approvedRequest) fail("ADMISSION_REQUIRED");
      if (approvedRequest.applicantClerkUserId && approvedRequest.applicantClerkUserId !== identity.subject) {
        fail("ADMISSION_REQUIRED");
      }
    }
    const userId = await ctx.db.insert("appUsers", {
      clerkUserId: identity.subject,
      role: identity.subject === ownerClerkUserId ? "owner" : "customer",
      status: "active",
      emailSnapshot: identity.email,
      displayNameSnapshot: identity.name,
      imageUrlSnapshot: identity.pictureUrl,
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
    if (approvedRequest) {
      await ctx.db.patch(approvedRequest._id, { admittedAppUserId: userId, updatedAt: now });
    }
    const user = await ctx.db.get(userId);
    if (!user) fail("USER_NOT_FOUND");
    return appUserView(user);
  },
});

export const current = query({
  args: {},
  returns: v.union(
    v.object({
      appUserId: v.id("appUsers"),
      role: roleValidator,
      status: userStatusValidator,
      emailSnapshot: v.union(v.string(), v.null()),
      displayNameSnapshot: v.union(v.string(), v.null()),
      imageUrlSnapshot: v.union(v.string(), v.null()),
      createdAt: v.string(),
      updatedAt: v.string(),
      lastSeenAt: v.string(),
      suspendedAt: v.union(v.string(), v.null()),
    }),
    v.null(),
  ),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) return null;
    const user = await findCurrentUser(ctx, identity);
    return user ? appUserView(user) : null;
  },
});

export const list = query({
  args: {
    role: v.optional(roleValidator),
    status: v.optional(userStatusValidator),
    paginationOpts: paginationOptsValidator,
  },
  handler: async (ctx, args) => {
    await requireOwner(ctx);
    if (args.role && args.status) {
      const page = await ctx.db
        .query("appUsers")
        .withIndex("by_role_and_status", (query) => query.eq("role", args.role!).eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...page, page: page.page.map(appUserView) };
    }
    if (args.role) {
      const page = await ctx.db
        .query("appUsers")
        .withIndex("by_role", (query) => query.eq("role", args.role!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...page, page: page.page.map(appUserView) };
    }
    if (args.status) {
      const page = await ctx.db
        .query("appUsers")
        .withIndex("by_status", (query) => query.eq("status", args.status!))
        .order("desc")
        .paginate(args.paginationOpts);
      return { ...page, page: page.page.map(appUserView) };
    }
    const page = await ctx.db.query("appUsers").withIndex("by_created_at").order("desc").paginate(args.paginationOpts);
    return { ...page, page: page.page.map(appUserView) };
  },
});

async function targetUser(ctx: QueryCtx | MutationCtx, userId: Id<"appUsers">) {
  const user = await ctx.db.get(userId);
  if (!user) fail("USER_NOT_FOUND");
  return user;
}

export const updateRole = mutation({
  args: { userId: v.id("appUsers"), role: v.union(v.literal("admin"), v.literal("customer")) },
  handler: async (ctx, args) => {
    const actor = await requireOwner(ctx);
    const target = await targetUser(ctx, args.userId);
    if (target.role === "owner") fail("OWNER_PROTECTED");
    if (target.role === args.role) return appUserView(target);
    await ctx.db.patch(target._id, { role: args.role, updatedAt: Date.now() });
    await recordAudit(ctx, actor._id, args.role === "admin" ? "user.promoted" : "user.demoted", "appUser", target._id, {
      role: args.role,
    });
    const updated = await ctx.db.get(target._id);
    if (!updated) fail("USER_NOT_FOUND");
    return appUserView(updated);
  },
});

export const suspend = mutation({
  args: { userId: v.id("appUsers") },
  handler: async (ctx, args) => {
    const actor = await requireOwner(ctx);
    const target = await targetUser(ctx, args.userId);
    if (target._id === actor._id) fail("SELF_SUSPENSION");
    if (target.role === "owner") fail("OWNER_PROTECTED");
    if (target.status === "suspended") return appUserView(target);
    const now = Date.now();
    await ctx.db.patch(target._id, {
      status: "suspended",
      suspendedAt: now,
      suspendedByUserId: actor._id,
      updatedAt: now,
    });
    await recordAudit(ctx, actor._id, "user.suspended", "appUser", target._id);
    const updated = await ctx.db.get(target._id);
    if (!updated) fail("USER_NOT_FOUND");
    return appUserView(updated);
  },
});

export const reactivate = mutation({
  args: { userId: v.id("appUsers") },
  handler: async (ctx, args) => {
    const actor = await requireOwner(ctx);
    const target = await targetUser(ctx, args.userId);
    if (target.role === "owner") fail("OWNER_PROTECTED");
    if (target.status === "active") return appUserView(target);
    await ctx.db.patch(target._id, {
      status: "active",
      suspendedAt: undefined,
      suspendedByUserId: undefined,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, actor._id, "user.reactivated", "appUser", target._id);
    const updated = await ctx.db.get(target._id);
    if (!updated) fail("USER_NOT_FOUND");
    return appUserView(updated);
  },
});
