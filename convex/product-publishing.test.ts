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
});
