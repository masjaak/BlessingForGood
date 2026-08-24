import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { findCurrentUser, requireIdentity, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { admitApprovedJoinRequest } from "./users";
import { joinRequestStatusValidator } from "./validators";
import { joinRequestBookInterestValidator } from "./validators";
import { notifyAdmins, notifyUser } from "./lib/notifications";
import { enforceRateLimit } from "./lib/rateLimit";

type JoinRequestStatus = "submitted" | "under_review" | "approved" | "rejected";
type JoinRequestAdmissionStatus = "pending" | "invitation_pending" | "active" | "rejected";

const duplicateStatuses = new Set<JoinRequestStatus>(["submitted", "under_review", "approved"]);

function requiredText(value: string, field: string, max: number): string {
  const normalized = value.trim();
  if (!normalized || normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized;
}

function optionalText(value: string | undefined, field: string, max: number): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (normalized.length > max) fail("VALIDATION_FAILED", `${field} is invalid`);
  return normalized || undefined;
}

function normalizeEmail(value: string): string {
  const email = requiredText(value, "email", 254).toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail("JOIN_REQUEST_EMAIL_INVALID");
  return email;
}

function normalizeContact(value: string): string {
  const contact = requiredText(value, "contact", 80)
    .toLowerCase()
    .replace(/[\s().-]+/g, "");
  const digits = contact.replace(/\D/g, "");
  if (digits.length < 5) fail("VALIDATION_FAILED", "contact is invalid");
  if (digits.startsWith("00")) return `+${digits.slice(2)}`;
  if (digits.startsWith("62")) return `+${digits}`;
  if (digits.startsWith("0")) return `+62${digits.slice(1)}`;
  return contact;
}

async function activeEmailDuplicateStatus(ctx: MutationCtx, normalizedEmail: string): Promise<JoinRequestStatus | null> {
  const matches = await ctx.db
    .query("joinRequests")
    .withIndex("by_normalized_email", (index) => index.eq("normalizedEmail", normalizedEmail))
    .take(50);
  const statuses = matches.filter((request) => duplicateStatuses.has(request.status)).map((request) => request.status);
  if (statuses.includes("approved")) return "approved";
  return statuses[0] ?? null;
}

async function activeApplicantDuplicateStatus(ctx: MutationCtx, applicantClerkUserId: string): Promise<JoinRequestStatus | null> {
  const matches = await ctx.db
    .query("joinRequests")
    .withIndex("by_applicant_clerk_user_id", (index) => index.eq("applicantClerkUserId", applicantClerkUserId))
    .take(50);
  return matches.find((request) => duplicateStatuses.has(request.status))?.status ?? null;
}

async function admissionStatus(
  ctx: QueryCtx | MutationCtx,
  request: Doc<"joinRequests">,
): Promise<JoinRequestAdmissionStatus> {
  if (request.status === "rejected") return "rejected";
  if (request.status !== "approved") return "pending";
  if (!request.applicantClerkUserId && !request.admittedAppUserId) return "invitation_pending";
  const user = request.admittedAppUserId
    ? await ctx.db.get(request.admittedAppUserId)
    : await ctx.db
        .query("appUsers")
        .withIndex("by_clerk_user_id", (index) => index.eq("clerkUserId", request.applicantClerkUserId!))
        .unique();
  return user?.status === "active" ? "active" : "pending";
}

async function requestView(ctx: QueryCtx | MutationCtx, request: Doc<"joinRequests">) {
  return {
    joinRequestId: request._id,
    name: request.name,
    email: request.email,
    contact: request.contact,
    city: request.city ?? null,
    bookInterest: request.bookInterest ?? null,
    note: request.note ?? null,
    source: request.source,
    acknowledged: request.acknowledged,
    status: request.status,
    invitationStatus: request.invitationStatus,
    submittedAt: new Date(request.submittedAt).toISOString(),
    reviewedAt: request.reviewedAt ? new Date(request.reviewedAt).toISOString() : null,
    reviewedByUserId: request.reviewedByUserId ?? null,
    reviewNote: request.reviewNote ?? null,
    rejectionReason: request.rejectionReason ?? null,
    admissionStatus: await admissionStatus(ctx, request),
    admissionError: request.admissionError ?? null,
    createdAt: new Date(request.createdAt).toISOString(),
    updatedAt: new Date(request.updatedAt).toISOString(),
  };
}

function requireStatus(request: Doc<"joinRequests">, expected: JoinRequestStatus): void {
  if (request.status !== expected) fail("JOIN_REQUEST_INVALID_STATE");
}

async function getRequest(ctx: MutationCtx, joinRequestId: Id<"joinRequests">): Promise<Doc<"joinRequests">> {
  const request = await ctx.db.get(joinRequestId);
  if (!request) fail("JOIN_REQUEST_NOT_FOUND");
  return request;
}

export const submit = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    contact: v.string(),
    city: v.string(),
    bookInterest: joinRequestBookInterestValidator,
    note: v.optional(v.string()),
    acknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.acknowledged) fail("JOIN_REQUEST_ACKNOWLEDGEMENT_REQUIRED");
    const identity = await ctx.auth.getUserIdentity();
    if (identity && (await findCurrentUser(ctx, identity))) {
      fail("JOIN_REQUEST_INVALID_STATE");
    }
    const name = requiredText(args.name, "name", 120);
    const email = normalizeEmail(args.email);
    const contact = requiredText(args.contact, "contact", 80);
    const normalizedContact = normalizeContact(contact);
    const city = requiredText(args.city, "area", 120);
    const applicantClerkUserId = identity?.subject;
    const duplicateStatusesFound = await Promise.all([
      activeEmailDuplicateStatus(ctx, email),
      applicantClerkUserId ? activeApplicantDuplicateStatus(ctx, applicantClerkUserId) : Promise.resolve(null),
    ]);
    if (duplicateStatusesFound.includes("approved")) fail("JOIN_REQUEST_ALREADY_APPROVED");
    if (duplicateStatusesFound.some(Boolean)) {
      fail("JOIN_REQUEST_DUPLICATE");
    }
    await enforceRateLimit(ctx, "joinSubmitGlobal");
    if (identity) await enforceRateLimit(ctx, "joinSubmitUser", identity.subject);
    const now = Date.now();
    const joinRequestId = await ctx.db.insert("joinRequests", {
      name,
      email,
      normalizedEmail: email,
      ...(applicantClerkUserId ? { applicantClerkUserId } : {}),
      ...(identity?.email ? { applicantEmailSnapshot: identity.email.trim().toLowerCase() } : {}),
      contact,
      normalizedContact,
      city,
      bookInterest: args.bookInterest,
      note: optionalText(args.note, "note", 500),
      source: "website",
      acknowledged: true,
      status: "submitted",
      invitationStatus: "not_ready",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    await notifyAdmins(ctx, {
      surface: "inbox",
      eventType: "join_request.submitted",
      title: "Permintaan bergabung baru",
      body: `${name} mengirim permintaan bergabung.`,
      destination: "/admin/join-requests",
      relatedEntityType: "joinRequest",
      relatedEntityId: String(joinRequestId),
    });
    await notifyAdmins(ctx, {
      surface: "notification",
      eventType: "join_request.submitted",
      title: "Join Request baru",
      body: `${name} menunggu tinjauan Admin.`,
      destination: "/admin/join-requests",
      relatedEntityType: "joinRequest",
      relatedEntityId: String(joinRequestId),
    });
    const configuredGroupUrl = process.env.BFG_JOIN_WHATSAPP_GROUP_URL;
    let whatsappGroupUrl: string | null = null;
    if (configuredGroupUrl) {
      try {
        const url = new URL(configuredGroupUrl);
        if (url.protocol === "https:" || url.protocol === "http:") whatsappGroupUrl = url.toString();
      } catch {
        whatsappGroupUrl = null;
      }
    }
    return { joinRequestId, status: "submitted" as const, whatsappGroupUrl };
  },
});

export const mine = query({
  args: {},
  handler: async (ctx) => {
    const identity = await requireIdentity(ctx);
    const byClerkUserId = await ctx.db
      .query("joinRequests")
      .withIndex("by_applicant_clerk_user_id", (index) => index.eq("applicantClerkUserId", identity.subject))
      .order("desc")
      .take(50);
    const normalizedEmail = identity.email?.trim().toLowerCase();
    const byEmail = normalizedEmail
      ? await ctx.db
          .query("joinRequests")
          .withIndex("by_normalized_email", (index) => index.eq("normalizedEmail", normalizedEmail))
          .order("desc")
          .take(50)
      : [];
    const requests = [...byClerkUserId, ...byEmail]
      .filter((request, index, all) => all.findIndex((candidate) => candidate._id === request._id) === index)
      .sort((left, right) => right.submittedAt - left.submittedAt);
    return Promise.all(requests.map((request) => requestView(ctx, request)));
  },
});

export const pendingCount = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "customers.read");
    // ponytail: 200 per review state is the existing Admin queue ceiling; use a counter if this queue outgrows it.
    const [submitted, underReview] = await Promise.all([
      ctx.db
        .query("joinRequests")
        .withIndex("by_status_and_submitted_at", (index) => index.eq("status", "submitted"))
        .take(200),
      ctx.db
        .query("joinRequests")
        .withIndex("by_status_and_submitted_at", (index) => index.eq("status", "under_review"))
        .take(200),
    ]);
    return submitted.length + underReview.length;
  },
});

export const listForAdmin = query({
  args: { status: v.optional(joinRequestStatusValidator) },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "customers.read");
    const requests = args.status
      ? await ctx.db
          .query("joinRequests")
          .withIndex("by_status_and_submitted_at", (index) => index.eq("status", args.status!))
          .order("desc")
          .take(200)
      : await ctx.db.query("joinRequests").withIndex("by_submitted_at").order("desc").take(200);
    return Promise.all(requests.map((request) => requestView(ctx, request)));
  },
});

export const startReview = mutation({
  args: { joinRequestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const reviewer = await requirePermission(ctx, "customers.manage");
    const request = await getRequest(ctx, args.joinRequestId);
    requireStatus(request, "submitted");
    const now = Date.now();
    await ctx.db.patch(request._id, { status: "under_review", updatedAt: now });
    await recordAudit(ctx, reviewer._id, "join_request.review_started", "join_request", request._id);
    const updated = await ctx.db.get(request._id);
    if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    return requestView(ctx, updated);
  },
});

export const approve = mutation({
  args: {
    joinRequestId: v.id("joinRequests"),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requirePermission(ctx, "customers.manage");
    const request = await getRequest(ctx, args.joinRequestId);
    requireStatus(request, "under_review");
    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "approved",
      invitationStatus: "ready",
      reviewedAt: now,
      reviewedByUserId: reviewer._id,
      reviewNote: optionalText(args.reviewNote, "review note", 500),
      admissionError: undefined,
      updatedAt: now,
    });
    await recordAudit(ctx, reviewer._id, "join_request.approved", "join_request", request._id);
    let updated = await ctx.db.get(request._id);
    if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    if (updated.applicantClerkUserId) {
      try {
        const admitted = await admitApprovedJoinRequest(ctx, updated, reviewer._id);
        if (admitted) {
          await notifyUser(ctx, admitted._id, {
            surface: "notification",
            eventType: "join_request.approved",
            title: "Akun Blessfriend aktif",
            body: "Permintaan bergabungmu disetujui. Workspace customer sudah tersedia.",
            destination: "/account",
            relatedEntityType: "joinRequest",
            relatedEntityId: String(request._id),
          });
        }
      } catch {
        await ctx.db.patch(request._id, { admissionError: "Admission handoff needs retry.", updatedAt: Date.now() });
        await recordAudit(ctx, reviewer._id, "join_request.admission_failed", "join_request", request._id, {
          reason: "retry_required",
        });
      }
      updated = await ctx.db.get(request._id);
      if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    }
    return requestView(ctx, updated);
  },
});

export const retryAdmission = mutation({
  args: { joinRequestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const reviewer = await requirePermission(ctx, "customers.manage");
    const request = await getRequest(ctx, args.joinRequestId);
    requireStatus(request, "approved");
    if (!request.applicantClerkUserId) return requestView(ctx, request);
    try {
      await admitApprovedJoinRequest(ctx, request, reviewer._id);
      await ctx.db.patch(request._id, { admissionError: undefined, updatedAt: Date.now() });
    } catch {
      await ctx.db.patch(request._id, { admissionError: "Admission handoff needs retry.", updatedAt: Date.now() });
      await recordAudit(ctx, reviewer._id, "join_request.admission_failed", "join_request", request._id, {
        reason: "retry_required",
      });
    }
    const updated = await ctx.db.get(request._id);
    if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    return requestView(ctx, updated);
  },
});

export const reject = mutation({
  args: {
    joinRequestId: v.id("joinRequests"),
    rejectionReason: v.string(),
    reviewNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const reviewer = await requirePermission(ctx, "customers.manage");
    const request = await getRequest(ctx, args.joinRequestId);
    requireStatus(request, "under_review");
    const rejectionReason = args.rejectionReason.trim();
    if (!rejectionReason || rejectionReason.length > 500) {
      fail("JOIN_REQUEST_REJECTION_REASON_REQUIRED");
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      status: "rejected",
      invitationStatus: "not_ready",
      reviewedAt: now,
      reviewedByUserId: reviewer._id,
      reviewNote: optionalText(args.reviewNote, "review note", 500),
      rejectionReason,
      updatedAt: now,
    });
    await recordAudit(ctx, reviewer._id, "join_request.rejected", "join_request", request._id);
    const updated = await ctx.db.get(request._id);
    if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    return requestView(ctx, updated);
  },
});
