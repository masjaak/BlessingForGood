import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { constantTimeEqual } from "./lib/crypto";
import { requirePreviewCapability, requirePreviewSecret } from "./lib/previewCapability";
import { findSession, requireSession, sessionDigest, SESSION_TTL_MS } from "./lib/sessions";

const sessionRoleValidator = v.union(v.literal("customer"), v.literal("admin"));

export const createCustomer = mutation({
  args: { token: v.string() },
  returns: v.object({ role: sessionRoleValidator, expiresAt: v.number() }),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const digest = await sessionDigest(args.token);
    const existing = await ctx.db
      .query("prototypeSessions")
      .withIndex("by_token_digest", (query) => query.eq("tokenDigest", digest))
      .unique();
    const now = Date.now();
    if (existing && !existing.revokedAt && existing.expiresAt > now) {
      return { role: existing.role, expiresAt: existing.expiresAt };
    }
    if (existing) {
      await ctx.db.patch(existing._id, {
        tokenDigest: digest,
        role: "customer",
        createdAt: now,
        expiresAt: now + SESSION_TTL_MS,
        revokedAt: undefined,
        failedAdminAttempts: 0,
        adminLockedUntil: undefined,
      });
      return { role: "customer" as const, expiresAt: now + SESSION_TTL_MS };
    }
    const sessionId = await ctx.db.insert("prototypeSessions", {
      tokenDigest: digest,
      role: "customer",
      createdAt: now,
      expiresAt: now + SESSION_TTL_MS,
      failedAdminAttempts: 0,
    });
    const session = await ctx.db.get(sessionId);
    if (!session) throw new Error("session creation failed");
    return { role: session.role, expiresAt: session.expiresAt };
  },
});

export const claimAdmin = mutation({
  args: { token: v.string(), accessCode: v.string() },
  returns: v.object({
    ok: v.boolean(),
    role: v.optional(sessionRoleValidator),
    expiresAt: v.optional(v.number()),
    code: v.optional(v.string()),
  }),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const session = await requireSession(ctx, args.token);
    if (session.role === "admin") return { ok: true, role: "admin" as const, expiresAt: session.expiresAt };

    const now = Date.now();
    if (session.adminLockedUntil && session.adminLockedUntil > now) {
      return { ok: false, code: "ADMIN_ACCESS_LOCKED" };
    }
    const expected = requirePreviewSecret("BFG_PREVIEW_ADMIN_ACCESS_CODE");
    if (!constantTimeEqual(expected, args.accessCode)) {
      const failedAdminAttempts = (session.failedAdminAttempts || 0) + 1;
      await ctx.db.patch(session._id, {
        failedAdminAttempts,
        adminLockedUntil: failedAdminAttempts >= 5 ? now + 30_000 : undefined,
      });
      return { ok: false, code: "ADMIN_CODE_INVALID" };
    }

    await ctx.db.patch(session._id, {
      role: "admin",
      failedAdminAttempts: 0,
      adminLockedUntil: undefined,
      lastSeenAt: now,
    });
    return { ok: true, role: "admin" as const, expiresAt: session.expiresAt };
  },
});

export const me = query({
  args: { token: v.string() },
  returns: v.union(v.object({ role: sessionRoleValidator, expiresAt: v.number() }), v.null()),
  handler: async (ctx, args) => {
    requirePreviewCapability();
    const session = await findSession(ctx, args.token);
    if (!session || session.revokedAt || session.expiresAt <= Date.now()) return null;
    return { role: session.role, expiresAt: session.expiresAt };
  },
});
