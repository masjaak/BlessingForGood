import type { Doc, Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { fail } from "./errors";

export type CatalogSummary = {
  id: Id<"secretCatalogs">;
  name: string;
  status: Doc<"secretCatalogs">["status"];
  closingAt: string | null;
  estimatedArrivalMonth: string | null;
  createdAt: string;
};

// Summary contract: one Secret Catalog root only; no Catalog Item, Book, Variant, Publisher, or media reads.
export function catalogSummaryFromCatalog(catalog: Doc<"secretCatalogs">, now = Date.now()): CatalogSummary {
  return {
    id: catalog._id,
    name: catalog.name,
    status: catalog.status === "open" && catalog.closesAt && catalog.closesAt <= now ? "closed" : catalog.status,
    closingAt: catalog.closesAt ? new Date(catalog.closesAt).toISOString() : null,
    estimatedArrivalMonth: catalog.estimatedArrivalMonth ?? null,
    createdAt: new Date(catalog.createdAt).toISOString(),
  };
}

export async function getCatalogSummary(ctx: QueryCtx, catalogId: Id<"secretCatalogs">): Promise<CatalogSummary> {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) fail("CATALOG_NOT_FOUND");
  return catalogSummaryFromCatalog(catalog);
}
