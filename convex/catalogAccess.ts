import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { accessCodeDigests } from "./lib/accessCodes";
import { catalogIsOpen, getCatalogView } from "./lib/catalogView";
import { constantTimeEqual, keyedDigest } from "./lib/crypto";
import { fail } from "./lib/errors";
import { requirePreviewSecret } from "./lib/previewCapability";
import { OPEN_ENDED_TIMESTAMP_MS, requireSession } from "./lib/sessions";
import { requiredText } from "./lib/validation";

export const setCode = mutation({
  args: {
    sessionToken: v.string(),
    catalogId: v.id("secretCatalogs"),
    accessCode: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requireSession(ctx, args.sessionToken, "admin");
    const catalog = await ctx.db.get(args.catalogId);
    if (!catalog) fail("CATALOG_NOT_FOUND");
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
    return ctx.db.insert("catalogAccessCodes", {
      catalogId: args.catalogId,
      ...digests,
      isActive: true,
      createdAt: now,
      updatedAt: now,
      expiresAt: args.expiresAt,
    });
  },
});

export const unlock = mutation({
  args: { sessionToken: v.string(), accessCode: v.string() },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const code = requiredText(args.accessCode, "access code");
    const lookupDigest = await keyedDigest(
      requirePreviewSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access-lookup",
      code,
    );
    const record = await ctx.db
      .query("catalogAccessCodes")
      .withIndex("by_lookup_digest", (query) => query.eq("lookupDigest", lookupDigest))
      .first();
    if (!record || !record.isActive) fail("ACCESS_CODE_INVALID");
    if (record.expiresAt && record.expiresAt <= Date.now()) fail("ACCESS_CODE_EXPIRED");
    const expected = await keyedDigest(
      requirePreviewSecret("BFG_CATALOG_CODE_PEPPER"),
      "catalog-access",
      `${record.catalogId}:${code}`,
    );
    if (!constantTimeEqual(expected, record.codeDigest)) fail("ACCESS_CODE_INVALID");
    const catalog = await ctx.db.get(record.catalogId);
    if (!catalog || !(await catalogIsOpen(ctx, record.catalogId))) fail("CATALOG_NOT_OPEN");
    const existing = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_session_and_catalog", (query) =>
        query.eq("sessionId", session._id).eq("catalogId", record.catalogId),
      )
      .first();
    const now = Date.now();
    const expiresAt = Math.min(catalog.closesAt || OPEN_ENDED_TIMESTAMP_MS, now + 24 * 60 * 60 * 1000);
    if (existing) {
      await ctx.db.patch(existing._id, { grantedAt: now, expiresAt, revokedAt: undefined });
    } else {
      await ctx.db.insert("catalogAccessGrants", {
        sessionId: session._id,
        catalogId: record.catalogId,
        grantedAt: now,
        expiresAt,
      });
    }
    return { catalogId: record.catalogId, expiresAt };
  },
});

export const getUnlocked = query({
  args: { sessionToken: v.string(), catalogId: v.id("secretCatalogs") },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const grant = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_session_and_catalog", (query) =>
        query.eq("sessionId", session._id).eq("catalogId", args.catalogId),
      )
      .first();
    if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) return null;
    if (!(await catalogIsOpen(ctx, args.catalogId))) return null;
    return getCatalogView(ctx, args.catalogId);
  },
});

export const listAccessible = query({
  args: { sessionToken: v.string(), paginationOpts: paginationOptsValidator },
  handler: async (ctx, args) => {
    const session = await requireSession(ctx, args.sessionToken, "customer");
    const grants = await ctx.db
      .query("catalogAccessGrants")
      .withIndex("by_session", (query) => query.eq("sessionId", session._id))
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
