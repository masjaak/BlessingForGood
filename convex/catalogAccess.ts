import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import type { MutationCtx, QueryCtx } from "./_generated/server";
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
const PERIOD_CATALOG_LIMIT = 500;

type AccessContext = MutationCtx | QueryCtx;
type AccessPeriodStatus = "active" | "inactive" | "expired";

function accessPeriodStatus(period: Doc<"catalogAccessPeriods">, now = Date.now()): AccessPeriodStatus {
  if (period.endsAt !== undefined && period.endsAt <= now) return "expired";
  if (!period.isActive || (period.startsAt !== undefined && period.startsAt > now)) return "inactive";
  return "active";
}

async function allPeriodCatalogs(ctx: AccessContext, periodId: Id<"catalogAccessPeriods">) {
  // ponytail: bounded 500-catalog period fan-out; paginate only if one access period exceeds this ceiling.
  return ctx.db
    .query("secretCatalogs")
    .withIndex("by_access_period", (query) => query.eq("accessPeriodId", periodId))
    .take(PERIOD_CATALOG_LIMIT);
}

async function periodCatalogs(ctx: AccessContext, periodId: Id<"catalogAccessPeriods">) {
  const catalogs = await allPeriodCatalogs(ctx, periodId);
  return catalogs.filter((catalog) => catalog.status === "open" && (!catalog.closesAt || catalog.closesAt > Date.now()));
}

function catalogAccessSummary(view: Awaited<ReturnType<typeof getCatalogView>>) {
  return {
    id: view.id,
    name: view.name,
    status: view.status,
    closingAt: view.closingAt,
    estimatedArrivalMonth: view.estimatedArrivalMonth,
    titleCount: view.titleCount,
  };
}

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

async function deactivateCatalogCodes(ctx: MutationCtx, catalogId: Id<"secretCatalogs">, now: number) {
  const active = await ctx.db
    .query("catalogAccessCodes")
    .withIndex("by_catalog_and_active", (query) => query.eq("catalogId", catalogId).eq("isActive", true))
    .take(10);
  for (const record of active) await ctx.db.patch(record._id, { isActive: false, updatedAt: now });
}

async function upsertCatalogGrant(
  ctx: MutationCtx,
  appUserId: Id<"appUsers">,
  catalogId: Id<"secretCatalogs">,
  grantedAt: number,
  expiresAt: number,
) {
  const existing = await ctx.db
    .query("catalogAccessGrants")
    .withIndex("by_app_user_id_and_catalog_id", (query) => query.eq("appUserId", appUserId).eq("catalogId", catalogId))
    .first();
  if (existing) {
    await ctx.db.patch(existing._id, { grantedAt, expiresAt, revokedAt: undefined });
  } else {
    await ctx.db.insert("catalogAccessGrants", { appUserId, catalogId, grantedAt, expiresAt });
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
    if (catalog.accessPeriodId) fail("VALIDATION_FAILED", "catalog uses an access period");
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
    if (catalog.accessPeriodId) fail("VALIDATION_FAILED", "catalog uses an access period");
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
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
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
    const period = catalog.accessPeriodId ? await ctx.db.get(catalog.accessPeriodId) : null;
    const linkedPeriodCatalogs = period ? await allPeriodCatalogs(ctx, period._id) : [];
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
      period: period
        ? {
            periodId: period._id,
            label: period.label,
            status: accessPeriodStatus(period, now),
            startsAt: period.startsAt ?? null,
            endsAt: period.endsAt ?? null,
            catalogs: linkedPeriodCatalogs.map((linkedCatalog) => ({
              catalogId: linkedCatalog._id,
              name: linkedCatalog.name,
              status: linkedCatalog.status,
            })),
          }
        : null,
    };
  },
});

export const listPeriodsForAdmin = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, "catalog.manage");
    const periods = await ctx.db.query("catalogAccessPeriods").withIndex("by_created_at").order("desc").take(100);
    return Promise.all(
      periods.map(async (period) => ({
        periodId: period._id,
        label: period.label,
        status: accessPeriodStatus(period),
        startsAt: period.startsAt ?? null,
        endsAt: period.endsAt ?? null,
        catalogs: (await ctx.db
          .query("secretCatalogs")
          .withIndex("by_access_period", (query) => query.eq("accessPeriodId", period._id))
          .take(PERIOD_CATALOG_LIMIT)
        ).map((catalog) => ({ catalogId: catalog._id, name: catalog.name, status: catalog.status })),
      })),
    );
  },
});

export const createPeriod = mutation({
  args: {
    catalogId: v.id("secretCatalogs"),
    label: v.string(),
    accessCode: v.string(),
    startsAt: v.optional(v.number()),
    endsAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (catalog.accessPeriodId) fail("VALIDATION_FAILED", "catalog already uses an access period");
    const label = requiredText(args.label, "access period label");
    const code = requiredText(args.accessCode, "access code");
    const now = Date.now();
    const startsAt = args.startsAt ?? now;
    if (args.endsAt !== undefined && args.endsAt <= startsAt) {
      fail("VALIDATION_FAILED", "access period end is invalid");
    }
    const digests = await accessCodeDigests(args.catalogId, code);
    const [duplicateCode, duplicatePeriod] = await Promise.all([
      ctx.db
        .query("catalogAccessCodes")
        .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", digests.lookupDigest))
        .first(),
      ctx.db
        .query("catalogAccessPeriods")
        .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", digests.lookupDigest))
        .first(),
    ]);
    if (duplicateCode || duplicatePeriod) fail("VALIDATION_FAILED", "access code is in use");
    await deactivateCatalogCodes(ctx, args.catalogId, now);
    const periodId = await ctx.db.insert("catalogAccessPeriods", {
      anchorCatalogId: args.catalogId,
      label,
      ...digests,
      isActive: true,
      startsAt,
      endsAt: args.endsAt,
      createdAt: now,
      updatedAt: now,
      createdByUserId: user._id,
    });
    await ctx.db.patch(catalog._id, { accessPeriodId: periodId, updatedAt: now });
    await recordAudit(ctx, user._id, "catalog.access_period_created", "catalog", args.catalogId, {
      periodId: String(periodId),
    });
    return {
      periodId,
      catalogId: args.catalogId,
      label,
      code,
      startsAt,
      endsAt: args.endsAt ?? null,
    };
  },
});

export const attachPeriod = mutation({
  args: { catalogId: v.id("secretCatalogs"), periodId: v.id("catalogAccessPeriods") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const [catalog, period] = await Promise.all([ctx.db.get(args.catalogId), ctx.db.get(args.periodId)]);
    if (!catalog || !period) fail("CATALOG_NOT_FOUND");
    if (accessPeriodStatus(period) !== "active") fail("VALIDATION_FAILED", "access period is not active");
    if (catalog.accessPeriodId && catalog.accessPeriodId !== period._id) {
      fail("VALIDATION_FAILED", "catalog already uses another access period");
    }
    const now = Date.now();
    await deactivateCatalogCodes(ctx, args.catalogId, now);
    await ctx.db.patch(catalog._id, { accessPeriodId: period._id, updatedAt: now });
    await recordAudit(ctx, user._id, "catalog.access_period_attached", "catalog", args.catalogId, {
      periodId: String(period._id),
    });
    return { attached: true };
  },
});

export const detachPeriod = mutation({
  args: { catalogId: v.id("secretCatalogs"), periodId: v.id("catalogAccessPeriods") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
    if (catalog.accessPeriodId !== args.periodId) fail("VALIDATION_FAILED", "catalog period does not match");
    await ctx.db.patch(catalog._id, { accessPeriodId: undefined, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "catalog.access_period_detached", "catalog", args.catalogId, {
      periodId: String(args.periodId),
    });
    return { detached: true };
  },
});

export const revokePeriod = mutation({
  args: { periodId: v.id("catalogAccessPeriods") },
  handler: async (ctx, args) => {
    const user = await requirePermission(ctx, "catalog.manage");
    const period = await ctx.db.get(args.periodId);
    if (!period) fail("CATALOG_NOT_FOUND");
    if (period.isActive) await ctx.db.patch(period._id, { isActive: false, updatedAt: Date.now() });
    await recordAudit(ctx, user._id, "catalog.access_period_revoked", "catalog", period.anchorCatalogId, {
      periodId: String(period._id),
    });
    return { revoked: true };
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
    if (catalog.accessPeriodId) fail("VALIDATION_FAILED", "catalog uses an access period");
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
    if (identity && !memberCanReceiveGrant) return { errorCode: "ACCESS_CODE_INVALID" as const };
    const attemptKey = identity ? undefined : anonymousAttemptKey(args);
    if (attemptKey && (await anonymousAccessIsLocked(ctx, attemptKey))) {
      return { errorCode: "ACCESS_CODE_RATE_LIMITED" as const };
    }
    const code = requiredText(args.accessCode, "access code");
    const reject = (errorCode: Exclude<UnlockErrorCode, "ACCESS_CODE_RATE_LIMITED">) =>
      attemptKey ? rejectAnonymousUnlock(ctx, attemptKey, errorCode) : rejectUnlock(ctx, member!, errorCode);
    const lookupDigest = await keyedDigest(
      requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access-lookup",
      code,
    );
    const [record, period] = await Promise.all([
      ctx.db
        .query("catalogAccessCodes")
        .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", lookupDigest))
        .first(),
      ctx.db
        .query("catalogAccessPeriods")
        .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", lookupDigest))
        .first(),
    ]);
    const now = Date.now();
    if (period) {
      const status = accessPeriodStatus(period, now);
      if (status === "expired") return reject("ACCESS_CODE_EXPIRED");
      if (status !== "active") return reject("ACCESS_CODE_INVALID");
      const expected = await keyedDigest(
        requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
        "catalog-access",
        `${period.anchorCatalogId}:${code}`,
      );
      if (!constantTimeEqual(expected, period.codeDigest)) return reject("ACCESS_CODE_INVALID");
      const catalogs = await periodCatalogs(ctx, period._id);
      if (!catalogs.length) return reject("CATALOG_NOT_OPEN");
      const expiresAt = Math.min(period.endsAt || OPEN_ENDED_TIMESTAMP_MS, now + CATALOG_SESSION_TTL_MS);
      const sessionToken = randomCatalogSessionToken();
      await ctx.db.insert("catalogAccessSessions", {
        catalogId: catalogs[0]._id,
        accessPeriodId: period._id,
        sessionDigest: await catalogSessionDigest(sessionToken),
        createdAt: now,
        expiresAt,
      });
      if (memberCanReceiveGrant) {
        await clearUnlockAttempts(ctx, member!);
        for (const catalog of catalogs) {
          await upsertCatalogGrant(
            ctx,
            member!._id,
            catalog._id,
            now,
            Math.min(expiresAt, catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS),
          );
        }
      } else {
        await clearAnonymousAttempts(ctx, attemptKey!);
      }
      const views = await Promise.all(catalogs.map((catalog) => getCatalogView(ctx, catalog._id)));
      return {
        catalogId: catalogs[0]._id,
        expiresAt,
        sessionToken,
        catalog: views[0],
        catalogs: views.map(catalogAccessSummary),
      };
    }
    if (!record || !record.isActive) return reject("ACCESS_CODE_INVALID");
    if (record.expiresAt && record.expiresAt <= now) return reject("ACCESS_CODE_EXPIRED");
    const expected = await keyedDigest(
      requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access",
      `${record.catalogId}:${code}`,
    );
    if (!constantTimeEqual(expected, record.codeDigest)) return reject("ACCESS_CODE_INVALID");
    const catalog = await ctx.db.get(record.catalogId);
    if (!catalog || !(await catalogIsOpen(ctx, record.catalogId))) return reject("CATALOG_NOT_OPEN");
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
      await upsertCatalogGrant(ctx, member!._id, record.catalogId, now, expiresAt);
    } else {
      await clearAnonymousAttempts(ctx, attemptKey!);
    }
    const catalogView = await getCatalogView(ctx, record.catalogId);
    return {
      catalogId: record.catalogId,
      expiresAt,
      sessionToken,
      catalog: catalogView,
      catalogs: [catalogAccessSummary(catalogView)],
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
      if (!session || session.revokedAt || session.expiresAt <= Date.now()) {
        return null;
      }
      if (session.accessPeriodId) {
        const period = await ctx.db.get(session.accessPeriodId);
        const catalog = await ctx.db.get(args.catalogId);
        if (
          !period ||
          accessPeriodStatus(period) !== "active" ||
          !catalog ||
          catalog.accessPeriodId !== session.accessPeriodId ||
          !(await catalogIsOpen(ctx, args.catalogId))
        ) {
          return null;
        }
        return getCatalogView(ctx, args.catalogId);
      }
      if (session.catalogId !== args.catalogId) return null;
      if (!session.accessCodeId) return null;
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

export const listForSession = query({
  args: { sessionToken: v.string() },
  handler: async (ctx, args) => {
    const sessionDigest = await catalogSessionDigest(args.sessionToken);
    const session = await ctx.db
      .query("catalogAccessSessions")
      .withIndex("by_session_digest", (query) => query.eq("sessionDigest", sessionDigest))
      .first();
    if (!session || session.revokedAt || session.expiresAt <= Date.now()) return [];
    if (session.accessPeriodId) {
      const period = await ctx.db.get(session.accessPeriodId);
      if (!period || accessPeriodStatus(period) !== "active") return [];
      const catalogs = await periodCatalogs(ctx, session.accessPeriodId);
      const views = await Promise.all(catalogs.map((catalog) => getCatalogView(ctx, catalog._id)));
      return views.map(catalogAccessSummary);
    }
    if (!session.accessCodeId) return [];
    const code = await ctx.db.get(session.accessCodeId);
    if (!code || !code.isActive || (code.expiresAt && code.expiresAt <= Date.now())) return [];
    if (!(await catalogIsOpen(ctx, session.catalogId))) return [];
    return [catalogAccessSummary(await getCatalogView(ctx, session.catalogId))];
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
