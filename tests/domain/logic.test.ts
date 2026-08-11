import { describe, expect, it } from "vitest";
import {
  calculateOrderTotal,
  canTransitionOrderStatus,
  appendDepositTransaction,
  createCatalogFromInput,
  createInvoiceFromOrder,
  createOrder,
  editOrder,
  emptyPrototypeState,
  calculateDepositRequired,
  calculateLedgerBalance,
  transitionOrderStatus,
  unlockCatalog,
} from "@/domain/prototype/logic";
import type { BookFormat, Catalog, Order } from "@/domain/prototype/types";

const catalogInput = {
  name: "Test Catalog",
  accessCode: "bless-test",
  closingAt: "2030-01-01T00:00:00.000Z",
  publisher: "Test Publisher",
  title: "Test Book",
  variants: [
    { format: "PB" as BookFormat, isbn: "9780000000001", price: 125000 },
    { format: "HB" as BookFormat, isbn: "9780000000002", price: 200000 },
  ],
};

async function createTestCatalog(): Promise<Catalog> {
  return createCatalogFromInput(catalogInput, new Date("2026-01-01T00:00:00.000Z"));
}

async function createTestOrder(catalog: Catalog): Promise<Order> {
  return createOrder(
    catalog,
    {
      customerName: "Test Blessfriend",
      items: [{ variantId: catalog.books[0].variants[0].id, quantity: 2 }],
    },
    new Date("2026-01-01T00:00:00.000Z"),
  );
}

describe("order domain logic", () => {
  it("starts with zero business records", () => {
    expect(emptyPrototypeState()).toEqual({ catalogs: [], orders: [], invoices: [] });
  });

  it("unlocks only with the catalog access code", async () => {
    const catalog = await createTestCatalog();

    await expect(unlockCatalog([catalog], "wrong-code")).resolves.toBeUndefined();
    await expect(unlockCatalog([catalog], "bless-test")).resolves.toMatchObject({ id: catalog.id });
  });

  it("calculates totals and snapshots the selected variant price", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);

    expect(calculateOrderTotal(order.items)).toBe(250000);
    expect(order.items[0]).toMatchObject({ unitPrice: 125000, quantity: 2, format: "PB" });
  });

  it("rejects orders after catalog close", async () => {
    const catalog = await createCatalogFromInput(
      { ...catalogInput, closingAt: "2025-01-01T00:00:00.000Z" },
      new Date("2026-01-01T00:00:00.000Z"),
    );

    await expect(createTestOrder(catalog)).rejects.toThrow("catalog is closed");
  });

  it("allows only declared status transitions", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);

    expect(canTransitionOrderStatus("submitted", "po_closed")).toBe(true);
    expect(canTransitionOrderStatus("submitted", "completed")).toBe(false);
    expect(() => transitionOrderStatus(order, "completed")).toThrow("invalid order transition");
  });

  it("creates an invoice from the order price snapshot", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);
    const invoice = createInvoiceFromOrder(order, { kind: "percentage", value: 30 });

    expect(invoice).toMatchObject({ orderId: order.id, total: 250000, status: "issued" });
    expect(calculateDepositRequired(invoice.total, invoice.depositRequirement)).toBe(75000);
  });

  it("keeps deposit transactions append-only", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);
    const invoice = createInvoiceFromOrder(order, { kind: "fixed", amount: 50000 });
    const credited = appendDepositTransaction(invoice, "credit", 50000, "Prototype payment recorded");

    expect(invoice.transactions).toHaveLength(0);
    expect(credited.transactions).toHaveLength(1);
    expect(calculateLedgerBalance(credited.transactions)).toBe(50000);
  });

  it("rejects invalid deposit percentages", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);

    expect(() => createInvoiceFromOrder(order, { kind: "percentage", value: 120 })).toThrow("percentage");
  });

  it("allows a submitted preorder to be edited before close and locks it after close", async () => {
    const catalog = await createTestCatalog();
    const order = await createTestOrder(catalog);
    const edited = await editOrder(
      catalog,
      order,
      { customerName: "Edited Blessfriend", items: [{ variantId: catalog.books[0].variants[1].id, quantity: 1 }] },
      new Date("2026-01-02T00:00:00.000Z"),
    );

    expect(edited).toMatchObject({ id: order.id, customerName: "Edited Blessfriend", total: 200000 });
    await expect(
      editOrder({ ...catalog, status: "closed" }, edited, {
        customerName: edited.customerName,
        items: edited.items.map((item) => ({ variantId: item.variantId, quantity: 1 })),
      }),
    ).rejects.toThrow("order is locked");
  });
});
