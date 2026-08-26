import { paginationOptsValidator, type UserIdentity } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { recordAudit } from "./lib/audit";
import { findCurrentUser, requireOwner, requirePermission } from "./lib/auth";
import { fail } from "./lib/errors";
import { roleValidator, userStatusValidator } from "./validators";
import { enforceRateLimit } from "./lib/rateLimit";
import { nextMemberCode } from "./lib/memberCodes";

function trustedIdentityEmail(identity: UserIdentity): string | null {
  if (identity.emailVerified === false) return null;
  const email = identity.email?.trim().toLowerCase();
  return email || null;
}

function appUserView(user: Doc<"appUsers">) {
  return {
    appUserId: user._id,
    role: user.role,
    status: user.status,
    emailSnapshot: user.emailSnapshot ?? null,
    displayNameSnapshot: user.displayNameSnapshot ?? null,
    imageUrlSnapshot: user.imageUrlSnapshot ?? null,
    memberCode: user.memberCode ?? null,
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
    if (request.admittedAppUserId === existing._id && request.invitationStatus === "accepted") return existing;
    await ctx.db.patch(request._id, {
      admittedAppUserId: existing._id,
      invitationStatus: "accepted",
      invitationError: undefined,
      admissionError: undefined,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, actorUserId, "join_request.admission_succeeded", "join_request", request._id, {
      appUserId: existing._id,
    });
    return existing;
  }

  const now = Date.now();
  const memberCode = await nextMemberCode(ctx, request.name);
  const appUserId = await ctx.db.insert("appUsers", {
    clerkUserId,
    role: "customer",
    status: "active",
    emailSnapshot: request.applicantEmailSnapshot,
    displayNameSnapshot: request.name,
    memberCode,
    createdAt: now,
    updatedAt: now,
    lastSeenAt: now,
  });
  const admitted = await ctx.db.get(appUserId);
  if (!admitted) fail("USER_NOT_FOUND");
  await ctx.db.patch(request._id, {
    admittedAppUserId: appUserId,
    invitationStatus: "accepted",
    invitationError: undefined,
    admissionError: undefined,
    updatedAt: Date.now(),
  });
  await recordAudit(ctx, actorUserId, "join_request.admission_succeeded", "join_request", request._id, {
    appUserId,
  });
  return admitted;
}

async function reconcileExistingCustomerAdmission(
  ctx: MutationCtx,
  identity: UserIdentity,
  user: Doc<"appUsers">,
  normalizedEmail: string | null,
) {
  if (user.role !== "customer" || user.status !== "active" || !normalizedEmail) return;
  const request = await ctx.db
    .query("joinRequests")
    .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedEmail))
    .filter((query) => query.eq(query.field("status"), "approved"))
    .filter((query) => query.neq(query.field("invitationStatus"), "not_ready"))
    .first();
  if (
    !request ||
    (request.applicantClerkUserId && request.applicantClerkUserId !== identity.subject) ||
    (request.admittedAppUserId && request.admittedAppUserId !== user._id)
  ) {
    return;
  }
  await ctx.db.patch(request._id, {
    applicantClerkUserId: identity.subject,
    applicantEmailSnapshot: normalizedEmail,
    updatedAt: Date.now(),
  });
  const updated = await ctx.db.get(request._id);
  if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
  await admitApprovedJoinRequest(ctx, updated, user._id);
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
    memberCode: v.union(v.string(), v.null()),
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
    const normalizedIdentityEmail = trustedIdentityEmail(identity);
    const existing = await findCurrentUser(ctx, identity);
    if (existing) {
      const memberCode =
        existing.memberCode ||
        (await nextMemberCode(ctx, identity.name || existing.displayNameSnapshot || identity.email || undefined));
      await ctx.db.patch(existing._id, {
        emailSnapshot: identity.email || existing.emailSnapshot,
        displayNameSnapshot: identity.name || existing.displayNameSnapshot,
        imageUrlSnapshot: identity.pictureUrl || existing.imageUrlSnapshot,
        memberCode,
        updatedAt: now,
        lastSeenAt: now,
      });
      await reconcileExistingCustomerAdmission(ctx, identity, existing, normalizedIdentityEmail);
      const updated = await ctx.db.get(existing._id);
      if (!updated) fail("USER_NOT_FOUND");
      return appUserView(updated);
    }
    let approvedRequest: Doc<"joinRequests"> | null = null;
    let staffInvitation: Doc<"staffInvitations"> | null = null;
    if (identity.subject !== ownerClerkUserId) {
      if (!normalizedIdentityEmail) fail("ADMISSION_REQUIRED");
      staffInvitation = await ctx.db
        .query("staffInvitations")
        .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedIdentityEmail))
        .filter((query) => query.eq(query.field("status"), "pending"))
        .first();
      if (!staffInvitation) {
        approvedRequest = await ctx.db
          .query("joinRequests")
          .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedIdentityEmail))
          .filter((query) => query.eq(query.field("status"), "approved"))
          .filter((query) => query.neq(query.field("invitationStatus"), "not_ready"))
          .first();
        if (!approvedRequest) fail("ADMISSION_REQUIRED");
        if (approvedRequest.applicantClerkUserId && approvedRequest.applicantClerkUserId !== identity.subject) {
          fail("ADMISSION_REQUIRED");
        }
      }
    }
    const userId = await ctx.db.insert("appUsers", {
      clerkUserId: identity.subject,
      role: identity.subject === ownerClerkUserId ? "owner" : staffInvitation?.role || "customer",
      status: "active",
      emailSnapshot: identity.email,
      displayNameSnapshot: identity.name,
      imageUrlSnapshot: identity.pictureUrl,
      memberCode: await nextMemberCode(ctx, identity.name || identity.email || undefined),
      createdAt: now,
      updatedAt: now,
      lastSeenAt: now,
    });
    if (approvedRequest) {
      const applicantEmailSnapshot = normalizedIdentityEmail;
      if (!applicantEmailSnapshot) fail("ADMISSION_REQUIRED");
      await ctx.db.patch(approvedRequest._id, {
        applicantClerkUserId: identity.subject,
        applicantEmailSnapshot,
        admittedAppUserId: userId,
        invitationStatus: "accepted",
        invitationError: undefined,
        admissionError: undefined,
        updatedAt: now,
      });
      await recordAudit(ctx, userId, "join_request.admission_succeeded", "join_request", approvedRequest._id, {
        appUserId: userId,
      });
    }
    if (staffInvitation) {
      await ctx.db.patch(staffInvitation._id, {
        status: "claimed",
        claimedAt: now,
        claimedByUserId: userId,
        updatedAt: now,
      });
      await recordAudit(
        ctx,
        staffInvitation.createdByUserId,
        "staff_invitation.claimed",
        "staffInvitation",
        staffInvitation._id,
        { appUserId: String(userId) },
      );
    }
    const user = await ctx.db.get(userId);
    if (!user) fail("USER_NOT_FOUND");
    return appUserView(user);
  },
});

function normalizedInviteEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254) fail("VALIDATION_FAILED", "email is invalid");
  return email;
}

export const inviteStaff = mutation({
  args: { email: v.string() },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    await enforceRateLimit(ctx, "staffInviteOwner", String(owner._id));
    const email = normalizedInviteEmail(args.email);
    const invitations = await ctx.db
      .query("staffInvitations")
      .withIndex("by_normalized_email", (index) => index.eq("normalizedEmail", email))
      .take(20);
    if (invitations.some((invitation) => invitation.status === "pending"))
      fail("VALIDATION_FAILED", "staff invitation already pending");
    const now = Date.now();
    const invitationId = await ctx.db.insert("staffInvitations", {
      email,
      normalizedEmail: email,
      role: "admin",
      status: "pending",
      createdAt: now,
      updatedAt: now,
      createdByUserId: owner._id,
    });
    await recordAudit(ctx, owner._id, "staff_invitation.created", "staffInvitation", invitationId, { email });
    return { invitationId, email, status: "pending" as const };
  },
});

export const listStaffInvitations = query({
  args: {},
  handler: async (ctx) => {
    await requireOwner(ctx);
    const rows = await ctx.db.query("staffInvitations").take(100);
    return rows
      .sort((a, b) => b.createdAt - a.createdAt)
      .map((row) => ({
        invitationId: row._id,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.createdAt,
        claimedAt: row.claimedAt ?? null,
      }));
  },
});

export const revokeStaffInvitation = mutation({
  args: { invitationId: v.id("staffInvitations") },
  handler: async (ctx, args) => {
    const owner = await requireOwner(ctx);
    const invitation = await ctx.db.get(args.invitationId);
    if (!invitation) fail("VALIDATION_FAILED", "staff invitation does not exist");
    if (invitation.status !== "pending") fail("VALIDATION_FAILED", "only pending invitations can be revoked");
    const now = Date.now();
    await ctx.db.patch(invitation._id, { status: "revoked", revokedAt: now, updatedAt: now });
    await recordAudit(ctx, owner._id, "staff_invitation.revoked", "staffInvitation", invitation._id);
    return { revoked: true };
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
      memberCode: v.union(v.string(), v.null()),
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

export const getForAdmin = query({
  args: { userId: v.id("appUsers") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    const user = await targetUser(ctx, args.userId);
    return appUserView(user);
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
