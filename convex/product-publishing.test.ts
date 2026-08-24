/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG product publishing projections", () => {
  beforeEach(configureTestEnvironment);

  it("projects a published Ready Stock product with customer-safe availability", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Client Publisher" });
    const bookId = await admin.mutation(api.books.create, {
      publisherId,
      title: "Client Product",
      author: "Client Author",
      description: "Customer-facing description",
    });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000099001",
      priceAmount: 175000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 3 });

    expect((await t.query(api.readyStock.list, {})).items).toEqual([]);
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const result = await t.query(api.readyStock.list, {});
    expect(result.items[0]).toMatchObject({
      title: "Client Product",
      publisher: { name: "Client Publisher" },
      variants: [{ format: "PB", isbn: "9780000099001", priceAmount: 175000, stockQuantity: 3 }],
    });
    const variant = result.items[0]?.variants[0];
    if (!variant) throw new Error("published product projection missing variant");
    expect(variant).not.toHaveProperty("onHandQuantity");
    expect(variant).not.toHaveProperty("reservedQuantity");
  });

  it("does not expose an active draft book through a valid Secret Catalog session", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Private Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Draft Private Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "HB",
      isbn: "9780000099002",
      priceAmount: 220000,
    });
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Private Client Catalog" });
    await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: variantId });
    await admin.mutation(api.catalogAccess.setCode, { catalogId, accessCode: "private-client-code" });
    await admin.mutation(api.secretCatalogs.open, { catalogId });

    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "private-client-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    expect(unlocked.catalog.books).toEqual([]);
    expect(
      await customer.query(api.catalogAccess.getUnlocked, {
        catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).toMatchObject({ books: [] });
  });

  it("projects a special catalog product only through valid scoped access", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Scoped Client Catalog", "9903", "scoped-client-code");

    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "scoped-client-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    expect(unlocked.catalog.books[0]).toMatchObject({
      title: "Scoped Client Catalog Book",
      publisher: "Scoped Client Catalog Publisher",
      variants: [{ isbn: "97800009903", price: 125000, availability: "available" }],
    });
    expect(JSON.stringify(unlocked.catalog)).not.toContain("codeDigest");
    expect(
      await t.query(api.catalogAccess.getUnlocked, {
        catalogId: bundle.catalogId,
        sessionToken: "not-a-valid-session",
      }),
    ).toBeNull();
  });

  it("counts distinct Book Master titles instead of catalog formats", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
      name: "Distinct Title Catalog",
      publisherName: "Distinct Publisher",
      bookTitle: "Same Book",
      accessCode: "distinct-title-code",
      variants: [
        { format: "PB", isbn: "9780000011111", priceAmount: 125000 },
        { format: "HB", isbn: "9780000011112", priceAmount: 150000 },
      ],
    });
    await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
    expect((await admin.query(api.secretCatalogs.list, { paginationOpts: { numItems: 10, cursor: null } })).page[0]).toMatchObject({
      titleCount: 1,
      books: [{ title: "Same Book", variants: [{ format: "PB" }, { format: "HB" }] }],
    });

    const publisherId = await admin.mutation(api.publishers.create, { name: "Second Distinct Publisher" });
    const secondBookId = await admin.mutation(api.books.create, { publisherId, title: "Second Book" });
    await admin.mutation(api.books.update, { bookId: secondBookId, publicationStatus: "published" });
    const secondVariantId = await admin.mutation(api.bookVariants.create, {
      bookId: secondBookId,
      format: "PB",
      isbn: "9780000011113",
      priceAmount: 175000,
    });
    await admin.mutation(api.catalogItems.add, { catalogId: bundle.catalogId, bookVariantId: secondVariantId });

    const adminCatalog = await admin.query(api.secretCatalogs.getForAdmin, { catalogId: bundle.catalogId });
    if (!adminCatalog) throw new Error("catalog missing after title-count setup");
    const view = adminCatalog.view;
    expect(view.titleCount).toBe(2);
    expect(view.books).toHaveLength(2);
  });

  it("supports multiple publishers and titles in one Secret Catalog preorder", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Multi Publisher Catalog", "9910", "multi-publisher-code");
    const extraVariants = [];
    for (const [publisherName, title, isbn] of [
      ["Publisher B", "Book B", "97800009911"],
      ["Publisher C", "Book C", "97800009912"],
    ]) {
      const publisherId = await admin.mutation(api.publishers.create, { name: publisherName });
      const bookId = await admin.mutation(api.books.create, { publisherId, title });
      await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
      const variantId = await admin.mutation(api.bookVariants.create, {
        bookId,
        format: "PB",
        isbn,
        priceAmount: 135000,
      });
      await admin.mutation(api.catalogItems.add, { catalogId: catalog.catalogId, bookVariantId: variantId });
      extraVariants.push(variantId);
    }

    await customer.mutation(api.catalogAccess.unlock, { accessCode: "multi-publisher-code" });
    const view = await customer.query(api.catalogAccess.getUnlocked, { catalogId: catalog.catalogId });
    expect(view?.books).toHaveLength(3);
    expect(new Set(view?.books.map((book) => book.publisher))).toEqual(
      new Set(["Multi Publisher Catalog Publisher", "Publisher B", "Publisher C"]),
    );

    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Multi Publisher Customer",
      items: [
        { variantId: catalog.variantIds[0], quantity: 1 },
        { variantId: extraVariants[0], quantity: 2 },
        { variantId: extraVariants[1], quantity: 1 },
      ],
    });
    expect(order.items).toHaveLength(3);
    expect(new Set(order.items.map((item) => item.publisherNameSnapshot))).toHaveLength(3);
  });

  it("persists Master Book edits as Draft until explicit publication", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Draft Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Draft Book" });

    await admin.mutation(api.books.update, { bookId, description: "Saved draft description" });
    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({
      description: "Saved draft description",
      publicationStatus: "draft",
    });
    await expect(
      customer.mutation(api.books.update, { bookId, description: "Customer attempt" }),
    ).rejects.toThrow("PERMISSION_DENIED");

    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
    expect(await admin.query(api.books.getForAdmin, { bookId })).toMatchObject({ publicationStatus: "published" });
  });
});
