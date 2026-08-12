import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { mutation, query } from "./_generated/server";
import { accessCodeDigests, randomAccessCode } from "./lib/accessCodes";
import { requirePermission } from "./lib/auth";
import { recordAudit } from "./lib/audit";
import { catalogIsOpen, getCatalogView } from "./lib/catalogView";
import { constantTimeEqual, keyedDigest } from "./lib/crypto";
import { fail } from "./lib/errors";
import { requireConfiguredSecret } from "./lib/previewCapability";
import { OPEN_ENDED_TIMESTAMP_MS } from "./lib/sessions";
import { requiredText } from "./lib/validation";

const FAILED_ATTEMPT_WINDOW_MS = 15 * 60 * 1000;
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000;

async function rejectUnlock(
  ctx: MutationCtx,
  user: Awaited<ReturnType<typeof requirePermission>>,
  code: "ACCESS_CODE_INVALID" | "ACCESS_CODE_EXPIRED" | "CATALOG_NOT_OPEN",
): Promise<{ errorCode: "ACCESS_CODE_INVALID" | "ACCESS_CODE_EXPIRED" | "CATALOG_NOT_OPEN" | "ACCESS_CODE_RATE_LIMITED" }> {
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
  args: { accessCode: v.string() },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.read");
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
    if (!record || !record.isActive) return rejectUnlock(ctx, user, "ACCESS_CODE_INVALID");
    if (record.expiresAt && record.expiresAt <= Date.now()) return rejectUnlock(ctx, user, "ACCESS_CODE_EXPIRED");
    const expected = await keyedDigest(
      requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access",
      `${record.catalogId}:${code}`,
    );
    if (!constantTimeEqual(expected, record.codeDigest)) return rejectUnlock(ctx, user, "ACCESS_CODE_INVALID");
    const catalog = await ctx.db.get(record.catalogId);
    if (!catalog || !(await catalogIsOpen(ctx, record.catalogId))) return rejectUnlock(ctx, user, "CATALOG_NOT_OPEN");
    await clearUnlockAttempts(ctx, user);
    const existing = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_app_user_id_and_catalog_id", (query) =>
        query.eq("appUserId", user._id).eq("catalogId", record.catalogId),
      )
      .first();
    const now = Date.now();
    const expiresAt = Math.min(catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS, now + 24 * 60 * 60 * 1000);
    if (existing) {
      await ctx.db.patch(existing._id, { grantedAt: now, expiresAt, revokedAt: undefined });
    } else {
      await ctx.db.insert("catalogAccessGrants", {
        appUserId: user._id,
        catalogId: record.catalogId,
        grantedAt: now,
        expiresAt,
      });
    }
    return { catalogId: record.catalogId, expiresAt, catalog: await getCatalogView(ctx, record.catalogId) };
  },
});

export const getUnlocked = query({
  args: { catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
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
