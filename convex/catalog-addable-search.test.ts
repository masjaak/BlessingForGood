import { beforeEach, expect, it } from "vitest";
import type { FunctionReturnType } from "convex/server";
import type { Id } from "./_generated/dataModel";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

beforeEach(configureTestEnvironment);

it("searches Publisher metadata across the full candidate dataset in one result page", async () => {
  const t = testConvex();
  const { admin } = await setupUsers(t);
  const fillerPublisherId = await admin.mutation(api.publishers.create, { name: "Filler" });
  const fillerBookId = await admin.mutation(api.books.create, { publisherId: fillerPublisherId, title: "Filler" });
  await admin.mutation(api.books.update, { bookId: fillerBookId, publicationStatus: "special" });
  const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Search window" });
  await t.run(async (ctx) => {
    for (let i = 0; i < 101; i++) {
      await ctx.db.insert("bookVariants", {
        bookId: fillerBookId,
        format: "PB",
        isbn: `filler-${i}`,
        priceAmount: 1000,
        currency: "IDR",
        isAvailable: false,
        createdAt: i,
        updatedAt: i,
      });
    }
  });
  const publisherId = await admin.mutation(api.publishers.create, { name: "Walker Books" });
  const bookId = await admin.mutation(api.books.create, {
    publisherId,
    title: "Walker title",
    author: "Walker author",
  });
  await admin.mutation(api.books.update, { bookId, publicationStatus: "special" });
  const variantId = await admin.mutation(api.bookVariants.create, {
    bookId,
    format: "HB",
    isbn: "978-012-345",
    priceAmount: 125000,
  });

  const result = await admin.query(api.catalogItems.listAssignable, {
    catalogId,
    search: "walker",
    paginationOpts: { numItems: 100, cursor: null },
  });

  expect(result.page.map((row) => row.variantId)).toEqual([variantId]);
});

it("applies one global Publisher matrix through discovery and add", async () => {
  const t = testConvex();
  const { admin } = await setupUsers(t);
  const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Global discovery fixture" });
  const createBook = async (
    publisherId: Id<"publishers">,
    title: string,
    author: string,
    isbnPrefix: string,
    formats: Array<"PB" | "HB">,
  ) => {
    const bookId = await admin.mutation(api.books.create, { publisherId, title, author });
    const variantIds = [];
    for (const [index, format] of formats.entries()) {
      variantIds.push(
        await admin.mutation(api.bookVariants.create, {
          bookId,
          format,
          isbn: `${isbnPrefix}-${index}`,
          priceAmount: 125000 + index * 1000,
        }),
      );
    }
    await admin.mutation(api.books.update, { bookId, publicationStatus: "special" });
    return { bookId, variantIds };
  };
  const createPublisher = (name: string) => admin.mutation(api.publishers.create, { name });

  const nosyPublisherId = await createPublisher("Nosy Crow");
  const nosyMain = await createBook(nosyPublisherId, "Nosy Main", "Author Nosy", "978-2100", ["PB", "HB"]);
  const nosyOther = await createBook(nosyPublisherId, "Nosy Other", "Author Nosy", "978-2101", ["PB"]);
  const nosyInactiveBook = await createBook(nosyPublisherId, "Nosy Inactive Book", "Author Nosy", "978-2102", ["PB"]);
  await admin.mutation(api.books.update, { bookId: nosyInactiveBook.bookId, publicationStatus: "archived" });
  const nosyUnavailable = await createBook(nosyPublisherId, "Nosy Unavailable Variant", "Author Nosy", "978-2103", [
    "PB",
  ]);
  await admin.mutation(api.bookVariants.update, { bookVariantId: nosyUnavailable.variantIds[0], isAvailable: false });
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: nosyMain.variantIds[0] });

  const fillerPublisherId = await createPublisher("Early filler");
  const fillerBook = await createBook(fillerPublisherId, "Early filler book", "Filler author", "978-2199", ["PB"]);
  await t.run(async (ctx) => {
    for (let i = 0; i < 501; i++) {
      await ctx.db.insert("bookVariants", {
        bookId: fillerBook.bookId,
        format: "PB",
        isbn: `global-filler-${i}`,
        priceAmount: 1000,
        currency: "IDR",
        isAvailable: false,
        createdAt: i,
        updatedAt: i,
      });
    }
  });
  const walkerPublisherId = await createPublisher("Walker Books");
  const walkerMain = await createBook(walkerPublisherId, "Walker Main", "Author Walker", "978-2200", ["PB", "HB"]);
  const walkerOther = await createBook(walkerPublisherId, "Walker Other", "Author Walker", "978-2201", ["PB"]);
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: walkerMain.variantIds[0] });

  const fewPublisherId = await createPublisher("Few Books Publisher");
  const few = await createBook(fewPublisherId, "Few Book", "Author Few", "978-2300", ["PB", "HB"]);
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: few.variantIds[0] });

  const mixedPublisherId = await createPublisher("Mixed Publisher");
  const mixed = await createBook(mixedPublisherId, "Mixed Book", "Author Mixed", "978-2400", ["PB", "HB"]);
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: mixed.variantIds[0] });

  const inactivePublisherId = await createPublisher("Inactive Publisher");
  const inactive = await createBook(inactivePublisherId, "Inactive Publisher Book", "Author Inactive", "978-2500", [
    "PB",
    "HB",
  ]);
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: inactive.variantIds[0] });
  await admin.mutation(api.publishers.update, {
    publisherId: inactivePublisherId,
    name: "Inactive Publisher",
    isActive: false,
  });

  const search = async (value: string, numItems = 100) =>
    admin.query(api.catalogItems.listAssignable, {
      catalogId,
      search: value,
      paginationOpts: { numItems, cursor: null },
    });

  expect((await search("nosy")).page.map((row) => row.variantId)).toEqual(
    expect.arrayContaining([nosyMain.variantIds[1], nosyOther.variantIds[0]]),
  );
  expect((await search("nosy")).page).toHaveLength(2);
  for (const value of ["walker", "Walker", "WALKER", " walker ", "Walker Books"]) {
    expect((await search(value)).page.map((row) => row.variantId)).toEqual(
      expect.arrayContaining([walkerMain.variantIds[1], walkerOther.variantIds[0]]),
    );
  }
  expect((await search("Walker Main")).page.map((row) => row.variantId)).toEqual([walkerMain.variantIds[1]]);
  expect((await search("978-2200-1")).page.map((row) => row.variantId)).toEqual([walkerMain.variantIds[1]]);
  expect((await search("Author Walker")).page).toHaveLength(2);
  expect((await search("few")).page.map((row) => row.variantId)).toEqual([few.variantIds[1]]);
  expect((await search("mixed")).page.map((row) => row.variantId)).toEqual([mixed.variantIds[1]]);
  expect((await search("inactive publisher")).page).toEqual([]);
  expect((await search("no such publisher")).page).toEqual([]);
  expect((await search("", 2)).page.length).toBeLessThanOrEqual(2);

  const walkerCandidate = (await search("walker")).page.find((row) => row.variantId === walkerMain.variantIds[1]);
  expect(walkerCandidate).toEqual(expect.objectContaining({ bookId: walkerMain.bookId, format: "HB" }));
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: walkerMain.variantIds[1] });
  expect(await admin.query(api.catalogItems.listForCatalog, { catalogId })).toEqual(
    expect.arrayContaining([expect.objectContaining({ bookVariantId: walkerMain.variantIds[1] })]),
  );
  expect((await search("walker")).page.map((row) => row.variantId)).toEqual([walkerOther.variantIds[0]]);
  await expect(
    admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: walkerMain.variantIds[1] }),
  ).rejects.toThrow("DUPLICATE_VARIANT");
  await expect(
    admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: nosyUnavailable.variantIds[0] }),
  ).rejects.toThrow("VALIDATION_FAILED");
  await expect(
    admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: nosyInactiveBook.variantIds[0] }),
  ).rejects.toThrow("VALIDATION_FAILED");
  await expect(
    admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: inactive.variantIds[1] }),
  ).rejects.toThrow("VALIDATION_FAILED");
});

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
  const variantId = await admin.mutation(api.bookVariants.create, {
    bookId,
    format: "HB",
    isbn: "978-0123456789",
    priceAmount: 125000,
  });
  for (const search of [
    "walker",
    "Walker",
    "WALKER",
    " walker ",
    "Walker Books",
    "Rewild",
    "writer",
    "978-0123456789",
  ]) {
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
    expect(
      found.map((row) => row.variantId),
      search,
    ).toEqual([variantId]);
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
