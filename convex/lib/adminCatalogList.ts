import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { catalogSummaryFromCatalog } from "./catalogSummary";
import { sortCatalogItems } from "./catalogOrdering";

type CatalogContext = QueryCtx | MutationCtx;

export function isAdminCatalogItemVisible(
  item: Doc<"catalogItems">,
  variant: Doc<"bookVariants"> | null,
  book: Doc<"books"> | null,
  publisher: Doc<"publishers"> | null,
) {
  return Boolean(
    item.isAvailable &&
    variant?.isAvailable &&
    book?.isActive &&
    publisher &&
    (book.publicationStatus === "published" || book.publicationStatus === "special"),
  );
}

async function catalogPreviewItem(ctx: CatalogContext, catalogId: Id<"secretCatalogs">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) return null;
  const items = sortCatalogItems(
    await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId))
      .collect(),
  );
  const books = new Map<Id<"books">, Doc<"books"> | null>();
  const publishers = new Map<Id<"publishers">, Doc<"publishers"> | null>();
  for (const item of items) {
    if (!item.isAvailable) continue;
    const variant = await ctx.db.get(item.bookVariantId);
    if (!variant?.isAvailable) continue;
    const bookId = item.bookId ?? variant.bookId;
    if (!books.has(bookId)) books.set(bookId, await ctx.db.get(bookId));
    const book = books.get(bookId) ?? null;
    if (!book) continue;
    if (!publishers.has(book.publisherId)) publishers.set(book.publisherId, await ctx.db.get(book.publisherId));
    const publisher = publishers.get(book.publisherId) ?? null;
    if (isAdminCatalogItemVisible(item, variant, book, publisher)) return item._id;
  }
  return undefined;
}

export async function refreshAdminCatalogPreview(ctx: MutationCtx, catalogId: Id<"secretCatalogs">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) return;
  const previewCatalogItemId = (await catalogPreviewItem(ctx, catalogId)) ?? undefined;
  if (catalog.previewCatalogItemId !== previewCatalogItemId) {
    await ctx.db.patch(catalogId, { previewCatalogItemId });
  }
}

export async function syncAdminCatalogTitle(ctx: MutationCtx, catalogId: Id<"secretCatalogs">, bookId: Id<"books">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) return;
  const items = await ctx.db
    .query("catalogItems")
    .withIndex("by_catalog_and_book", (query) => query.eq("catalogId", catalogId).eq("bookId", bookId))
    .collect();
  const [book, membership] = await Promise.all([
    ctx.db.get(bookId),
    ctx.db
      .query("catalogTitles")
      .withIndex("by_catalog_and_book", (query) => query.eq("catalogId", catalogId).eq("bookId", bookId))
      .unique(),
  ]);
  const publisher = book ? await ctx.db.get(book.publisherId) : null;
  let visible = false;
  for (const item of items) {
    const variant = await ctx.db.get(item.bookVariantId);
    if (isAdminCatalogItemVisible(item, variant, book, publisher)) {
      visible = true;
      break;
    }
  }
  const titleCount = catalog.titleCount ?? 0;
  if (visible && !membership) {
    const now = Date.now();
    await ctx.db.insert("catalogTitles", { catalogId, bookId, createdAt: now, updatedAt: now });
    await ctx.db.patch(catalogId, { titleCount: titleCount + 1 });
  } else if (!visible && membership) {
    await ctx.db.delete(membership._id);
    await ctx.db.patch(catalogId, { titleCount: Math.max(0, titleCount - 1) });
  }
}

export async function refreshAdminCatalogsForBook(ctx: MutationCtx, bookId: Id<"books">) {
  const catalogIds = new Set<Id<"secretCatalogs">>();
  const memberships = await ctx.db
    .query("catalogTitles")
    .withIndex("by_book", (query) => query.eq("bookId", bookId))
    .collect();
  memberships.forEach((membership) => catalogIds.add(membership.catalogId));
  const variants = await ctx.db
    .query("bookVariants")
    .withIndex("by_book", (query) => query.eq("bookId", bookId))
    .collect();
  for (const variant of variants) {
    const items = await ctx.db
      .query("catalogItems")
      .withIndex("by_variant", (query) => query.eq("bookVariantId", variant._id))
      .collect();
    items.forEach((item) => catalogIds.add(item.catalogId));
  }
  for (const catalogId of catalogIds) {
    await syncAdminCatalogTitle(ctx, catalogId, bookId);
    await refreshAdminCatalogPreview(ctx, catalogId);
  }
}

export async function backfillAdminCatalogList(ctx: MutationCtx, catalogId: Id<"secretCatalogs">) {
  const catalog = await ctx.db.get(catalogId);
  if (!catalog) return { catalogId, itemCount: 0, titleCount: 0 };
  const items = sortCatalogItems(
    await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog", (query) => query.eq("catalogId", catalogId))
      .collect(),
  );
  const memberships = await ctx.db
    .query("catalogTitles")
    .withIndex("by_catalog_and_book", (query) => query.eq("catalogId", catalogId))
    .collect();
  const variants = new Map<Id<"bookVariants">, Doc<"bookVariants"> | null>();
  const books = new Map<Id<"books">, Doc<"books"> | null>();
  const publishers = new Map<Id<"publishers">, Doc<"publishers"> | null>();
  const visibleBookIds = new Set<Id<"books">>();
  let previewCatalogItemId: Id<"catalogItems"> | undefined;

  for (const item of items) {
    const variant = variants.has(item.bookVariantId)
      ? variants.get(item.bookVariantId) || null
      : await ctx.db.get(item.bookVariantId);
    variants.set(item.bookVariantId, variant);
    if (!variant) continue;
    if (item.bookId !== variant.bookId) await ctx.db.patch(item._id, { bookId: variant.bookId });
    if (!books.has(variant.bookId)) books.set(variant.bookId, await ctx.db.get(variant.bookId));
    const book = books.get(variant.bookId) ?? null;
    if (!book) continue;
    if (!publishers.has(book.publisherId)) publishers.set(book.publisherId, await ctx.db.get(book.publisherId));
    const publisher = publishers.get(book.publisherId) ?? null;
    if (!isAdminCatalogItemVisible(item, variant, book, publisher)) continue;
    visibleBookIds.add(book._id);
    previewCatalogItemId ??= item._id;
  }

  const existingByBook = new Map(memberships.map((membership) => [String(membership.bookId), membership]));
  const now = Date.now();
  for (const bookId of visibleBookIds) {
    if (!existingByBook.has(String(bookId))) {
      await ctx.db.insert("catalogTitles", { catalogId, bookId, createdAt: now, updatedAt: now });
    }
    existingByBook.delete(String(bookId));
  }
  for (const membership of existingByBook.values()) await ctx.db.delete(membership._id);
  const patch: {
    titleCount?: number;
    previewCatalogItemId?: Id<"catalogItems">;
  } = {};
  if (catalog.titleCount !== visibleBookIds.size) patch.titleCount = visibleBookIds.size;
  if (catalog.previewCatalogItemId !== previewCatalogItemId) patch.previewCatalogItemId = previewCatalogItemId;
  if (Object.keys(patch).length) await ctx.db.patch(catalogId, patch);
  return { catalogId, itemCount: items.length, titleCount: visibleBookIds.size };
}

export async function getAdminCatalogListRow(ctx: QueryCtx, catalog: Doc<"secretCatalogs">) {
  const previewItem = catalog.previewCatalogItemId ? await ctx.db.get(catalog.previewCatalogItemId) : null;
  const previewVariant = previewItem ? await ctx.db.get(previewItem.bookVariantId) : null;
  const previewBook =
    previewItem && previewVariant
      ? await ctx.db.get(previewItem.bookId ?? previewVariant.bookId)
      : previewItem?.bookId
        ? await ctx.db.get(previewItem.bookId)
        : null;
  const previewPublisher = previewBook ? await ctx.db.get(previewBook.publisherId) : null;
  let preview: { title: string; publisher: string; formatCount: number } | null = null;
  if (previewItem && previewVariant && previewBook && previewPublisher) {
    const items = await ctx.db
      .query("catalogItems")
      .withIndex("by_catalog_and_book", (query) => query.eq("catalogId", catalog._id).eq("bookId", previewBook._id))
      .collect();
    const variants = await Promise.all(items.map((item) => ctx.db.get(item.bookVariantId)));
    const formatCount = items.reduce(
      (count, item, index) =>
        count + (isAdminCatalogItemVisible(item, variants[index] ?? null, previewBook, previewPublisher) ? 1 : 0),
      0,
    );
    if (isAdminCatalogItemVisible(previewItem, previewVariant, previewBook, previewPublisher)) {
      preview = { title: previewBook.title, publisher: previewPublisher.name, formatCount };
    }
  }
  return {
    ...catalogSummaryFromCatalog(catalog),
    titleCount: catalog.titleCount ?? 0,
    preview,
  };
}
