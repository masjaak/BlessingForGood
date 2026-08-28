import { paginationOptsValidator, type UserIdentity } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, mutation, query } from "./_generated/server";
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

function maskedEmail(email: string | null): string | null {
  if (!email) return null;
  const [local, domain] = email.split("@", 2);
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}

async function safeSubjectHash(subject: string): Promise<string> {
  try {
    const digest = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(subject));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
  } catch {
    return `suffix:${subject.slice(-8)}`;
  }
}

async function logMembershipDiagnostic(
  event: string,
  identity: UserIdentity,
  normalizedEmail: string | null,
  user: Doc<"appUsers"> | null,
  request: Doc<"joinRequests"> | null,
  fields: { correlationId?: string; reconciliationCalled: boolean; reconciliationResult: string },
) {
  try {
    console.log("bfg_membership_reconciliation", {
      event,
      stage:
        event === "ensure_started"
          ? "ENSURE_USER_START"
          : event === "ensure_failed"
            ? "ENSURE_USER_FAILED"
            : fields.reconciliationResult === "active"
              ? "CUSTOMER_ACTIVE"
              : "MEMBERSHIP_RECONCILED",
      correlationId: fields.correlationId || "unspecified",
      clerkSubjectHash: await safeSubjectHash(identity.subject),
      currentVerifiedEmail: maskedEmail(normalizedEmail),
      invitedEmail: maskedEmail(request?.normalizedEmail ?? null),
      emailsMatch: request && normalizedEmail ? request.normalizedEmail === normalizedEmail : null,
      currentAdmissionId: request ? String(request._id) : null,
      subjectMatchesHistoricalAppUser: request?.applicantClerkUserId
        ? request.applicantClerkUserId === identity.subject
        : null,
      appUserExists: Boolean(user),
      appUserRole: user?.role ?? null,
      appUserStatus: user?.status ?? null,
      approvedJoinRequestFound: Boolean(request),
      joinRequestStatus: request?.status ?? null,
      invitationStatus: request?.invitationStatus ?? null,
      reconciliationCalled: fields.reconciliationCalled,
      reconciliationResult: fields.reconciliationResult,
    });
  } catch {
    // Diagnostics must never block authenticated admission.
  }
}

async function findApprovedJoinRequest(ctx: MutationCtx | QueryCtx, normalizedEmail: string | null) {
  if (!normalizedEmail) return null;
  const requests = await ctx.db
    .query("joinRequests")
    .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedEmail))
    .order("desc")
    .take(50);
  return (
    requests.find(
      (request) =>
        request.status === "approved" &&
        request.invitationStatus !== "not_ready" &&
        !request.removedAt,
    ) ?? null
  );
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
  if (request.status !== "approved" || request.removedAt) fail("JOIN_REQUEST_INVALID_STATE");
  const clerkUserId = request.applicantClerkUserId;
  if (!clerkUserId) return null;

  let existing = await ctx.db
    .query("appUsers")
    .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", clerkUserId))
    .unique();
  if (existing) {
    if (existing.status === "removed") {
      if (existing.role !== "customer") fail("MEMBERSHIP_REMOVAL_NOT_ALLOWED");
      const now = Date.now();
      await ctx.db.patch(existing._id, {
        status: "active",
        removedAt: undefined,
        removedByUserId: undefined,
        removalReason: undefined,
        suspendedAt: undefined,
        suspendedByUserId: undefined,
        updatedAt: now,
        lastSeenAt: now,
      });
      const reactivated = await ctx.db.get(existing._id);
      if (!reactivated) fail("USER_NOT_FOUND");
      existing = reactivated;
    }
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
  request: Doc<"joinRequests"> | null,
) {
  if (user.role !== "customer" || !normalizedEmail) return;
  if (!request) return;
  const historicalUser =
    request.applicantClerkUserId && request.applicantClerkUserId !== identity.subject
      ? await ctx.db
          .query("appUsers")
          .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", request.applicantClerkUserId!))
          .unique()
      : null;
  const admittedUser =
    request.admittedAppUserId && request.admittedAppUserId !== user._id
      ? await ctx.db.get(request.admittedAppUserId)
      : null;
  if (
    request.applicantClerkUserId &&
    request.applicantClerkUserId !== identity.subject &&
    historicalUser?.status !== "removed"
  ) {
    return;
  }
  if (admittedUser && admittedUser.status !== "removed") return;
  if (request.admittedAppUserId && !admittedUser && request.admittedAppUserId !== user._id) return;
  await ctx.db.patch(request._id, {
    applicantClerkUserId: identity.subject,
    applicantEmailSnapshot: normalizedEmail,
    updatedAt: Date.now(),
  });
  const updated = await ctx.db.get(request._id);
  if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
  await admitApprovedJoinRequest(ctx, updated, user._id);
}

const appUserViewValidator = v.object({
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
});

async function ensureCurrentUserHandler(
  ctx: MutationCtx,
  args: { correlationId?: string },
  clerkVerifiedEmail?: string | null,
  clerkLookupFailed = false,
) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) fail("IDENTITY_REQUIRED");
  const correlationId = args.correlationId?.match(/^[A-Za-z0-9_-]{1,80}$/)?.[0];
  const normalizedIdentityEmail =
    clerkVerifiedEmail === undefined
      ? trustedIdentityEmail(identity)
      : clerkVerifiedEmail?.trim().toLowerCase() || null;
  const ownerClerkUserId = process.env.BFG_OWNER_CLERK_USER_ID;
  if (!ownerClerkUserId) {
    await logMembershipDiagnostic("ensure_failed", identity, normalizedIdentityEmail, null, null, {
      correlationId,
      reconciliationCalled: false,
      reconciliationResult: "auth_configuration_missing",
    });
    fail("AUTH_CONFIGURATION_MISSING");
  }
  const now = Date.now();
  const existing = await findCurrentUser(ctx, identity);
  const matchingApprovedRequest = await findApprovedJoinRequest(ctx, normalizedIdentityEmail);
  await logMembershipDiagnostic(
    "ensure_started",
    identity,
    normalizedIdentityEmail,
    existing,
    matchingApprovedRequest,
    {
      correlationId,
      reconciliationCalled: Boolean(existing),
      reconciliationResult: "pending",
    },
  );
  if (existing) {
    const memberCode =
      existing.memberCode ||
      (await nextMemberCode(
        ctx,
        identity.name || existing.displayNameSnapshot || normalizedIdentityEmail || undefined,
      ));
    await ctx.db.patch(existing._id, {
      emailSnapshot: normalizedIdentityEmail || existing.emailSnapshot,
      displayNameSnapshot: identity.name || existing.displayNameSnapshot,
      imageUrlSnapshot: identity.pictureUrl || existing.imageUrlSnapshot,
      memberCode,
      updatedAt: now,
      lastSeenAt: now,
    });
    await reconcileExistingCustomerAdmission(ctx, identity, existing, normalizedIdentityEmail, matchingApprovedRequest);
    const updated = await ctx.db.get(existing._id);
    if (!updated) fail("USER_NOT_FOUND");
    const reconciledRequest = matchingApprovedRequest ? await ctx.db.get(matchingApprovedRequest._id) : null;
    await logMembershipDiagnostic("ensure_complete", identity, normalizedIdentityEmail, updated, reconciledRequest, {
      correlationId,
      reconciliationCalled: Boolean(existing),
      reconciliationResult:
        reconciledRequest?.invitationStatus === "accepted" ? "active" : "existing_user_not_admitted",
    });
    return appUserView(updated);
  }
  let approvedRequest: Doc<"joinRequests"> | null = null;
  let staffInvitation: Doc<"staffInvitations"> | null = null;
  if (identity.subject !== ownerClerkUserId) {
    if (!normalizedIdentityEmail) {
      await logMembershipDiagnostic("ensure_failed", identity, normalizedIdentityEmail, null, matchingApprovedRequest, {
        correlationId,
        reconciliationCalled: false,
        reconciliationResult: clerkLookupFailed
          ? "clerk_verified_email_lookup_failed"
          : "admission_required_unverified_email",
      });
      if (clerkLookupFailed) fail("CLERK_INVITATION_RETRY_REQUIRED");
      fail("ADMISSION_REQUIRED");
    }
    staffInvitation = await ctx.db
      .query("staffInvitations")
      .withIndex("by_normalized_email", (query) => query.eq("normalizedEmail", normalizedIdentityEmail))
      .filter((query) => query.eq(query.field("status"), "pending"))
      .first();
    if (!staffInvitation) {
      approvedRequest = matchingApprovedRequest;
      if (!approvedRequest) {
        await logMembershipDiagnostic("ensure_failed", identity, normalizedIdentityEmail, null, null, {
          correlationId,
          reconciliationCalled: false,
          reconciliationResult: "admission_required_no_approved_request",
        });
        fail("ADMISSION_REQUIRED");
      }
      if (approvedRequest.applicantClerkUserId && approvedRequest.applicantClerkUserId !== identity.subject) {
        const historicalUser = await ctx.db
          .query("appUsers")
          .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", approvedRequest!.applicantClerkUserId!))
          .unique();
        if (historicalUser?.status === "removed") {
          // A removed BFG membership does not own a future Clerk subject.
        } else {
          await logMembershipDiagnostic("ensure_failed", identity, normalizedIdentityEmail, null, approvedRequest, {
            correlationId,
            reconciliationCalled: false,
            reconciliationResult: "admission_required_identity_mismatch",
          });
          fail("ADMISSION_REQUIRED");
        }
      }
    }
  }
  const userId = await ctx.db.insert("appUsers", {
    clerkUserId: identity.subject,
    role: identity.subject === ownerClerkUserId ? "owner" : staffInvitation?.role || "customer",
    status: "active",
    emailSnapshot: normalizedIdentityEmail || undefined,
    displayNameSnapshot: identity.name,
    imageUrlSnapshot: identity.pictureUrl,
    memberCode: await nextMemberCode(ctx, identity.name || normalizedIdentityEmail || undefined),
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
      updatedAt: now,
    });
    const linkedRequest = await ctx.db.get(approvedRequest._id);
    if (!linkedRequest) fail("JOIN_REQUEST_NOT_FOUND");
    await admitApprovedJoinRequest(ctx, linkedRequest, userId);
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
  const reconciledRequest = approvedRequest ? await ctx.db.get(approvedRequest._id) : null;
  await logMembershipDiagnostic("ensure_complete", identity, normalizedIdentityEmail, user, reconciledRequest, {
    correlationId,
    reconciliationCalled: Boolean(approvedRequest),
    reconciliationResult: approvedRequest ? "active" : staffInvitation ? "staff_active" : "owner_active",
  });
  return appUserView(user);
}

export const ensureCurrentUser = mutation({
  args: { correlationId: v.optional(v.string()) },
  returns: appUserViewValidator,
  handler: (ctx, args) => ensureCurrentUserHandler(ctx, args),
});

export const ensureCurrentUserFromClerk = internalMutation({
  args: {
    clerkSubject: v.string(),
    clerkVerifiedEmail: v.union(v.string(), v.null()),
    clerkLookupFailed: v.boolean(),
    correlationId: v.optional(v.string()),
  },
  returns: appUserViewValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.clerkSubject) fail("IDENTITY_REQUIRED");
    return ensureCurrentUserHandler(ctx, args, args.clerkVerifiedEmail, args.clerkLookupFailed);
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
    const normalizedEmail = trustedIdentityEmail(identity);
    const request = await findApprovedJoinRequest(ctx, normalizedEmail);
    await logMembershipDiagnostic("current_user", identity, normalizedEmail, user, request, {
      reconciliationCalled: false,
      reconciliationResult: "current_user_query",
    });
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
    if (target.status === "removed") fail("USER_REMOVED");
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
    if (target.status === "removed") fail("USER_REMOVED");
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
