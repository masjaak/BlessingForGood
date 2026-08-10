import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { fail } from "./lib/errors";
import { joinRequestStatusValidator } from "./validators";

type JoinRequestStatus = "submitted" | "under_review" | "approved" | "rejected";

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
  if (contact.length < 5) fail("VALIDATION_FAILED", "contact is invalid");
  return contact;
}

async function hasActiveEmailDuplicate(ctx: MutationCtx, normalizedEmail: string): Promise<boolean> {
  const matches = await ctx.db
    .query("joinRequests")
    .withIndex("by_normalized_email", (index) => index.eq("normalizedEmail", normalizedEmail))
    .take(50);
  return matches.some((request) => duplicateStatuses.has(request.status));
}

async function hasActiveContactDuplicate(ctx: MutationCtx, normalizedContact: string): Promise<boolean> {
  const matches = await ctx.db
    .query("joinRequests")
    .withIndex("by_normalized_contact", (index) => index.eq("normalizedContact", normalizedContact))
    .take(50);
  return matches.some((request) => duplicateStatuses.has(request.status));
}

function requestView(request: Doc<"joinRequests">) {
  return {
    joinRequestId: request._id,
    name: request.name,
    email: request.email,
    contact: request.contact,
    city: request.city ?? null,
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
    city: v.optional(v.string()),
    note: v.optional(v.string()),
    acknowledged: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (!args.acknowledged) fail("JOIN_REQUEST_ACKNOWLEDGEMENT_REQUIRED");
    const name = requiredText(args.name, "name", 120);
    const email = normalizeEmail(args.email);
    const contact = requiredText(args.contact, "contact", 80);
    const normalizedContact = normalizeContact(contact);
    if ((await hasActiveEmailDuplicate(ctx, email)) || (await hasActiveContactDuplicate(ctx, normalizedContact))) {
      fail("JOIN_REQUEST_DUPLICATE");
    }
    const now = Date.now();
    const joinRequestId = await ctx.db.insert("joinRequests", {
      name,
      email,
      normalizedEmail: email,
      contact,
      normalizedContact,
      city: optionalText(args.city, "city", 120),
      note: optionalText(args.note, "note", 500),
      source: "website",
      acknowledged: true,
      status: "submitted",
      invitationStatus: "not_ready",
      submittedAt: now,
      createdAt: now,
      updatedAt: now,
    });
    return { joinRequestId, status: "submitted" as const };
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
    return requests.map(requestView);
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
    return requestView(updated);
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
      updatedAt: now,
    });
    await recordAudit(ctx, reviewer._id, "join_request.approved", "join_request", request._id);
    const updated = await ctx.db.get(request._id);
    if (!updated) fail("JOIN_REQUEST_NOT_FOUND");
    return requestView(updated);
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
    return requestView(updated);
  },
});
