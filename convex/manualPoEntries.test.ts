/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Manual PO domain", () => {
  beforeEach(configureTestEnvironment);

  it("lets Admin create a lightweight Customer record without creating commerce entities", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    const created = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: customerUser.appUserId,
      title: "Requested Book",
      priceAmount: 175000,
      etaText: "Estimasi tiba Januari 2027",
    });

    expect(created).toMatchObject({
      customerUserId: customerUser.appUserId,
      title: "Requested Book",
      priceAmount: 175000,
      etaText: "Estimasi tiba Januari 2027",
      status: "active",
      billingStatus: "unbilled",
      invoiceId: null,
      billedAt: null,
      archivedAt: null,
    });

    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([
      expect.objectContaining({ entryId: created.entryId, title: "Requested Book" }),
    ]);
    await expect(secondCustomer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([]);

    await expect(
      t.run(async (ctx) => ({
        books: (await ctx.db.query("books").collect()).length,
        catalogs: (await ctx.db.query("secretCatalogs").collect()).length,
        carts: (await ctx.db.query("carts").collect()).length,
        orders: (await ctx.db.query("orders").collect()).length,
        invoices: (await ctx.db.query("invoices").collect()).length,
        batches: (await ctx.db.query("batches").collect()).length,
      })),
    ).resolves.toEqual({ books: 0, catalogs: 0, carts: 0, orders: 0, invoices: 0, batches: 0 });
  });

  it("keeps Customer access read-only and ownership isolated", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    const created = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: customerUser.appUserId,
      title: "Private Manual PO",
      priceAmount: 99000,
      etaText: "ETA menyusul dari Admin",
    });

    await expect(
      customer.mutation(api.manualPoEntries.update, {
        entryId: created.entryId,
        title: "Customer overwrite",
        priceAmount: 1,
        etaText: "now",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      secondCustomer.query(api.manualPoEntries.listMine, {}),
    ).resolves.toEqual([]);
    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([
      expect.objectContaining({ entryId: created.entryId, title: "Private Manual PO" }),
    ]);
  });

  it("lets Admin issue an actionable invoice from Random PO without creating Order, Book, Catalog, or Batch", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    const created = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: customerUser.appUserId,
      title: "Random billed book",
      priceAmount: 88000,
      etaText: "April 2027",
    });

    const invoice = await admin.mutation(api.invoices.issueManualPo, { entryId: created.entryId });
    expect(invoice).toMatchObject({
      source: "manual_po",
      manualPoEntryId: created.entryId,
      orderId: null,
      status: "issued",
      totalAmount: 88000,
      outstandingAmount: 88000,
      paymentStatus: "unpaid",
    });

    await expect(customer.query(api.invoices.getMine, { invoiceId: invoice.invoiceId })).resolves.toMatchObject({
      invoiceId: invoice.invoiceId,
      source: "manual_po",
      orderId: null,
      items: [
        expect.objectContaining({
          description: "Random billed book · ETA April 2027",
          subtotalAmount: 88000,
        }),
      ],
    });

    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([
      expect.objectContaining({
        entryId: created.entryId,
        invoiceId: invoice.invoiceId,
        billingStatus: "billed",
      }),
    ]);

    await expect(
      t.run(async (ctx) => ({
        books: (await ctx.db.query("books").collect()).length,
        catalogs: (await ctx.db.query("secretCatalogs").collect()).length,
        orders: (await ctx.db.query("orders").collect()).length,
        invoices: (await ctx.db.query("invoices").collect()).length,
        batches: (await ctx.db.query("batches").collect()).length,
      })),
    ).resolves.toEqual({ books: 0, catalogs: 0, orders: 0, invoices: 1, batches: 0 });
  });

  it("supports Admin edit, status lifecycle, archive, and audit events", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    const created = await admin.mutation(api.manualPoEntries.create, {
      customerUserId: customerUser.appUserId,
      title: "Original",
      priceAmount: 100000,
      etaText: "Q1 2027",
    });
    const edited = await admin.mutation(api.manualPoEntries.update, {
      entryId: created.entryId,
      title: "Updated title",
      priceAmount: 125000,
      etaText: "Februari 2027",
    });
    expect(edited).toMatchObject({ title: "Updated title", priceAmount: 125000, etaText: "Februari 2027" });

    await expect(
      admin.mutation(api.manualPoEntries.setStatus, { entryId: created.entryId, status: "arrived" }),
    ).resolves.toMatchObject({ status: "arrived", cancelledAt: null });
    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([]);

    await expect(
      admin.mutation(api.manualPoEntries.setStatus, { entryId: created.entryId, status: "cancelled" }),
    ).resolves.toMatchObject({ status: "cancelled", cancelledAt: expect.any(Number) });
    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([]);

    await admin.mutation(api.manualPoEntries.archive, { entryId: created.entryId });
    await expect(customer.query(api.manualPoEntries.listMine, {})).resolves.toEqual([]);

    const auditActions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect())
        .filter((event) => event.targetType === "manualPoEntry" && event.targetId === String(created.entryId))
        .map((event) => event.action),
    );
    expect(auditActions).toEqual(
      expect.arrayContaining(["manual_po.created", "manual_po.updated", "manual_po.status_changed", "manual_po.archived"]),
    );
  });

  it("validates title, price, and ETA", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    await expect(
      admin.mutation(api.manualPoEntries.create, {
        customerUserId: customerUser.appUserId,
        title: " ",
        priceAmount: 100000,
        etaText: "Q1",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.mutation(api.manualPoEntries.create, {
        customerUserId: customerUser.appUserId,
        title: "Book",
        priceAmount: 0,
        etaText: "Q1",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.mutation(api.manualPoEntries.create, {
        customerUserId: customerUser.appUserId,
        title: "Book",
        priceAmount: 100000,
        etaText: " ",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });
});
