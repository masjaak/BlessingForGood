import type { QueryCtx } from "../_generated/server";
import type { Id } from "../_generated/dataModel";
import { fail } from "./errors";
import { sortCatalogItems } from "./catalogOrdering";

export async function catalogIsOpen(ctx: QueryCtx, catalogId: Id<"secretCatalogs">): Promise<boolean> {
  const catalog = await ctx.db.get(catalogId);
  return Boolean(catalog && catalog.status === "open" && (!catalog.closesAt || catalog.closesAt > Date.now()));
}

export async function getCatalogView(ctx: QueryCtx, catalogId: Id<"secretCatalogs">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) fail("CATALOG_NOT_FOUND");
  // ponytail: bounded 500-item customer projection for the requested hundreds-scale Catalog; paginate if a Catalog exceeds 500 items.
  const items = sortCatalogItems(
    await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId))
      .order("asc")
      .take(500),
  );
  const variantIds = items.map((item) => item.bookVariantId);
  const variants = await Promise.all(variantIds.map((variantId) => ctx.db.get(variantId)));
  const books = await Promise.all(variants.map((variant) => (variant ? ctx.db.get(variant.bookId) : null)));
  const publishers = await Promise.all(books.map((book) => (book ? ctx.db.get(book.publisherId) : null)));
  const coverUrls = await Promise.all(
    books.map((book) =>
      book?.coverStorageId ? ctx.storage.getUrl(book.coverStorageId) : (book?.coverImageUrl ?? null),
    ),
  );
  const uniqueBooks = Array.from(
    new Map(
      books.filter((book): book is NonNullable<typeof book> => Boolean(book)).map((book) => [book._id, book]),
    ).values(),
  );
  const galleries = new Map(
    await Promise.all(
      uniqueBooks.map(
        async (book) =>
          [
            book._id,
            await ctx.db
              .query("bookMedia")
              .withIndex("by_book_and_order", (query) => query.eq("bookId", book._id))
              .order("asc")
              .take(8)
              .then((media) =>
                Promise.all(
                  media.map(async (item) => ({
                    mediaId: item._id,
                    displayOrder: item.displayOrder,
                    altText: item.altText,
                    url: await ctx.storage.getUrl(item.storageId),
                  })),
                ).then((items) => items.filter((item): item is typeof item & { url: string } => Boolean(item.url))),
              ),
          ] as const,
      ),
    ),
  );
  const bookMap = new Map<
    string,
    {
      id: string;
      title: string;
      publisher: string;
      author: string | null;
      description: string | null;
      coverImageUrl: string | null;
      coverPresentation: { zoom: number; x: number; y: number } | null;
      gallery: Array<{ mediaId: string; displayOrder: number; altText: string; url: string }>;
      externalPreview: { label: string; url: string } | null;
      variants: Array<{
        id: string;
        format: string;
        isbn: string;
        price: number;
        currency: "IDR";
        availability: "available";
      }>;
    }
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
      author: book.author ?? null,
      description: book.description ?? null,
      coverImageUrl: coverUrls[index],
      coverPresentation: book.coverPresentation ?? null,
      gallery: (galleries.get(book._id) || []).filter((item) => Boolean(item.url)),
      externalPreview:
        book.externalPreviewUrl && book.externalPreviewLabel
          ? { label: book.externalPreviewLabel, url: book.externalPreviewUrl }
          : null,
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
    estimatedArrivalMonth: catalog.estimatedArrivalMonth ?? null,
    titleCount: bookMap.size,
    books: Array.from(bookMap.values()),
    createdAt: new Date(catalog.createdAt).toISOString(),
  };
}
