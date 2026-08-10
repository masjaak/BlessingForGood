/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG Ready Stock and Book Master", () => {
  beforeEach(configureTestEnvironment);

  it("returns a valid zero-data public catalog without identity", async () => {
    const result = await testConvex().query(api.readyStock.list, { sort: "newest" });
    expect(result).toEqual({ items: [], filters: { categories: [], publishers: [], formats: [] } });
  });

  it("shows only published positive stock and never exposes secret catalog data", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    await createOpenCatalog(admin, "Private Autumn", "4101", "private-code");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Public House" });
    const bookId = await admin.mutation(api.books.create, {
      publisherId,
      title: "Visible Book",
      author: "A. Writer",
      categories: ["Picture Book"],
    });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "HB",
      isbn: "9780000041022",
      priceAmount: 175000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 3 });
    expect((await t.query(api.readyStock.list, {})).items).toEqual([]);
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const result = await t.query(api.readyStock.list, {});
    expect(result.items).toHaveLength(1);
    expect(result.items[0]).toMatchObject({ title: "Visible Book", totalStock: 3, minPrice: 175000 });
    expect(JSON.stringify(result)).not.toContain("Private Autumn");
    expect(JSON.stringify(result)).not.toContain("private-code");

    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 0 });
    expect((await t.query(api.readyStock.list, {})).items).toEqual([]);
  });

  it("searches and filters public stock on the server", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Searchable Publisher" });
    const bookId = await admin.mutation(api.books.create, {
      publisherId,
      title: "Forest Stories",
      author: "Nina Green",
      categories: ["Nature"],
    });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000041039",
      priceAmount: 99000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 2 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    for (const args of [
      { search: "forest" },
      { search: "searchable" },
      { search: "41039" },
      { category: "Nature" },
      { publisherId },
      { format: "PB" as const },
    ]) {
      expect((await t.query(api.readyStock.list, args)).items.map((book) => book.bookId)).toEqual([bookId]);
    }
    expect((await t.query(api.readyStock.list, { format: "HB" })).items).toEqual([]);
  });

  it("supports admin book, publication, variant, and stock updates with audit history", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Operations Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Operations Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "BB",
      isbn: "9780000041046",
      priceAmount: 120000,
    });
    await admin.mutation(api.bookVariants.update, { bookVariantId: variantId, priceAmount: 125000 });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 4 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published", author: "Ops Author" });

    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({
      author: "Ops Author",
      publicationStatus: "published",
      variants: [{ priceAmount: 125000, stockQuantity: 4 }],
    });
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toEqual(
      expect.arrayContaining([
        "book.created",
        "book_variant.created",
        "book_variant.updated",
        "ready_stock.quantity_changed",
        "book.publication_state_changed",
      ]),
    );
  });

  it("rejects customer mutations, negative stock, invalid prices, duplicate ISBNs, and duplicate slugs", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Invariant House" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Unique Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000041053",
      priceAmount: 100000,
    });

    await expect(customer.mutation(api.books.create, { publisherId, title: "Denied" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(
      customer.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 1 }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: -1 }),
    ).rejects.toThrow("INVALID_STOCK_QUANTITY");
    await expect(
      admin.mutation(api.bookVariants.create, {
        bookId,
        format: "HB",
        isbn: "9780000041054",
        priceAmount: 0,
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.mutation(api.bookVariants.create, {
        bookId,
        format: "HB",
        isbn: "9780000041053",
        priceAmount: 100000,
      }),
    ).rejects.toThrow("DUPLICATE_ISBN");
    await expect(admin.mutation(api.books.create, { publisherId, title: "Unique Book" })).rejects.toThrow(
      "DUPLICATE_SLUG",
    );
  });

  it("hides draft, special, archived, and unknown detail routes", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Hidden House" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Hidden Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000041060",
      priceAmount: 100000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 1 });
    expect(await t.query(api.readyStock.getBySlug, { slug: "hidden-book" })).toBeNull();
    for (const publicationStatus of ["special", "archived"] as const) {
      await admin.mutation(api.books.update, { bookId, publicationStatus });
      expect(await t.query(api.readyStock.getBySlug, { slug: "hidden-book" })).toBeNull();
    }
    expect(await t.query(api.readyStock.getBySlug, { slug: "missing" })).toBeNull();
  });
});
