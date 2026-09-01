import type { Id } from "../_generated/dataModel";
import type { MutationCtx } from "../_generated/server";
import type { BookFormat } from "../validators";
import { recordAudit } from "./audit";
import { fail } from "./errors";
import { normalizedCategories, positiveMoney, requiredText, slugify } from "./validation";

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
  const bookId = await ctx.db.insert("books", {
    publisherId: input.publisherId,
    title,
    slug,
    author: input.author?.trim() || undefined,
    description: input.description?.trim() || undefined,
    categories: normalizedCategories(input.categories || []),
    coverImageUrl: input.coverImageUrl?.trim() || undefined,
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
  await recordAudit(ctx, actorUserId, "book_variant.created", "bookVariant", variantId);
  return variantId;
}
