import type { Doc } from "../_generated/dataModel";

export function sortCatalogItems(items: Doc<"catalogItems">[]) {
  return [...items].sort(
    (left, right) =>
      (left.sortOrder ?? Number.MAX_SAFE_INTEGER) - (right.sortOrder ?? Number.MAX_SAFE_INTEGER) ||
      left.createdAt - right.createdAt ||
      String(left._id).localeCompare(String(right._id)),
  );
}
