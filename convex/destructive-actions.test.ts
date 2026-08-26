/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG destructive action guards", () => {
  beforeEach(configureTestEnvironment);

  it("deletes only an unused draft Book and its empty stock setup", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Unused Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Unused Draft" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000000001",
      priceAmount: 100000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 0 });

    await expect(admin.mutation(api.books.remove, { bookId })).resolves.toEqual({ removed: true });
    await expect(admin.query(api.books.getForAdmin, { bookId })).resolves.toBeNull();
    await expect(admin.mutation(api.publishers.remove, { publisherId })).resolves.toEqual({ removed: true });
  });

  it("keeps a referenced Book and Catalog from hard deletion", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Referenced Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Referenced Draft" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "BB",
      isbn: "9780000000002",
      priceAmount: 110000,
    });
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Referenced Draft Catalog" });
    await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: variantId });

    await expect(admin.mutation(api.books.remove, { bookId })).rejects.toThrow("ENTITY_IN_USE");
    await expect(admin.mutation(api.publishers.remove, { publisherId })).rejects.toThrow("ENTITY_IN_USE");
    await expect(admin.mutation(api.secretCatalogs.remove, { catalogId })).rejects.toThrow("ENTITY_IN_USE");
    await expect(admin.query(api.books.getForAdmin, { bookId })).resolves.not.toBeNull();
  });

  it("keeps physical Ready Stock from hard deletion", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Stock Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Stock Draft" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000000003",
      priceAmount: 120000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 3 });

    await expect(admin.mutation(api.readyStock.remove, { bookVariantId: variantId })).rejects.toThrow("ENTITY_IN_USE");
    await expect(admin.mutation(api.bookVariants.remove, { bookVariantId: variantId })).rejects.toThrow(
      "ENTITY_IN_USE",
    );
    await expect(admin.mutation(api.books.remove, { bookId })).rejects.toThrow("ENTITY_IN_USE");
  });

  it("deletes a pristine draft Catalog and Batch, but keeps linked batches operational", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const draftCatalogId = await admin.mutation(api.secretCatalogs.create, { name: "Unused Catalog" });
    await expect(admin.mutation(api.secretCatalogs.remove, { catalogId: draftCatalogId })).resolves.toEqual({
      removed: true,
    });

    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Linked Catalog" });
    const pristineBatch = await admin.mutation(api.batches.create, { name: "Pristine Batch" });
    await expect(admin.mutation(api.batches.remove, { batchId: pristineBatch.batchId })).resolves.toEqual({
      removed: true,
    });

    const linkedBatch = await admin.mutation(api.batches.create, { name: "Operational Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: linkedBatch.batchId, catalogId });
    await expect(admin.mutation(api.batches.remove, { batchId: linkedBatch.batchId })).rejects.toThrow("ENTITY_IN_USE");
  });

  it("allows a closed Catalog to reopen until linked procurement is locked", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const closesAt = Date.now() + 24 * 60 * 60 * 1000;
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Reopenable Catalog", closesAt });
    await admin.mutation(api.secretCatalogs.open, { catalogId });
    await admin.mutation(api.secretCatalogs.close, { catalogId });
    await expect(admin.mutation(api.secretCatalogs.reopen, { catalogId })).resolves.toMatchObject({ status: "open" });

    const batch = await admin.mutation(api.batches.create, { name: "Locked Batch", poDeadlineAt: closesAt });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId });
    await t.run(async (ctx) => {
      await ctx.db.patch(batch.batchId, { currentShipmentStage: "po_closed", updatedAt: Date.now() });
    });
    await admin.mutation(api.secretCatalogs.close, { catalogId });
    await expect(admin.mutation(api.secretCatalogs.reopen, { catalogId })).rejects.toThrow("CATALOG_REOPEN_BLOCKED");
  });

  it("requires a populated roster before locking a Batch PO", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const batch = await admin.mutation(api.batches.create, { name: "Empty Roster Batch" });
    await expect(
      admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" }),
    ).rejects.toThrow("BATCH_ROSTER_REQUIRED");
  });
});
