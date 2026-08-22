import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import {
  accessCodeDigests,
  catalogSessionDigest,
  randomAccessCode,
  randomCatalogSessionToken,
} from "./lib/accessCodes";
import { findCurrentUser, requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { catalogIsOpen, getCatalogView } from "./lib/catalogView";
import { constantTimeEqual, keyedDigest } from "./lib/crypto";
import { fail } from "./lib/errors";
import { requireConfiguredSecret } from "./lib/previewCapability";
import { OPEN_ENDED_TIMESTAMP_MS } from "./lib/sessions";
import { requiredText } from "./lib/validation";
import { notifyUser } from "./lib/notifications";
import { enforceRateLimit } from "./lib/rateLimit";

const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;
const CATALOG_SESSION_TTL_MS = 24 * 60 * 60 * 1000;

type UnlockErrorCode = "ACCESS_CODE_INVALID" | "ACCESS_CODE_EXPIRED" | "CATALOG_NOT_OPEN" | "ACCESS_CODE_RATE_LIMITED";

function anonymousAttemptKey(args: { attemptKey?: string }): string {
  return requiredText(args.attemptKey || "", "attempt key");
}

async function anonymousAttemptDigest(attemptKey: string): Promise<string> {
  return keyedDigest(requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"), "catalog-attempt", attemptKey);
}

async function anonymousAttempt(ctx: MutationCtx, attemptKey: string) {
  const subjectDigest = await anonymousAttemptDigest(attemptKey);
  const attempt = await ctx.db
    .query("catalogAccessAnonymousAttempts")
    .withIndex("by_subject_digest", (query) => query.eq("subjectDigest", subjectDigest))
    .first();
  return { subjectDigest, attempt };
}

async function rejectAnonymousUnlock(ctx: MutationCtx, attemptKey: string, code: UnlockErrorCode) {
  const now = Date.now();
  const { subjectDigest, attempt } = await anonymousAttempt(ctx, attemptKey);
  if (attempt?.lockedUntil && attempt.lockedUntil > now) return { errorCode: "ACCESS_CODE_RATE_LIMITED" as const };
  const inWindow = attempt && now - attempt.windowStartedAt < FAILED_ATTEMPT_WINDOW_MS;
  const failedCount = inWindow ? attempt.failedCount + 1 : 1;
  const values = {
    windowStartedAt: inWindow ? attempt.windowStartedAt : now,
    failedCount,
    lockedUntil: failedCount >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : undefined,
    updatedAt: now,
  };
  if (attempt) await ctx.db.patch(attempt._id, values);
  else await ctx.db.insert("catalogAccessAnonymousAttempts", { subjectDigest, ...values });
  return { errorCode: code };
}

async function anonymousAccessIsLocked(ctx: MutationCtx, attemptKey: string): Promise<boolean> {
  const { attempt } = await anonymousAttempt(ctx, attemptKey);
  return Boolean(attempt?.lockedUntil && attempt.lockedUntil > Date.now());
}

async function clearAnonymousAttempts(ctx: MutationCtx, attemptKey: string): Promise<void> {
  const { attempt } = await anonymousAttempt(ctx, attemptKey);
  if (attempt) {
    await ctx.db.patch(attempt._id, {
      failedCount: 0,
      windowStartedAt: Date.now(),
      lockedUntil: undefined,
      updatedAt: Date.now(),
    });
  }
}

async function rejectUnlock(
  ctx: MutationCtx,
  user: Awaited<ReturnType<typeof requirePermission>>,
  code: "ACCESS_CODE_INVALID" | "ACCESS_CODE_EXPIRED" | "CATALOG_NOT_OPEN",
): Promise<{
  errorCode: "ACCESS_CODE_INVALID" | "ACCESS_CODE_EXPIRED" | "CATALOG_NOT_OPEN" | "ACCESS_CODE_RATE_LIMITED";
}> {
  const now = Date.now();
  const attempt = await ctx.db
    .query("catalogAccessAttempts")
    .withIndex("by_app_user_id", (query) => query.eq("appUserId", user._id))
    .first();
  if (attempt?.lockedUntil && attempt.lockedUntil > now) return { errorCode: "ACCESS_CODE_RATE_LIMITED" };
  const inWindow = attempt && now - attempt.windowStartedAt < FAILED_ATTEMPT_WINDOW_MS;
  const failedCount = inWindow ? attempt.failedCount + 1 : 1;
  const values = {
    windowStartedAt: inWindow ? attempt.windowStartedAt : now,
    failedCount,
    lockedUntil: failedCount >= MAX_FAILED_ATTEMPTS ? now + LOCKOUT_MS : undefined,
    updatedAt: now,
  };
  if (attempt) await ctx.db.patch(attempt._id, values);
  else await ctx.db.insert("catalogAccessAttempts", { appUserId: user._id, ...values });
  return { errorCode: code };
}

async function clearUnlockAttempts(
  ctx: MutationCtx,
  user: Awaited<ReturnType<typeof requirePermission>>,
): Promise<void> {
  const attempt = await ctx.db
    .query("catalogAccessAttempts")
    .withIndex("by_app_user_id", (query) => query.eq("appUserId", user._id))
    .first();
  if (attempt) {
    await ctx.db.patch(attempt._id, {
      failedCount: 0,
      windowStartedAt: Date.now(),
      lockedUntil: undefined,
      updatedAt: Date.now(),
    });
  }
}

export const setCode = mutation({
  args: {
    catalogId: v.id("secretCatalogs"),
    accessCode: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) fail("VALIDATION_FAILED", "expiry is invalid");
    const code = requiredText(args.accessCode, "access code");
    const digests = await accessCodeDigests(args.catalogId, code);
    const active = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_catalog_and_active", (query) => query.eq("catalogId", args.catalogId).eq("isActive", true))
      .take(10);
    const duplicateLookup = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", digests.lookupDigest))
      .first();
    if (duplicateLookup && duplicateLookup.catalogId !== args.catalogId)
      fail("VALIDATION_FAILED", "access code is in use");
    for (const record of active) await ctx.db.patch(record._id, { isActive: false, updatedAt: Date.now() });
    const now = Date.now();
    const codeId = await ctx.db.insert("catalogAccessCodes", {
      catalogId: args.catalogId,
      ...digests,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });
    await recordAudit(ctx, user._id, "catalog.access_code_changed", "catalog", args.catalogId);
    return codeId;
  },
});

export const generateCode = mutation({
  args: { catalogId: v.id("secretCatalogs"), expiresAt: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (catalog.status === "archived" || catalog.status === "closed") fail("CATALOG_CLOSED");
    if (args.expiresAt !== undefined && args.expiresAt <= Date.now()) fail("VALIDATION_FAILED", "expiry is invalid");
    const code = randomAccessCode();
    const now = Date.now();
    const active = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_catalog_and_active", (query) => query.eq("catalogId", args.catalogId).eq("isActive", true))
      .take(10);
    for (const record of active) await ctx.db.patch(record._id, { isActive: false, updatedAt: now });
    const codeId = await ctx.db.insert("catalogAccessCodes", {
      catalogId: args.catalogId,
      ...(await accessCodeDigests(args.catalogId, code)),
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });
    await recordAudit(ctx, user._id, "catalog.access_code_generated", "catalog", args.catalogId);
    return { catalogId: args.catalogId, codeId, code, expiresAt: args.expiresAt ?? null };
  },
});

export const listForAdmin = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, "catalog.manage");
    if (!(await ctx.db.get(args.catalogId))) fail("CATALOG_NOT_FOUND");
    const now = Date.now();
    const codes = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_catalog", (query) => query.eq("catalogId", args.catalogId))
      .order("desc")
      .take(100);
    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_catalog", (query) => query.eq("catalogId", args.catalogId))
      .order("desc")
      .take(200);
    return {
      codes: codes.map((code) => ({
        codeId: code._id,
        isActive: code.isActive,
        status: !code.isActive ? "revoked" : code.expiresAt && code.expiresAt <= now ? "expired" : "active",
        createdAt: code.createdAt,
        expiresAt: code.expiresAt ?? null,
      })),
      grants: await Promise.all(
        grants.map(async (grant) => {
          const customer = await ctx.db.get(grant.appUserId);
          return {
            grantId: grant._id,
            appUserId: grant.appUserId,
            customerName: customer?.displayNameSnapshot || customer?.emailSnapshot || "Member",
            customerEmail: customer?.emailSnapshot ?? null,
            status: grant.revokedAt ? "revoked" : grant.expiresAt <= now ? "expired" : "active",
            grantedAt: grant.grantedAt,
            expiresAt: grant.expiresAt,
            revokedAt: grant.revokedAt ?? null,
          };
        }),
      ),
    };
  },
});

export const revokeGrant = mutation({
  args: { grantId: v.id("catalogAccessGrants") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const grant = await ctx.db.get(args.grantId);
    if (!grant) fail("CATALOG_ACCESS_GRANT_NOT_FOUND");
    if (!grant.revokedAt) await ctx.db.patch(grant._id, { revokedAt: Date.now() });
    await recordAudit(ctx, user._id, "catalog.access_grant_revoked", "catalog", grant.catalogId, {
      memberId: String(grant.appUserId),
    });
    return { revoked: true };
  },
});

export const grantMember = mutation({
  args: { catalogId: v.id("secretCatalogs"), appUserId: v.id("appUsers"), expiresAt: v.number() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const [catalog, member] = await Promise.all([ctx.db.get(args.catalogId), ctx.db.get(args.appUserId)]);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (!member || member.role !== "customer" || member.status !== "active")
      fail("VALIDATION_FAILED", "member is unavailable");
    if (args.expiresAt <= Date.now() || (catalog.closesAt && args.expiresAt > catalog.closesAt)) {
      fail("VALIDATION_FAILED", "grant expiry is invalid");
    }
    const existing = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id_and_catalog_id", (query) =>
        query.eq("appUserId", args.appUserId).eq("catalogId", args.catalogId),
      )
      .first();
    const now = Date.now();
    let grantId;
    if (existing) {
      await ctx.db.patch(existing._id, { grantedAt: now, expiresAt: args.expiresAt, revokedAt: undefined });
      grantId = existing._id;
    } else {
      grantId = await ctx.db.insert("catalogAccessGrants", {
        appUserId: args.appUserId,
        catalogId: args.catalogId,
        grantedAt: now,
        expiresAt: args.expiresAt,
      });
    }
    await recordAudit(ctx, user._id, "catalog.access_granted", "catalog", args.catalogId, {
      memberId: String(args.appUserId),
    });
    await notifyUser(ctx, args.appUserId, {
      surface: "inbox",
      eventType: "catalog.access_granted",
      title: "Akses Secret Catalog diberikan",
      body: `${catalog.name} kini tersedia untuk akunmu.`,
      destination: "/catalog",
      relatedEntityType: "catalog",
      relatedEntityId: String(args.catalogId),
    });
    return grantId;
  },
});

export const revokeCode = mutation({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    const active = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_catalog_and_active", (query) => query.eq("catalogId", args.catalogId).eq("isActive", true))
      .take(10);
    const now = Date.now();
    for (const record of active) await ctx.db.patch(record._id, { isActive: false, updatedAt: now });
    await recordAudit(ctx, user._id, "catalog.access_code_revoked", "catalog", args.catalogId);
    return { revoked: active.length };
  },
});

export const unlock = mutation({
  args: { accessCode: v.string(), attemptKey: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const member = identity ? await findCurrentUser(ctx, identity) : null;
    const memberCanReceiveGrant = Boolean(member && member.status === "active");
    await enforceRateLimit(ctx, "catalogUnlockGlobal");
    if (memberCanReceiveGrant) await enforceRateLimit(ctx, "catalogUnlockUser", String(member!._id));
    const attemptKey = memberCanReceiveGrant ? undefined : anonymousAttemptKey(args);
    if (attemptKey && (await anonymousAccessIsLocked(ctx, attemptKey))) {
      return { errorCode: "ACCESS_CODE_RATE_LIMITED" as const };
    }
    const code = requiredText(args.accessCode, "access code");
    const lookupDigest = await keyedDigest(
      requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access-lookup",
      code,
    );
    const record = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", lookupDigest))
      .first();
    if (!record || !record.isActive)
      return attemptKey
        ? rejectAnonymousUnlock(ctx, attemptKey, "ACCESS_CODE_INVALID")
        : rejectUnlock(ctx, member!, "ACCESS_CODE_INVALID");
    if (record.expiresAt && record.expiresAt <= Date.now())
      return attemptKey
        ? rejectAnonymousUnlock(ctx, attemptKey, "ACCESS_CODE_EXPIRED")
        : rejectUnlock(ctx, member!, "ACCESS_CODE_EXPIRED");
    const expected = await keyedDigest(
      requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access",
      `${record.catalogId}:${code}`,
    );
    if (!constantTimeEqual(expected, record.codeDigest))
      return attemptKey
        ? rejectAnonymousUnlock(ctx, attemptKey, "ACCESS_CODE_INVALID")
        : rejectUnlock(ctx, member!, "ACCESS_CODE_INVALID");
    const catalog = await ctx.db.get(record.catalogId);
    if (!catalog || !(await catalogIsOpen(ctx, record.catalogId)))
      return attemptKey
        ? rejectAnonymousUnlock(ctx, attemptKey, "CATALOG_NOT_OPEN")
        : rejectUnlock(ctx, member!, "CATALOG_NOT_OPEN");
    const now = Date.now();
    const expiresAt = Math.min(
      catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS,
      record.expiresAt || OPEN_ENDED_TIMESTAMP_MS,
      now + CATALOG_SESSION_TTL_MS,
    );
    const sessionToken = randomCatalogSessionToken();
    await ctx.db.insert("catalogAccessSessions", {
      catalogId: record.catalogId,
      accessCodeId: record._id,
      sessionDigest: await catalogSessionDigest(sessionToken),
      createdAt: now,
      expiresAt,
    });
    if (memberCanReceiveGrant) {
      await clearUnlockAttempts(ctx, member!);
      const existing = await ctx.db
        .query("catalogAccessGrants")
        .withIndex("by_app_user_id_and_catalog_id", (query) =>
          query.eq("appUserId", member!._id).eq("catalogId", record.catalogId),
        )
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { grantedAt: now, expiresAt, revokedAt: undefined });
      } else {
        await ctx.db.insert("catalogAccessGrants", {
          appUserId: member!._id,
          catalogId: record.catalogId,
          grantedAt: now,
          expiresAt,
        });
      }
    } else {
      await clearAnonymousAttempts(ctx, attemptKey!);
    }
    return {
      catalogId: record.catalogId,
      expiresAt,
      sessionToken,
      catalog: await getCatalogView(ctx, record.catalogId),
    };
  },
});

export const getUnlocked = query({
  args: { catalogId: v.id("secretCatalogs"), sessionToken: v.optional(v.string()) },
  handler: async (ctx, args) => {
    if (args.sessionToken) {
      const sessionDigest = await catalogSessionDigest(args.sessionToken);
      const session = await ctx.db
        .query("catalogAccessSessions")
        .withIndex("by_session_digest", (query) => query.eq("sessionDigest", sessionDigest))
        .first();
      if (!session || session.catalogId !== args.catalogId || session.revokedAt || session.expiresAt <= Date.now()) {
        return null;
      }
      const code = await ctx.db.get(session.accessCodeId);
      if (!code || !code.isActive || (code.expiresAt && code.expiresAt <= Date.now())) return null;
      if (!(await catalogIsOpen(ctx, args.catalogId))) return null;
      return getCatalogView(ctx, args.catalogId);
    }
    const user = await requirePermission(ctx, "catalog.read");
    const grant = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id_and_catalog_id", (query) =>
        query.eq("appUserId", user._id).eq("catalogId", args.catalogId),
      )
      .first();
    if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) return null;
    if (!(await catalogIsOpen(ctx, args.catalogId))) return null;
    return getCatalogView(ctx, args.catalogId);
  },
});

export const listAccessible = query({
  args: { paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.read");
    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id", (query) => query.eq("appUserId", user._id))
      .order("desc")
      .paginate(args.paginationOpts);
    const page = await Promise.all(
      grants.page.map(async (grant) => {
        if (grant.revokedAt || grant.expiresAt <= Date.now() || !(await catalogIsOpen(ctx, grant.catalogId))) {
          return null;
        }
        return getCatalogView(ctx, grant.catalogId);
      }),
    );
    return { ...grants, page: page.filter((catalog) => catalog !== null) };
  },
});
