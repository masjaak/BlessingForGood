import type { Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";

type DataCtx = QueryCtx | MutationCtx;

export async function requireActiveCatalogGrant(
  ctx: DataCtx,
  appUserId: Id<"appUsers">,
  catalogId: Id<"secretCatalogs">,
) {
  const grant = await ctx.db
    .query("catalogAccessGrants")
    .withIndex("by_app_user_id_and_catalog_id", (query) => query.eq("appUserId", appUserId).eq("catalogId", catalogId))
    .first();
  if (!grant || grant.revokedAt || grant.expiresAt <= Date.now()) fail("ACCESS_GRANT_REQUIRED");
  return grant;
}
