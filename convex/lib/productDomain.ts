import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { BookFormat } from "../validators";
import { recordAudit } from "./audit";
import { fail } from "./errors";
import { normalizedCategories, positiveMoney, requiredText, slugify } from "./validation";

export function buildAdminBookSearchText(values: Array<string | undefined>): string {
  return values
    .map((value) => value?.trim())
    .filter((value): value is string => Boolean(value))
    .join(" ");
}

export async function refreshAdminBookSearchText(ctx: MutationCtx, bookId: Id<"books">) {
  const book = await ctx.db.get(bookId);
  if (!book) return;
  const [publisher, variants] = await Promise.all([
    ctx.db.get(book.publisherId),
    ctx.db
      .query("bookVariants")
      .withIndex("by_book", (query) => query.eq("bookId", book._id))
      .collect(),
  ]);
  await ctx.db.patch(book._id, {
    adminSearchText: buildAdminBookSearchText([
      book.title,
      book.author,
      publisher?.name,
      ...book.categories,
      ...variants.map((variant) => variant.isbn),
    ]),
  });
}

export async function insertPublisher(ctx: MutationCtx, actorUserId: Id<"appUsers">, name: string) {
  const publisherName = requiredText(name, "publisher name");
  const slug = slugify(publisherName, "publisher name");
  const existing = await ctx.db
    .query("publishers")
    .withIndex("by_slug", (query) => query.eq("slug", slug))
    .unique();
  if (existing) fail("DUPLICATE_SLUG");
  const now = Date.now();
  const publisherId = await ctx.db.insert("publishers", {
    name: publisherName,
    slug,
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdByUserId: actorUserId,
  });
  await recordAudit(ctx, actorUserId, "publisher.created", "publisher", publisherId);
  return publisherId;
}

export async function insertBook(
  ctx: MutationCtx,
  actorUserId: Id<"appUsers">,
  input: {
    publisherId: Id<"publishers">;
    title: string;
    slug?: string;
    author?: string;
    description?: string;
    categories?: string[];
    coverImageUrl?: string;
  },
) {
  const publisher = await ctx.db.get(input.publisherId);
  if (!publisher?.isActive) fail("VALIDATION_FAILED", "publisher is unavailable");
  const title = requiredText(input.title, "book title");
  const slug = slugify(input.slug || title, "book slug");
  const existing = await ctx.db
    .query("books")
    .withIndex("by_slug", (query) => query.eq("slug", slug))
    .unique();
  if (existing) fail("DUPLICATE_SLUG");
  const now = Date.now();
  const author = input.author?.trim() || undefined;
  const categories = normalizedCategories(input.categories || []);
  const bookId = await ctx.db.insert("books", {
    publisherId: input.publisherId,
    title,
    slug,
    author,
    description: input.description?.trim() || undefined,
    categories,
    coverImageUrl: input.coverImageUrl?.trim() || undefined,
    adminSearchText: buildAdminBookSearchText([title, author, publisher.name, ...categories]),
    publicationStatus: "draft",
    isActive: true,
    createdAt: now,
    updatedAt: now,
    createdByUserId: actorUserId,
  });
  await recordAudit(ctx, actorUserId, "book.created", "book", bookId);
  return bookId;
}

export async function insertVariant(
  ctx: MutationCtx,
  actorUserId: Id<"appUsers">,
  input: {
    bookId: Id<"books">;
    format: BookFormat;
    isbn: string;
    priceAmount: number;
    supplierPriceGbpMinor?: number;
    isAvailable?: boolean;
  },
) {
  const book = await ctx.db.get(input.bookId);
  if (!book || !book.isActive) fail("VALIDATION_FAILED", "book is unavailable");
  const isbn = requiredText(input.isbn, "ISBN");
  const duplicateIsbn = await ctx.db
    .query("bookVariants")
    .withIndex("by_isbn", (query) => query.eq("isbn", isbn))
    .unique();
  if (duplicateIsbn) fail("DUPLICATE_ISBN");
  const duplicateFormat = await ctx.db
    .query("bookVariants")
    .withIndex("by_book_and_format", (query) => query.eq("bookId", input.bookId).eq("format", input.format))
    .unique();
  if (duplicateFormat) fail("DUPLICATE_VARIANT");
  const now = Date.now();
  const variantId = await ctx.db.insert("bookVariants", {
    bookId: input.bookId,
    format: input.format,
    isbn,
    priceAmount: positiveMoney(input.priceAmount),
    supplierPriceGbpMinor: input.supplierPriceGbpMinor,
    currency: "IDR",
    isAvailable: input.isAvailable ?? true,
    createdAt: now,
    updatedAt: now,
  });
  await refreshAdminBookSearchText(ctx, input.bookId);
  await recordAudit(ctx, actorUserId, "book_variant.created", "bookVariant", variantId);
  return variantId;
}
