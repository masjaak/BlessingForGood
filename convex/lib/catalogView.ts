import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { fail } from "./errors";

export async function catalogIsOpen(ctx: QueryCtx, catalogId: Id<"secretCatalogs">): Promise<boolean> {
  const catalog = await ctx.db.get(catalogId);
  return Boolean(catalog && catalog.status === "open" && (!catalog.closesAt || catalog.closesAt > Date.now()));
}

export async function getCatalogView(ctx: QueryCtx, catalogId: Id<"secretCatalogs">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) fail("CATALOG_NOT_FOUND");
  const items = await ctx.db
    .query("catalogItems")
    .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId))
    .order("asc")
    .take(200);
  const variantIds = items.map((item) => item.bookVariantId);
  const variants = await Promise.all(variantIds.map((variantId) => ctx.db.get(variantId)));
  const books = await Promise.all(variants.map((variant) => (variant ? ctx.db.get(variant.bookId) : null)));
  const publishers = await Promise.all(books.map((book) => (book ? ctx.db.get(book.publisherId) : null)));
  const coverUrls = await Promise.all(
    books.map((book) =>
      book?.coverStorageId ? ctx.storage.getUrl(book.coverStorageId) : (book?.coverImageUrl ?? null),
    ),
  );
  const bookMap = new Map<
    string,
    { id: string; title: string; publisher: string; coverImageUrl: string | null; variants: unknown[] }
  >();

  items.forEach((item, index) => {
    const variant = variants[index];
    const book = books[index];
    const publisher = publishers[index];
    if (!variant || !book || !publisher || !item.isAvailable || !variant.isAvailable || !book.isActive) return;
    if (book.publicationStatus !== "published" && book.publicationStatus !== "special") return;
    const current = bookMap.get(book._id) || {
      id: book._id,
      title: book.title,
      publisher: publisher.name,
      coverImageUrl: coverUrls[index],
      variants: [],
    };
    current.variants.push({
      id: variant._id,
      format: variant.format,
      isbn: variant.isbn,
      price: item.priceOverrideAmount ?? variant.priceAmount,
      currency: variant.currency,
      availability: "available",
    });
    bookMap.set(book._id, current);
  });

  return {
    id: catalog._id,
    name: catalog.name,
    status: catalog.status === "open" && catalog.closesAt && catalog.closesAt <= Date.now() ? "closed" : catalog.status,
    closingAt: catalog.closesAt ? new Date(catalog.closesAt).toISOString() : null,
    books: Array.from(bookMap.values()),
    createdAt: new Date(catalog.createdAt).toISOString(),
  };
}
