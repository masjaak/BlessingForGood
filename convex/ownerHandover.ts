import { v } from "convex/values";
import type { Doc } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import { internalMutation, internalQuery } from "./_generated/server";
import { recordAudit } from "./lib/audit";

/**
 * BFG ownership handover — privileged, temporary migration only.
 *
 * Neither function is public/client-callable. Run manually from the authenticated
 * Convex CLI against the intended deployment, after verifying Clerk identities.
 * Remove this file in a follow-up release once handover and acceptance are done.
 *
 * Important: the Convex environment variable BFG_OWNER_CLERK_USER_ID must still
 * reference the CURRENT owner when execute is called. Change it to the NEW
 * owner's Clerk subject only AFTER the database role swap and owner login QA.
 */
const MAX_STALE_LOGIN_MS = 30 * 24 * 60 * 60 * 1000;

function normalizedEmail(email: string): string {
  const result = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(result) || result.length > 254) {
    throw new Error("OWNER_TRANSFER_INVALID_EMAIL");
  }
  return result;
}

async function loadHandoverPlan(ctx: QueryCtx | MutationCtx, email: string) {
  const candidateEmail = normalizedEmail(email);
  const [owners, matchingUsers] = await Promise.all([
    ctx.db
      .query("appUsers")
      .withIndex("by_role", (q) => q.eq("role", "owner"))
      .take(2),
    ctx.db
      .query("appUsers")
      .withIndex("by_email_snapshot", (q) => q.eq("emailSnapshot", candidateEmail))
      .take(2),
  ]);

  const currentOwner = owners.length === 1 ? owners[0] : null;
  const recipient = matchingUsers.length === 1 ? matchingUsers[0] : null;
  const issues: string[] = [];

  if (owners.length !== 1) issues.push("EXPECTED_EXACTLY_ONE_OWNER");
  if (matchingUsers.length !== 1) issues.push("EXPECTED_ONE_RECIPIENT_WITH_MATCHING_EMAIL");
  if (currentOwner?.status !== "active") issues.push("CURRENT_OWNER_NOT_ACTIVE");
  if (recipient?.status !== "active") issues.push("RECIPIENT_NOT_ACTIVE");
  if (recipient && recipient.role === "owner") issues.push("RECIPIENT_ALREADY_OWNER");
  if (currentOwner && recipient && currentOwner._id === recipient._id) issues.push("SAME_USER");
  if (recipient && Date.now() - recipient.lastSeenAt > MAX_STALE_LOGIN_MS) {
    issues.push("RECIPIENT_NEEDS_FRESH_SIGN_IN");
  }
  if (!currentOwner || process.env.BFG_OWNER_CLERK_USER_ID?.trim() !== currentOwner.clerkUserId) {
    issues.push("OWNER_ENV_NOT_MATCHING_CURRENT_OWNER");
  }
  return { currentOwner, recipient, issues };
}

export const preflight = internalQuery({
  args: { newOwnerEmail: v.string() },
  returns: v.object({
    ready: v.boolean(),
    blockers: v.array(v.string()),
    currentOwnerAppUserId: v.union(v.id("appUsers"), v.null()),
    currentOwnerClerkUserId: v.union(v.string(), v.null()),
    currentOwnerEmailSnapshot: v.union(v.string(), v.null()),
    recipientAppUserId: v.union(v.id("appUsers"), v.null()),
    recipientClerkUserId: v.union(v.string(), v.null()),
    recipientEmailSnapshot: v.union(v.string(), v.null()),
    recipientRole: v.union(v.string(), v.null()),
    recipientStatus: v.union(v.string(), v.null()),
    recipientLastSeenAt: v.union(v.number(), v.null()),
  }),
  handler: async (ctx, args) => {
    const { currentOwner, recipient, issues } = await loadHandoverPlan(ctx, args.newOwnerEmail);
    return {
      ready: issues.length === 0,
      blockers: issues,
      currentOwnerAppUserId: currentOwner?._id ?? null,
      currentOwnerClerkUserId: currentOwner?.clerkUserId ?? null,
      currentOwnerEmailSnapshot: currentOwner?.emailSnapshot ?? null,
      recipientAppUserId: recipient?._id ?? null,
      recipientClerkUserId: recipient?.clerkUserId ?? null,
      recipientEmailSnapshot: recipient?.emailSnapshot ?? null,
      recipientRole: recipient?.role ?? null,
      recipientStatus: recipient?.status ?? null,
      recipientLastSeenAt: recipient?.lastSeenAt ?? null,
    };
  },
});

export const execute = internalMutation({
  args: {
    newOwnerEmail: v.string(),
    expectedOldOwnerAppUserId: v.id("appUsers"),
    expectedOldOwnerClerkUserId: v.string(),
    expectedNewOwnerAppUserId: v.id("appUsers"),
    expectedNewOwnerClerkUserId: v.string(),
    confirmation: v.literal("APPROVE_BFG_OWNER_HANDOVER"),
  },
  returns: v.object({
    transferred: v.literal(true),
    previousOwnerAppUserId: v.id("appUsers"),
    newOwnerAppUserId: v.id("appUsers"),
    previousOwnerRole: v.literal("admin"),
    newOwnerRole: v.literal("owner"),
  }),
  handler: async (ctx, args) => {
    const { currentOwner, recipient, issues } = await loadHandoverPlan(ctx, args.newOwnerEmail);
    if (issues.length || !currentOwner || !recipient) {
      throw new Error(`OWNER_TRANSFER_BLOCKED: ${issues.join(", ")}`);
    }
    if (
      currentOwner._id !== args.expectedOldOwnerAppUserId ||
      currentOwner.clerkUserId !== args.expectedOldOwnerClerkUserId ||
      recipient._id !== args.expectedNewOwnerAppUserId ||
      recipient.clerkUserId !== args.expectedNewOwnerClerkUserId
    ) {
      throw new Error("OWNER_TRANSFER_IDENTITY_CHANGED");
    }

    // Both role writes and audit occur within ONE Convex mutation transaction.
    // Keep prior owner active as Admin until Madina signs in and completes UAT.
    const now = Date.now();
    await ctx.db.patch(currentOwner._id, { role: "admin", updatedAt: now });
    await ctx.db.patch(recipient._id, { role: "owner", updatedAt: now });
    await recordAudit(ctx, currentOwner._id, "owner.handover.completed", "appUser", recipient._id, {
      previousOwnerAppUserId: String(currentOwner._id),
      previousOwnerRole: "owner",
      recipientPreviousRole: recipient.role,
      newOwnerRole: "owner",
    });
    return {
      transferred: true as const,
      previousOwnerAppUserId: currentOwner._id,
      newOwnerAppUserId: recipient._id,
      previousOwnerRole: "admin" as const,
      newOwnerRole: "owner" as const,
    };
  },
});
