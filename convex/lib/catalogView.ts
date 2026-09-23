import type { Id } from "../_generated/dataModel";
import type { QueryCtx } from "../_generated/server";
import { matchesCustomerCatalogBook, normalizeDiscoveryQuery } from "../../src/lib/catalog-discovery";
import { catalogSummaryFromCatalog } from "./catalogSummary";
import { fail } from "./errors";
import { sortCatalogItems } from "./catalogOrdering";

type CatalogBrowse = {
  pageNumber: number;
  pageSize: 25 | 50 | 100;
  search: string;
  category?: string;
  publishers: string[];
  formats: string[];
};

type CatalogBook = {
  id: string;
  title: string;
  publisher: string;
  author: string | null;
  description: string | null;
  categories: string[];
  coverStorageId?: Id<"_storage">;
  fallbackCoverImageUrl: string | null;
  coverPresentation: { zoom: number; x: number; y: number } | null;
  externalPreview: { label: string; url: string } | null;
  variants: Array<{
    id: string;
    catalogItemId: string;
    format: string;
    isbn: string;
    price: number;
    currency: "IDR";
    availability: "available";
  }>;
};

export async function catalogIsOpen(ctx: QueryCtx, catalogId: Id<"secretCatalogs">): Promise<boolean> {
  const catalog = await ctx.db.get(catalogId);
  return Boolean(catalog && catalog.status === "open" && (!catalog.closesAt || catalog.closesAt > Date.now()));
}

export async function getCatalogView(
  ctx: QueryCtx,
  catalogId: Id<"secretCatalogs">,
  options?: { includeBooks?: boolean; browse?: CatalogBrowse },
) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) fail("CATALOG_NOT_FOUND");
  const metadata = catalogSummaryFromCatalog(catalog);
  if (options?.includeBooks === false) return { ...metadata, titleCount: undefined, books: [] };

  const browse = options?.browse;
  // ponytail: joins must be scanned to filter and preserve Admin ordering; add a denormalized Catalog index if read cost reaches Convex limits.
  const itemQuery = ctx.db.query("catalogItems").withIndex("by_catalog", (query) => query.eq("catalogId", catalogId));
  const items = sortCatalogItems(browse ? await itemQuery.collect() : await itemQuery.take(500));
  const variants = await Promise.all(items.map((item) => ctx.db.get(item.bookVariantId)));
  const books = await Promise.all(variants.map((variant) => (variant ? ctx.db.get(variant.bookId) : null)));
  const publishers = await Promise.all(books.map((book) => (book ? ctx.db.get(book.publisherId) : null)));
  const bookMap = new Map<string, CatalogBook>();

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
      categories: book.categories,
      coverStorageId: book.coverStorageId,
      fallbackCoverImageUrl: book.coverImageUrl ?? null,
      coverPresentation: book.coverPresentation ?? null,
      externalPreview:
        book.externalPreviewUrl && book.externalPreviewLabel
          ? { label: book.externalPreviewLabel, url: book.externalPreviewUrl }
          : null,
      variants: [],
    };
    current.variants.push({
      id: variant._id,
      catalogItemId: item._id,
      format: variant.format,
      isbn: variant.isbn,
      price: item.priceOverrideAmount ?? variant.priceAmount,
      currency: variant.currency,
      availability: "available",
    });
    bookMap.set(book._id, current);
  });

  const allBooks = Array.from(bookMap.values());
  const search = normalizeDiscoveryQuery(browse?.search ?? "");
  const filteredBooks = browse
    ? allBooks.filter(
        (book) =>
          matchesCustomerCatalogBook(book, search) &&
          (!browse.category || book.categories.includes(browse.category)) &&
          (!browse.publishers.length || browse.publishers.includes(book.publisher)) &&
          (!browse.formats.length || book.variants.some((variant) => browse.formats.includes(variant.format))),
      )
    : allBooks;
  const pageSize = browse?.pageSize ?? filteredBooks.length;
  const pageCount = pageSize ? Math.ceil(filteredBooks.length / pageSize) : 0;
  const pageNumber = browse ? Math.min(Math.max(1, Math.floor(browse.pageNumber) || 1), Math.max(1, pageCount)) : 1;
  const pageBooks = browse ? filteredBooks.slice((pageNumber - 1) * pageSize, pageNumber * pageSize) : filteredBooks;
  const coverUrls = await Promise.all(
    pageBooks.map((book) =>
      book.coverStorageId ? ctx.storage.getUrl(book.coverStorageId) : Promise.resolve(book.fallbackCoverImageUrl),
    ),
  );
  const galleries = browse
    ? pageBooks.map(() => [])
    : await Promise.all(
        pageBooks.map(async (book) => {
          const media = await ctx.db
            .query("bookMedia")
            .withIndex("by_book_and_order", (query) => query.eq("bookId", book.id as Id<"books">))
            .order("asc")
            .take(8);
          return Promise.all(
            media.map(async (item) => ({
              mediaId: item._id,
              displayOrder: item.displayOrder,
              altText: item.altText,
              url: await ctx.storage.getUrl(item.storageId),
            })),
          ).then((items) => items.filter((item): item is typeof item & { url: string } => Boolean(item.url)));
        }),
      );

  return {
    ...metadata,
    titleCount: allBooks.length,
    resultCount: filteredBooks.length,
    pageNumber,
    pageSize,
    publisherOptions: [...new Set(allBooks.map((book) => book.publisher))].sort((left, right) =>
      left.localeCompare(right),
    ),
    books: pageBooks.map((book, index) => ({
      id: book.id,
      title: book.title,
      publisher: book.publisher,
      author: book.author,
      description: book.description,
      categories: book.categories,
      coverImageUrl: coverUrls[index],
      coverPresentation: book.coverPresentation,
      gallery: galleries[index],
      externalPreview: book.externalPreview,
      variants: book.variants,
    })),
  };
}
