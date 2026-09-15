import { beforeEach, expect, it } from "vitest";
import type { FunctionReturnType } from "convex/server";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

beforeEach(configureTestEnvironment);

it("discovers eligible Publisher variants beyond the former 500-row window", async () => {
  const t = testConvex();
  const { admin } = await setupUsers(t);
  const publisherId = await admin.mutation(api.publishers.create, { name: "Walker Books" });
  const bookId = await admin.mutation(api.books.create, { publisherId, title: "Rewild", author: "Ada Writer" });
  await admin.mutation(api.books.update, { bookId, publicationStatus: "special" });
  const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "CARGO 2" });
  await t.run(async (ctx) => {
    for (let i = 0; i < 501; i++) {
      await ctx.db.insert("bookVariants", {
        bookId,
        format: "PB",
        isbn: `padding-${i}`,
        priceAmount: 1000,
        currency: "IDR",
        isAvailable: false,
        createdAt: i,
        updatedAt: i,
      });
    }
  });
  const variantId = await t.run(async (ctx) =>
    ctx.db.insert("bookVariants", {
      bookId,
      format: "HB",
      isbn: "978-0123456789",
      priceAmount: 125000,
      currency: "IDR",
      isAvailable: true,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }),
  );
  for (const search of ["walker", "Walker", "WALKER", " walker ", "Walker Books", "Rewild", "writer", "123456"]) {
    let cursor: string | null = null;
    const found = [];
    for (;;) {
      const result: FunctionReturnType<typeof api.catalogItems.listAssignable> = await admin.query(
        api.catalogItems.listAssignable,
        {
          catalogId,
          search,
          paginationOpts: { numItems: 100, cursor },
        },
      );
      found.push(...result.page);
      if (result.isDone) break;
      cursor = result.continueCursor;
    }
    expect(found.map((row) => row.variantId)).toEqual([variantId]);
  }
});

it("excludes exact membership and unavailable metadata while retaining sibling formats", async () => {
  const t = testConvex();
  const { admin, customer } = await setupUsers(t);
  const publisherId = await admin.mutation(api.publishers.create, { name: "Walker Books" });
  const bookId = await admin.mutation(api.books.create, { publisherId, title: "Stories" });
  await admin.mutation(api.books.update, { bookId, publicationStatus: "special" });
  const hb = await admin.mutation(api.bookVariants.create, {
    bookId,
    format: "HB",
    isbn: "978-010-001",
    priceAmount: 1000,
  });
  const pb = await admin.mutation(api.bookVariants.create, {
    bookId,
    format: "PB",
    isbn: "978010002",
    priceAmount: 1000,
  });
  const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Formats" });
  const itemId = await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: hb });
  const args = { catalogId, search: "walker", paginationOpts: { numItems: 100, cursor: null } };
  expect((await admin.query(api.catalogItems.listAssignable, args)).page.map((row) => row.variantId)).toEqual([pb]);
  expect((await admin.query(api.catalogItems.listForCatalog, { catalogId }))[0].publisherName).toBe("Walker Books");
  await expect(customer.query(api.catalogItems.listAssignable, args)).rejects.toThrow();
  for (const [id, patch, restore] of [
    [pb, { isAvailable: false }, { isAvailable: true }],
    [bookId, { isActive: false }, { isActive: true }],
    [publisherId, { isActive: false }, { isActive: true }],
  ] as const) {
    await t.run(async (ctx) => ctx.db.patch(id, patch));
    expect((await admin.query(api.catalogItems.listAssignable, args)).page).toEqual([]);
    await t.run(async (ctx) => ctx.db.patch(id, restore));
  }
  expect((await admin.query(api.catalogItems.listAssignable, { ...args, search: "no match" })).page).toEqual([]);
  await admin.mutation(api.catalogItems.remove, { catalogItemId: itemId });
  expect((await admin.query(api.catalogItems.listAssignable, args)).page).toHaveLength(2);
});
