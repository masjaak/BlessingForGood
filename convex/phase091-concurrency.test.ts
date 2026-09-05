/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import {
  asUser,
  configureTestEnvironment,
  createOpenCatalog,
  seedApprovedJoinRequest,
  setupUsers,
  testConvex,
} from "../tests/convex-helpers";

describe("Phase 09.1 deterministic concurrency assurance", () => {
  beforeEach(configureTestEnvironment);

  it("never oversells Ready Stock under concurrent reservations", async () => {
    const t = testConvex();
    const users = await setupUsers(t);
    const publisherId = await users.admin.mutation(api.publishers.create, { name: "Concurrency Publisher" });
    const bookId = await users.admin.mutation(api.books.create, {
      publisherId,
      title: "Concurrency Book",
      categories: ["Concurrency"],
    });
    const variantId = await users.admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000910001",
      priceAmount: 125000,
    });
    await users.admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 5 });
    await users.admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const customers = [users.customer, users.secondCustomer];
    for (const suffix of ["third", "fourth", "fifth", "sixth"]) {
      const subject = `phase091-${suffix}`;
      await seedApprovedJoinRequest(t, `${subject}@example.com`);
      const customer = asUser(t, subject);
      await customer.mutation(api.users.ensureCurrentUser, {});
      customers.push(customer);
    }

    const attempts = await Promise.allSettled(
      customers.map((customer) => customer.mutation(api.orders.createReadyStock, { variantId, quantity: 1 })),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(5);

    const inventory = await t.run((ctx) =>
      ctx.db
        .query("readyStockInventory")
        .withIndex("by_book_variant_id", (index) => index.eq("bookVariantId", variantId))
        .unique(),
    );
    expect(inventory).toMatchObject({ quantity: 5, reservedQuantity: 5 });
    if (!inventory) throw new Error("Ready Stock inventory was not created");
    expect(inventory.quantity - (inventory.reservedQuantity ?? 0)).toBeGreaterThanOrEqual(0);
  });

  it("keeps duplicate payment submission to one pending consequence", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Payment Concurrency", "0912", "payment-concurrency-code");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "payment-concurrency-code" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "Concurrency Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
    });
    const created = await admin.mutation(api.invoices.create, {
      orderId: order.orderId,
      depositRequirementMode: "none",
    });
    const invoice = await admin.mutation(api.invoices.issue, { invoiceId: created.invoiceId });

    const attempts = await Promise.allSettled(
      ["CONCURRENT-PAYMENT-A", "CONCURRENT-PAYMENT-B"].map((transferReference) =>
        customer.action(api.paymentConfirmations.submit, {
          invoiceId: invoice.invoiceId,
          amount: 1,
          paymentMethod: "bank_transfer",
          transferReference,
          paidAt: Date.now(),
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(1);
    expect(
      await t.run((ctx) =>
        ctx.db
          .query("paymentConfirmations")
          .withIndex("by_invoice", (index) => index.eq("invoiceId", invoice.invoiceId))
          .collect(),
      ),
    ).toHaveLength(1);
  });

  it("keeps concurrent deposit allocations within available balance", async () => {
    const t = testConvex();
    const { admin, customer, invoice } = await (async () => {
      const users = await setupUsers(t);
      const catalog = await createOpenCatalog(users.admin, "Deposit Concurrency", "0913", "deposit-concurrency-code");
      await users.customer.mutation(api.catalogAccess.unlock, { accessCode: "deposit-concurrency-code" });
      const order = await users.customer.mutation(api.orders.submit, {
        catalogId: catalog.catalogId,
        customerName: "Deposit Concurrency Customer",
        items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
      });
      const created = await users.admin.mutation(api.invoices.create, {
        orderId: order.orderId,
        depositRequirementMode: "none",
      });
      const invoice = await users.admin.mutation(api.invoices.issue, { invoiceId: created.invoiceId });
      await users.admin.mutation(api.depositTransactions.recordCredit, {
        invoiceId: invoice.invoiceId,
        amount: 100000,
      });
      return { admin: users.admin, customer: users.customer, invoice };
    })();

    const attempts = await Promise.allSettled([
      customer.mutation(api.invoiceDepositAllocations.allocateMine, { invoiceId: invoice.invoiceId }),
      admin.mutation(api.invoiceDepositAllocations.allocate, { invoiceId: invoice.invoiceId, amount: 80000 }),
    ]);
    expect(attempts.filter((attempt) => attempt.status === "fulfilled").length).toBeGreaterThanOrEqual(1);

    const account = await admin.query(api.depositAccounts.getForInvoice, { invoiceId: invoice.invoiceId });
    expect(account.account?.availableAmount).toBeGreaterThanOrEqual(0);
    expect(account.account?.reservedAmount).toBeLessThanOrEqual(100000);
    expect((account.account?.availableAmount || 0) + (account.account?.reservedAmount || 0)).toBe(100000);
    expect(
      (await admin.query(api.invoices.getForAdmin, { invoiceId: invoice.invoiceId })).outstandingAmount,
    ).toBeGreaterThanOrEqual(0);
  });

  it("keeps concurrent preorder writes and automatic Batch assignments aligned", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Preorder Concurrency", "0914", "preorder-concurrency-code");
    const batch = await admin.mutation(api.batches.create, { name: "Preorder Concurrency Batch" });
    await admin.mutation(api.batches.linkCatalog, { batchId: batch.batchId, catalogId: catalog.catalogId });

    const customers = [];
    const customerUserIds = new Set<string>();
    for (let index = 0; index < 25; index += 1) {
      const subject = `phase091-preorder-${index}`;
      await seedApprovedJoinRequest(t, `${subject}@example.com`);
      const customer = asUser(t, subject);
      await customer.mutation(api.users.ensureCurrentUser, {});
      await customer.mutation(api.catalogAccess.unlock, { accessCode: "preorder-concurrency-code" });
      const user = await customer.query(api.users.current, {});
      if (!user) throw new Error("preorder concurrency customer missing");
      customerUserIds.add(String(user.appUserId));
      customers.push(customer);
    }

    const attempts = await Promise.allSettled(
      customers.map((customer) =>
        customer.mutation(api.orders.submit, {
          catalogId: catalog.catalogId,
          customerName: "Concurrent Customer",
          items: [{ variantId: catalog.variantIds[0], quantity: 1 }],
        }),
      ),
    );
    expect(attempts.filter((attempt) => attempt.status === "fulfilled")).toHaveLength(25);

    const snapshot = await t.run(async (ctx) => ({
      orders: await ctx.db.query("orders").collect(),
      items: await ctx.db.query("orderItems").collect(),
      assignments: await ctx.db.query("orderItemBatchAssignments").collect(),
      invoices: await ctx.db.query("invoices").collect(),
      catalogItems: await ctx.db
        .query("catalogItems")
        .withIndex("by_catalog", (index) => index.eq("catalogId", catalog.catalogId))
        .collect(),
    }));
    expect(snapshot.orders).toHaveLength(25);
    expect(snapshot.items).toHaveLength(25);
    expect(snapshot.assignments).toHaveLength(25);
    expect(snapshot.invoices).toEqual([]);
    expect(snapshot.catalogItems).toHaveLength(1);
    expect(new Set(snapshot.orders.map((order) => String(order.orderCode))).size).toBe(25);
    expect(new Set(snapshot.orders.map((order) => String(order.customerUserId)))).toEqual(customerUserIds);
    expect(
      snapshot.orders.every(
        (order) =>
          order.catalogId === catalog.catalogId &&
          customerUserIds.has(String(order.customerUserId)) &&
          order.status === "submitted",
      ),
    ).toBe(true);
    expect(new Set(snapshot.items.map((item) => String(item.orderId)))).toEqual(
      new Set(snapshot.orders.map((order) => String(order._id))),
    );
    const catalogItemIds = new Set(snapshot.catalogItems.map((item) => String(item._id)));
    expect(
      snapshot.items.every(
        (item) =>
          item.catalogItemId !== undefined && catalogItemIds.has(String(item.catalogItemId)) && item.quantity === 1,
      ),
    ).toBe(true);
    expect(new Set(snapshot.assignments.map((assignment) => String(assignment.orderItemId)))).toEqual(
      new Set(snapshot.items.map((item) => String(item._id))),
    );
    expect(snapshot.assignments.every((assignment) => assignment.batchId === batch.batchId)).toBe(true);
  }, 60000);
});
