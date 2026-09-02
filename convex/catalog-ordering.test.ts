/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG Catalog item ordering", () => {
  beforeEach(configureTestEnvironment);

  it("persists Admin moves and projects the same series order to Customer", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Series Catalog", "9810", "series-order-code");
    const extraCatalogItemIds: Array<Id<"catalogItems">> = [];

    for (const title of ["Series Two", "Series Three"]) {
      const bookId = await admin.mutation(api.books.create, {
        publisherId: catalog.publisherId,
        title,
      });
      await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
      const variantId = await admin.mutation(api.bookVariants.create, {
        bookId,
        format: "PB",
        isbn: `97800000981${extraCatalogItemIds.length + 1}`,
        priceAmount: 150000,
      });
      const catalogItemId = await admin.mutation(api.catalogItems.add, {
        catalogId: catalog.catalogId,
        bookVariantId: variantId,
      });
      extraCatalogItemIds.push(catalogItemId);
    }

    await customer.mutation(api.catalogAccess.unlock, { accessCode: "series-order-code" });
    const initial = await admin.query(api.catalogItems.listForCatalog, { catalogId: catalog.catalogId });
    expect(initial.map((item) => item.title)).toEqual(["Series Catalog Book", "Series Two", "Series Three"]);

    await admin.mutation(api.catalogItems.move, { catalogItemId: extraCatalogItemIds[1], direction: "up" });
    await admin.mutation(api.catalogItems.move, { catalogItemId: extraCatalogItemIds[1], direction: "up" });

    const ordered = await admin.query(api.catalogItems.listForCatalog, { catalogId: catalog.catalogId });
    expect(ordered.map((item) => item.title)).toEqual(["Series Three", "Series Catalog Book", "Series Two"]);
    expect(ordered.map((item) => item.sortOrder)).toEqual([0, 1, 2]);

    const customerView = await customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId });
    expect(customerView?.books.map((book) => book.title)).toEqual([
      "Series Three",
      "Series Catalog Book",
      "Series Two",
    ]);
  });

  it("moves one item to a destination index without changing another Catalog", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const firstCatalog = await createOpenCatalog(admin, "First Catalog", "9811", "first-order-code");
    const secondCatalog = await createOpenCatalog(admin, "Second Catalog", "9812", "second-order-code");
    const firstExtraIds: Array<Id<"catalogItems">> = [];

    for (const title of ["Book B", "Book C", "Book D"]) {
      const bookId = await admin.mutation(api.books.create, {
        publisherId: firstCatalog.publisherId,
        title,
      });
      await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
      const variantId = await admin.mutation(api.bookVariants.create, {
        bookId,
        format: "PB",
        isbn: `97800000981${firstExtraIds.length + 4}`,
        priceAmount: 150000,
      });
      firstExtraIds.push(
        await admin.mutation(api.catalogItems.add, {
          catalogId: firstCatalog.catalogId,
          bookVariantId: variantId,
        }),
      );
    }

    await customer.mutation(api.catalogAccess.unlock, { accessCode: "first-order-code" });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "second-order-code" });
    const secondBefore = await admin.query(api.catalogItems.listForCatalog, { catalogId: secondCatalog.catalogId });

    const firstBefore = await admin.query(api.catalogItems.listForCatalog, { catalogId: firstCatalog.catalogId });
    expect(firstBefore.map((item) => item.title)).toEqual(["First Catalog Book", "Book B", "Book C", "Book D"]);

    await admin.mutation(api.catalogItems.move, { catalogItemId: firstExtraIds[2], targetPosition: 1 });

    const firstAfter = await admin.query(api.catalogItems.listForCatalog, { catalogId: firstCatalog.catalogId });
    expect(firstAfter.map((item) => item.title)).toEqual(["First Catalog Book", "Book D", "Book B", "Book C"]);
    expect(firstAfter.map((item) => item.sortOrder)).toEqual([0, 1, 2, 3]);

    await admin.mutation(api.catalogItems.move, {
      catalogItemId: firstBefore[0]._id,
      targetPosition: 3,
    });
    expect(
      (await admin.query(api.catalogItems.listForCatalog, { catalogId: firstCatalog.catalogId })).map(
        (item) => item.title,
      ),
    ).toEqual(["Book D", "Book B", "Book C", "First Catalog Book"]);

    await admin.mutation(api.catalogItems.move, {
      catalogItemId: firstBefore[0]._id,
      targetPosition: 0,
    });
    expect(
      (await admin.query(api.catalogItems.listForCatalog, { catalogId: firstCatalog.catalogId })).map(
        (item) => item.title,
      ),
    ).toEqual(["First Catalog Book", "Book D", "Book B", "Book C"]);
    expect(
      (await customer.query(api.catalogAccess.getUnlocked, { catalogId: firstCatalog.catalogId }))?.books.map(
        (book) => book.title,
      ),
    ).toEqual(["First Catalog Book", "Book D", "Book B", "Book C"]);
    expect(await admin.query(api.catalogItems.listForCatalog, { catalogId: secondCatalog.catalogId })).toEqual(
      secondBefore,
    );
  });
});
