/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function storeTestMedia(t: ReturnType<typeof testConvex>) {
  return t.run(async (ctx) =>
    ctx.storage.store(
      new Blob([new Uint8Array([1, 2, 3]).buffer as ArrayBuffer], {
        type: "image/png",
      }),
    ),
  );
}

describe("BFG destructive action guards", () => {
  beforeEach(configureTestEnvironment);

  it("cleans owned media without deleting shared storage", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("Expected admin user");

    const publisherId = await admin.mutation(api.publishers.create, {
      name: "Shared Media Publisher",
    });
    const first = await admin.mutation(api.books.create, {
      publisherId,
      title: "First draft",
    });
    const second = await admin.mutation(api.books.create, {
      publisherId,
      title: "Second draft",
    });
    const sharedCover = await storeTestMedia(t);
    const ownedGallery = await storeTestMedia(t);

    await t.run(async (ctx) => {
      await ctx.db.patch(first, {
        coverStorageId: sharedCover,
        updatedAt: Date.now(),
      });
      await ctx.db.patch(second, {
        coverStorageId: sharedCover,
        updatedAt: Date.now(),
      });
      await ctx.db.insert("bookMedia", {
        bookId: first,
        storageId: ownedGallery,
        displayOrder: 0,
        altText: "First draft gallery",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        createdByUserId: adminUser.appUserId,
      });
    });

    await admin.mutation(api.books.remove, { bookId: first });

    await expect(admin.query(api.books.getForAdmin, { bookId: second })).resolves.not.toBeNull();
    await expect(t.run(async (ctx) => ctx.storage.getUrl(sharedCover))).resolves.not.toBeNull();
    await expect(t.run(async (ctx) => ctx.storage.getUrl(ownedGallery))).resolves.toBeNull();

    await admin.mutation(api.books.remove, { bookId: second });
    await expect(t.run(async (ctx) => ctx.storage.getUrl(sharedCover))).resolves.toBeNull();
  });

  it("deletes only an unused draft Book and its empty stock setup", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Unused Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Unused Draft" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000000001",
      priceAmount: 100000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 0 });

    await expect(customer.mutation(api.books.remove, { bookId })).rejects.toThrow("PERMISSION_DENIED");
    await expect(admin.mutation(api.books.remove, { bookId })).resolves.toEqual({ removed: true });
    await expect(admin.query(api.books.getForAdmin, { bookId })).resolves.toBeNull();
    await expect(admin.mutation(api.publishers.remove, { publisherId })).resolves.toEqual({ removed: true });
    await expect(admin.mutation(api.books.remove, { bookId })).rejects.toThrow("BOOK_NOT_FOUND");
  });

  it("hard deletes a referenced Book while removing its active catalog surface", async () => {
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

    await expect(admin.mutation(api.books.remove, { bookId })).resolves.toEqual({ removed: true });
    await expect(admin.query(api.books.getForAdmin, { bookId })).resolves.toBeNull();
    await expect(admin.query(api.catalogItems.listForCatalog, { catalogId })).resolves.toEqual([]);
    await expect(admin.query(api.bookVariants.listForBook, { bookId })).resolves.toEqual([]);
    await expect(admin.mutation(api.publishers.remove, { publisherId })).resolves.toEqual({ removed: true });
    await expect(admin.mutation(api.secretCatalogs.remove, { catalogId })).resolves.toEqual({ removed: true });
  });

  it("hard deletes a Book with Ready Stock and cleans active stock setup", async () => {
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
    await expect(admin.mutation(api.books.remove, { bookId })).resolves.toEqual({ removed: true });
    await expect(admin.query(api.books.getForAdmin, { bookId })).resolves.toBeNull();
    await expect(admin.query(api.bookVariants.listForBook, { bookId })).resolves.toEqual([]);
    await expect(admin.query(api.readyStock.list, {})).resolves.toMatchObject({ items: [] });
  });

  it("reconciles only the deleted Book from an active unissued Batch commitment", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const first = await createOpenCatalog(admin, "Active Delete Catalog A", "0004", "active-delete-a");
    const second = await createOpenCatalog(admin, "Active Delete Catalog B", "0005", "active-delete-b");
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    const firstOrder = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser.appUserId,
      catalogId: first.catalogId,
      submissionKey: "active-delete-order-a",
      items: [{ variantId: first.variantIds[0], quantity: 1 }],
    });
    const secondOrder = await admin.mutation(api.orders.createAssisted, {
      customerUserId: customerUser.appUserId,
      catalogId: second.catalogId,
      submissionKey: "active-delete-order-b",
      items: [{ variantId: second.variantIds[0], quantity: 1 }],
    });
    const batch = await admin.mutation(api.batches.create, { name: "Active Delete Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: first.catalogId });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: second.catalogId });

    await expect(admin.mutation(api.books.remove, { bookId: first.bookId })).resolves.toEqual({ removed: true });
    expect(await admin.query(api.orders.getForAdmin, { orderId: firstOrder.orderId })).toMatchObject({
      status: "cancelled",
      totalAmount: 0,
      items: [],
    });
    expect(await admin.query(api.orders.getForAdmin, { orderId: secondOrder.orderId })).toMatchObject({
      status: "submitted",
      totalAmount: 125000,
      items: [expect.objectContaining({ bookTitleSnapshot: "Active Delete Catalog B Book" })],
    });
    const detail = await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId });
    expect(detail).toMatchObject({ assignmentCount: 1, assignedQuantity: 1 });
    expect(detail.purchaseSummary).toEqual([
      expect.objectContaining({ bookTitle: "Active Delete Catalog B Book", quantity: 1 }),
    ]);
    await expect(admin.query(api.books.getForAdmin, { bookId: first.bookId })).resolves.toBeNull();
    await expect(admin.query(api.books.getForAdmin, { bookId: second.bookId })).resolves.not.toBeNull();
  });

  it("preserves historical Order, Batch, Invoice, Payment, and Buku Saya truth after Book deletion", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Historical Delete Catalog", "0006", "historical-delete-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "historical-delete-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Historical Delete Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    const batch = await admin.mutation(api.batches.create, { name: "Historical Delete Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: bundle.catalogId });
    await admin.mutation(api.batchTracking.updateShipmentStage, { batchId: batch.batchId, toStage: "po_closed" });
    const invoice = await admin.mutation(api.invoices.issueCustomerBatch, {
      customerUserId: customerUser.appUserId,
      batchId: batch.batchId,
      depositRequirementMode: "none",
    });
    const confirmation = await customer.action(api.paymentConfirmations.submit, {
      invoiceId: invoice.invoiceId,
      amount: 125000,
      paymentMethod: "Bank transfer",
      transferReference: "HISTORICAL-DELETE-PAYMENT",
      paidAt: Date.now() - 1_000,
    });
    await admin.mutation(api.paymentConfirmations.startReview, { confirmationId: confirmation.confirmationId });
    await admin.mutation(api.paymentConfirmations.approve, { confirmationId: confirmation.confirmationId });
    const invoiceBefore = await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId });
    const paymentBefore = await admin.query(api.paymentConfirmations.getForAdmin, {
      confirmationId: confirmation.confirmationId,
    });

    await expect(admin.mutation(api.books.remove, { bookId: bundle.bookId })).resolves.toEqual({ removed: true });
    await expect(admin.query(api.books.getForAdmin, { bookId: bundle.bookId })).resolves.toBeNull();
    expect(await admin.query(api.orders.getForAdmin, { orderId: order.orderId })).toMatchObject({
      status: "submitted",
      items: [
        expect.objectContaining({
          bookTitleSnapshot: "Historical Delete Catalog Book",
          publisherNameSnapshot: "Historical Delete Catalog Publisher",
          formatSnapshot: "PB",
          isbnSnapshot: "97800000006",
          quantity: 1,
          unitPriceAmountSnapshot: 125000,
        }),
      ],
    });
    expect(await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).toMatchObject({
      invoiceId: invoiceBefore.invoiceId,
      batchId: batch.batchId,
      totalAmount: invoiceBefore.totalAmount,
      adjustedTotalAmount: invoiceBefore.adjustedTotalAmount,
      verifiedPaymentAmount: invoiceBefore.verifiedPaymentAmount,
      outstandingAmount: invoiceBefore.outstandingAmount,
      items: [
        expect.objectContaining({
          bookTitleSnapshot: "Historical Delete Catalog Book",
          publisherNameSnapshot: "Historical Delete Catalog Publisher",
          formatSnapshot: "PB",
          isbnSnapshot: "97800000006",
          quantity: 1,
          unitPriceAmountSnapshot: 125000,
        }),
      ],
    });
    expect(
      await admin.query(api.paymentConfirmations.getForAdmin, {
        confirmationId: confirmation.confirmationId,
      }),
    ).toMatchObject({
      confirmationId: paymentBefore.confirmationId,
      status: "approved",
      amount: 125000,
      invoiceId: invoice.invoiceId,
    });
    const overview = await customer.query(api.batchTracking.getBookOverview, {
      startAt: Date.now() - 86_400_000,
      endAt: Date.now() + 1_000,
    });
    expect(overview).toMatchObject({ totalSpending: 125000, pendingPayment: 0 });
    expect(overview.batches[0]?.items[0]).toMatchObject({
      title: "Historical Delete Catalog Book",
      publisher: "Historical Delete Catalog Publisher",
      format: "PB",
      isbn: "97800000006",
      quantity: 1,
      unitPriceAmount: 125000,
    });
    expect((await customer.query(api.batchTracking.getBatchMine, { batchId: batch.batchId }))?.items).toEqual([
      expect.objectContaining({ title: "Historical Delete Catalog Book", quantity: 1 }),
    ]);
    expect((await admin.query(api.batchTracking.getForAdmin, { batchId: batch.batchId })).assignments).toEqual([
      expect.objectContaining({ bookTitle: "Historical Delete Catalog Book", assignedQuantity: 1 }),
    ]);
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).some((event) => event.action === "book.deleted"),
      ),
    ).toBe(true);
    await expect(admin.mutation(api.books.remove, { bookId: bundle.bookId })).rejects.toThrow("BOOK_NOT_FOUND");
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

  it("restores an archived Catalog as the same draft without losing its products", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Archived Restore Catalog", "0008");

    await admin.mutation(api.secretCatalogs.archive, { catalogId: bundle.catalogId });
    await expect(customer.mutation(api.secretCatalogs.restore, { catalogId: bundle.catalogId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    const restored = await admin.mutation(api.secretCatalogs.restore, { catalogId: bundle.catalogId });

    expect(restored).toMatchObject({ id: bundle.catalogId, status: "draft" });
    await expect(admin.query(api.secretCatalogs.getForAdmin, { catalogId: bundle.catalogId })).resolves.toMatchObject({
      _id: bundle.catalogId,
      status: "draft",
      name: "Archived Restore Catalog",
    });
    await expect(admin.query(api.catalogItems.listForCatalog, { catalogId: bundle.catalogId })).resolves.toMatchObject([
      { bookVariantId: bundle.variantIds[0], format: "PB", isbn: "97800000008" },
    ]);
    await expect(admin.query(api.bookVariants.listForBook, { bookId: bundle.bookId })).resolves.toMatchObject([
      { _id: bundle.variantIds[0], format: "PB", isbn: "97800000008" },
    ]);
    await expect(
      t.run(async (ctx) => (await ctx.db.query("auditEvents").collect()).map((event) => event.action)),
    ).resolves.toEqual(expect.arrayContaining(["catalog.archived", "catalog.restored"]));
    await expect(admin.mutation(api.secretCatalogs.restore, { catalogId: bundle.catalogId })).rejects.toThrow(
      "CATALOG_CLOSED",
    );
  });

  it("rejects restore from a non-archived Catalog state", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Draft Restore Guard" });

    await expect(admin.mutation(api.secretCatalogs.restore, { catalogId })).rejects.toThrow("CATALOG_CLOSED");
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
