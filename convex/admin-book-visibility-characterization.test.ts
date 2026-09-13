/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const targetTitle = "Bizzy Bear: Dress-Up Fun";
const nMinusOneTitle = "Boundary Penultimate Book";
const nTitle = "Boundary Last Visible Book";

describe("Admin Book Master visibility regression", () => {
  beforeEach(configureTestEnvironment);

  it("searches canonical Books beyond the browse window while Catalog resolves the same Book ID", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");

    const publisherId = await admin.mutation(api.publishers.create, { name: "Other Publisher" });
    const targetPublisherId = await admin.mutation(api.publishers.create, { name: "Visibility Target Publisher" });
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Visibility Catalog" });
    const fixture = await t.run(async (ctx) => {
      const base = Date.now();
      const books = [];
      for (let index = 0; index < 201; index += 1) {
        const title =
          index === 0
            ? "Inside Initial Range Book"
            : index === 198
              ? nMinusOneTitle
              : index === 199
                ? nTitle
                : index === 200
                  ? targetTitle
                  : `Book Fixture ${index}`;
        const bookId = await ctx.db.insert("books", {
          publisherId: index === 200 ? targetPublisherId : publisherId,
          title,
          slug: `${title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${index}`,
          author: index === 200 ? "Boundary Author" : undefined,
          categories: index === 200 ? ["Boundary Category"] : [],
          publicationStatus: "special",
          isActive: true,
          createdAt: base - index,
          updatedAt: base - index,
          createdByUserId: adminUser.appUserId,
        });
        books.push(bookId);
      }

      const targetBookId = books[200];
      const variantId = await ctx.db.insert("bookVariants", {
        bookId: targetBookId,
        format: "PB",
        isbn: "9780000000201",
        priceAmount: 125000,
        currency: "IDR",
        isAvailable: true,
        createdAt: base,
        updatedAt: base,
      });
      await ctx.db.insert("catalogItems", {
        catalogId,
        bookVariantId: variantId,
        isAvailable: true,
        createdAt: base,
        updatedAt: base,
      });
      return { targetBookId, targetPublisherId, variantId };
    });

    await expect(customer.mutation(api.books.backfillAdminSearch, {})).rejects.toThrow("PERMISSION_DENIED");

    let cursor: string | undefined;
    do {
      const backfill = await admin.mutation(api.books.backfillAdminSearch, cursor ? { cursor } : {});
      cursor = backfill.isDone ? undefined : backfill.continueCursor;
    } while (cursor);

    const initial = await admin.query(api.books.listForAdmin, {
      paginationOpts: { numItems: 200, cursor: null },
    });
    expect(initial.page).toHaveLength(200);
    expect(initial.page.map((book) => book.title)).toContain(nMinusOneTitle);
    expect(initial.page.map((book) => book.title)).toContain(nTitle);
    expect(initial.page.map((book) => book.title)).not.toContain(targetTitle);
    expect(initial.isDone).toBe(false);

    const search = (value: string, extra: Record<string, unknown> = {}) =>
      admin.query(api.books.listForAdmin, {
        paginationOpts: { numItems: 25, cursor: null },
        search: value,
        ...extra,
      });

    await expect(search("Inside Initial Range Book")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ title: "Inside Initial Range Book" })]),
      }),
    );
    await expect(search("Penultimate")).resolves.toEqual(
      expect.objectContaining({ page: expect.arrayContaining([expect.objectContaining({ title: nMinusOneTitle })]) }),
    );
    await expect(search("Last Visible")).resolves.toEqual(
      expect.objectContaining({ page: expect.arrayContaining([expect.objectContaining({ title: nTitle })]) }),
    );
    await expect(search(targetTitle)).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId, title: targetTitle })]),
      }),
    );
    await expect(search("dress-up fun")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Boundary Author")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Target")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Boundary Category")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("9780000000201")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search(targetTitle, { publicationStatus: "published" })).resolves.toEqual(
      expect.objectContaining({ page: [] }),
    );
    await expect(search(targetTitle, { availability: "not_listed" })).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("not a real book")).resolves.toEqual(expect.objectContaining({ page: [] }));

    await expect(admin.query(api.books.getForAdmin, { bookId: fixture.targetBookId })).resolves.toMatchObject({
      _id: fixture.targetBookId,
      title: targetTitle,
      publicationStatus: "special",
      isActive: true,
    });
    await expect(admin.query(api.catalogItems.listForCatalog, { catalogId })).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ bookId: fixture.targetBookId, title: targetTitle, isbn: "9780000000201" }),
      ]),
    );
    const catalog = await admin.query(api.secretCatalogs.getForAdmin, { catalogId });
    expect(catalog?.view.books).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: fixture.targetBookId, title: targetTitle })]),
    );

    await admin.mutation(api.books.update, {
      bookId: fixture.targetBookId,
      title: "Updated Bizzy Bear",
      author: "Updated Boundary Author",
      categories: ["Updated Boundary Category"],
    });
    await admin.mutation(api.bookVariants.update, {
      bookVariantId: fixture.variantId,
      isbn: "9780000000202",
    });
    await admin.mutation(api.publishers.update, {
      publisherId: fixture.targetPublisherId,
      name: "Updated Visibility Publisher",
      isActive: true,
    });

    await expect(search("Updated Bizzy Bear")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Updated Boundary Author")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Visibility")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("Updated Boundary Category")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search("9780000000202")).resolves.toEqual(
      expect.objectContaining({
        page: expect.arrayContaining([expect.objectContaining({ _id: fixture.targetBookId })]),
      }),
    );
    await expect(search(targetTitle)).resolves.toEqual(expect.objectContaining({ page: [] }));
  });
});
