/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { buildOrderSearchText } from "./lib/orderSearch";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Order read contracts", () => {
  beforeEach(configureTestEnvironment);

  it("keeps list rows shallow while detail preserves effective quantity and history", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "catalog-secret" });
    const created = await customer.mutation(api.orders.submit, {
      catalogId: catalog.catalogId,
      customerName: "List Contract Customer",
      items: [{ variantId: catalog.variantIds[0], quantity: 2, expectedUnitPriceAmount: 125000 }],
    });

    await admin.mutation(api.orderExceptions.cancelItem, {
      orderItemId: created.items[0]._id,
      affectedQuantity: 1,
      reason: "List contract cancellation",
    });

    const adminList = await admin.query(api.orders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(adminList.page[0]).not.toHaveProperty("statusHistory");
    expect(adminList.page[0].items[0]).toMatchObject({ quantity: 1, bookTitleSnapshot: "Test Catalog Book" });
    expect(adminList.page[0].items[0]).not.toHaveProperty("isbnSnapshot");

    const customerList = await customer.query(api.orders.listMine, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(customerList.page[0].statusHistory).toEqual([expect.objectContaining({ status: "submitted" })]);
    expect(customerList.page[0].items[0]).toMatchObject({ quantity: 1 });

    const detail = await admin.query(api.orders.getForAdmin, { orderId: created.orderId });
    expect(detail.statusHistory).toEqual([expect.objectContaining({ status: "submitted" })]);
    expect(detail.items[0]).toMatchObject({ quantity: 1, isbnSnapshot: "97800000001" });
  });

  it("finds a matching Order beyond the old bounded list window", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");

    await t.run(async (ctx) => {
      const base = Date.now() - 1_000_000;
      for (let index = 0; index < 1_000; index += 1) {
        const isTarget = index === 0;
        const orderId = await ctx.db.insert("orders", {
          customerUserId: customerUser.appUserId,
          source: "customer_self_service",
          orderCode: `BFG-ORD-SCALE-${index}`,
          orderSearchText: isTarget
            ? buildOrderSearchText({
                orderId: `scale-${index}`,
                orderCode: `BFG-ORD-SCALE-${index}`,
                customerName: "Target Beyond Window",
                customerEmail: "target@example.com",
                itemTitles: [],
              })
            : `nonmatching-order-${index}`,
          customerName: isTarget ? "Target Beyond Window" : `Scale Customer ${index}`,
          customerEmail: `${isTarget ? "target" : `scale-${index}`}@example.com`,
          status: "submitted",
          currency: "IDR",
          subtotalAmount: 125000,
          totalAmount: 125000,
          createdAt: base + index,
          updatedAt: base + index,
          submittedAt: base + index,
          editableUntil: base + index + 86_400_000,
        });
        if (isTarget) {
          await ctx.db.insert("orderStatusHistory", {
            orderId,
            toStatus: "submitted",
            changedAt: base + index,
            changedByUserId: customerUser.appUserId,
          });
        }
      }
    });

    const recent = await admin.query(api.orders.listForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(recent.page.map((row) => row.customerName)).not.toContain("Target Beyond Window");

    const search = await admin.query(api.orders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
      search: "target beyond",
    });
    expect(search.page).toEqual([expect.objectContaining({ customerName: "Target Beyond Window" })]);
    const partialSearch = await admin.query(api.orders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
      search: "eyond",
    });
    expect(partialSearch.page).toEqual([expect.objectContaining({ customerName: "Target Beyond Window" })]);
  });

  it("backfills the canonical search projection for legacy Orders", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Legacy Search Catalog", "0009", "legacy-search-code");
    const customerUser = await customer.query(api.users.current, {});
    const variant = await t.run((ctx) => ctx.db.get(catalog.variantIds[0]));
    const book = variant ? await t.run((ctx) => ctx.db.get(variant.bookId)) : null;
    if (!customerUser || !variant || !book) throw new Error("legacy search fixture missing");

    const orderId = await t.run(async (ctx) => {
      const now = Date.now();
      const id = await ctx.db.insert("orders", {
        customerUserId: customerUser.appUserId,
        catalogId: catalog.catalogId,
        source: "customer_self_service",
        orderCode: "BFG-ORD-LEGACY-SEARCH",
        customerName: "Legacy Search Customer",
        customerEmail: "legacy-search@example.com",
        status: "submitted",
        currency: "IDR",
        subtotalAmount: 125000,
        totalAmount: 125000,
        createdAt: now,
        updatedAt: now,
        submittedAt: now,
        editableUntil: now + 86_400_000,
      });
      await ctx.db.insert("orderItems", {
        orderId: id,
        bookId: book._id,
        bookVariantId: variant._id,
        bookTitleSnapshot: book.title,
        publisherNameSnapshot: "Legacy Search Catalog Publisher",
        formatSnapshot: variant.format,
        isbnSnapshot: variant.isbn,
        unitPriceAmountSnapshot: variant.priceAmount,
        currencySnapshot: "IDR",
        quantity: 1,
        subtotalAmount: variant.priceAmount,
        createdAt: now,
      });
      return id;
    });

    await admin.mutation(api.orders.backfillOrderSearchText, {});
    const search = await admin.query(api.orders.listForAdmin, {
      paginationOpts: { numItems: 10, cursor: null },
      search: "legacy search customer",
    });
    expect(search.page).toEqual([expect.objectContaining({ orderId })]);
  });
});
