/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function addBook(
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
  catalogId: Id<"secretCatalogs">,
  publisherId: Id<"publishers">,
  title: string,
  isbn: string,
  options: { category?: "Children Books" | "Adult Books"; format?: "PB" | "HB" } = {},
) {
  const bookId = await admin.mutation(api.books.create, {
    publisherId,
    title,
  });
  await admin.mutation(api.books.update, {
    bookId,
    publicationStatus: "published",
    ...(options.category ? { categories: [options.category] } : {}),
  });
  const variantId = await admin.mutation(api.bookVariants.create, {
    bookId,
    format: options.format ?? "PB",
    isbn,
    priceAmount: 125000,
  });
  await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: variantId });
  return bookId;
}

describe("Secret Catalog pagination", () => {
  beforeEach(configureTestEnvironment);

  it("returns exact bounded 25, 50, and 100 item pages with stable previous and next positions", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Page Catalog", "9340", "page-catalog-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "page-catalog-code" });

    for (let index = 1; index < 101; index += 1) {
      await addBook(
        admin,
        catalog.catalogId,
        catalog.publisherId,
        `Page Book ${String(index).padStart(3, "0")}`,
        `978000934${String(index).padStart(4, "0")}`,
      );
    }

    const queryCustomerPage = (pageNumber: number, pageSize: 25 | 50 | 100) =>
      customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId, pageNumber, pageSize });
    const first25 = await queryCustomerPage(1, 25);
    const second25 = await queryCustomerPage(2, 25);
    const final25 = await queryCustomerPage(5, 25);
    expect(first25).toMatchObject({ titleCount: 101, resultCount: 101, pageNumber: 1, pageSize: 25 });
    expect(first25?.books).toHaveLength(25);
    expect(second25?.books).toHaveLength(25);
    expect(final25?.books).toHaveLength(1);
    const firstPageIds = new Set(first25?.books.map((book) => book.id));
    expect(second25?.books.every((book) => !firstPageIds.has(book.id))).toBe(true);
    expect((await queryCustomerPage(2, 25))?.books).toEqual(second25?.books);

    const first50 = await queryCustomerPage(1, 50);
    const final50 = await queryCustomerPage(3, 50);
    expect(first50?.books).toHaveLength(50);
    expect(final50?.books).toHaveLength(1);
    expect((await queryCustomerPage(1, 100))?.books).toHaveLength(100);
    expect((await queryCustomerPage(2, 100))?.books).toHaveLength(1);
    await expect(queryCustomerPage(999, 100)).resolves.toMatchObject({
      pageNumber: 2,
      books: final50?.books.slice(-1),
    });
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: catalog.catalogId,
        pageNumber: 1,
        pageSize: 999 as never,
      }),
    ).rejects.toThrow();

    const firstAdminPage = await admin.query(api.catalogItems.listForCatalogPage, {
      catalogId: catalog.catalogId,
      pageNumber: 1,
      pageSize: 25,
    });
    const secondAdminPage = await admin.query(api.catalogItems.listForCatalogPage, {
      catalogId: catalog.catalogId,
      pageNumber: 2,
      pageSize: 25,
    });
    expect(firstAdminPage).toMatchObject({ totalCount: 101, catalogItemCount: 101, pageNumber: 1, pageSize: 25 });
    expect(firstAdminPage.page).toHaveLength(25);
    expect(secondAdminPage.page).toHaveLength(25);
    expect(secondAdminPage.page[0]?.position).toBe(25);
    expect(
      await admin.query(api.catalogItems.listForCatalogPage, {
        catalogId: catalog.catalogId,
        pageNumber: 1,
        pageSize: 100,
      }),
    ).toMatchObject({ page: expect.arrayContaining([expect.objectContaining({ position: 99 })]), totalCount: 101 });
  }, 30_000);

  it("filters before pagination and keeps both Catalog access and Admin permission checks", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Filter Catalog", "9341", "filter-catalog-code");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Target Press" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "filter-catalog-code" });

    await addBook(admin, catalog.catalogId, publisherId, "Needle Search Adult", "9780009341001", {
      category: "Adult Books",
      format: "HB",
    });
    await addBook(admin, catalog.catalogId, publisherId, "Needle Search Adult Two", "9780009341002", {
      category: "Adult Books",
      format: "HB",
    });
    await addBook(admin, catalog.catalogId, publisherId, "Needle Search Child", "9780009341003", {
      category: "Children Books",
      format: "HB",
    });

    const filtered = await customer.query(api.catalogAccess.getUnlocked, {
      catalogId: catalog.catalogId,
      pageNumber: 2,
      pageSize: 25,
      search: "needle search",
      category: "Adult Books",
      publishers: ["Target Press"],
      formats: ["HB"],
    });
    expect(filtered).toMatchObject({ resultCount: 2, pageNumber: 1, pageSize: 25 });
    expect(filtered?.books.map((book) => book.title)).toEqual(["Needle Search Adult", "Needle Search Adult Two"]);
    await expect(
      secondCustomer.query(api.catalogAccess.getUnlocked, {
        catalogId: catalog.catalogId,
        pageNumber: 1,
        pageSize: 25,
      }),
    ).resolves.toBeNull();

    await expect(
      admin.query(api.catalogItems.listForCatalogPage, {
        catalogId: catalog.catalogId,
        pageNumber: 1,
        pageSize: 25,
        search: "needle",
        publisher: "Target Press",
      }),
    ).resolves.toMatchObject({ totalCount: 3, titleCount: 3 });
    await expect(
      customer.query(api.catalogItems.listForCatalogPage, {
        catalogId: catalog.catalogId,
        pageNumber: 1,
        pageSize: 25,
      }),
    ).rejects.toThrow();
  });
});
