/// <reference types="vite/client" />

import { convexTest } from "convex-test";
import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";

const modules = import.meta.glob("./**/*.ts");

const adminAccessCode = "test-admin-code";
const adminToken = "admin-session-token-012345678901234567890123456789";
const customerToken = "customer-session-token-012345678901234567890123456789";
const secondCustomerToken = "second-customer-token-012345678901234567890123456789";

function testConvex() {
  return convexTest(schema, modules);
}

async function createAdmin(t: ReturnType<typeof testConvex>, token = adminToken) {
  await t.mutation(api.prototypeSessions.createCustomer, { token });
  const result = await t.mutation(api.prototypeSessions.claimAdmin, { token, accessCode: adminAccessCode });
  expect(result).toMatchObject({ ok: true, role: "admin" });
  return token;
}

async function createOpenCatalog(t: ReturnType<typeof testConvex>, token: string) {
  const bundle = await t.mutation(api.secretCatalogs.createBundle, {
    sessionToken: token,
    name: "Test Catalog",
    publisherName: "Test Publisher",
    bookTitle: "Test Book",
    accessCode: "catalog-secret",
    variants: [
      { format: "BB", isbn: "9780000000001", priceAmount: 100000 },
      { format: "PB", isbn: "9780000000002", priceAmount: 125000 },
      { format: "HB", isbn: "9780000000003", priceAmount: 150000 },
    ],
  });
  await t.mutation(api.secretCatalogs.open, { sessionToken: token, catalogId: bundle.catalogId });
  return bundle;
}

describe("BFG Convex core persistence", () => {
  beforeEach(() => {
    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
    process.env.BFG_SESSION_TOKEN_PEPPER = "session-test-pepper";
    process.env.BFG_PREVIEW_ADMIN_ACCESS_CODE = adminAccessCode;
  });

  it("starts with zero business records", async () => {
    const t = testConvex();
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });

    const catalogs = await t.query(api.catalogAccess.listAccessible, {
      sessionToken: customerToken,
      paginationOpts: { numItems: 10, cursor: null },
    });
    const orders = await t.query(api.orders.listMine, {
      sessionToken: customerToken,
      paginationOpts: { numItems: 10, cursor: null },
    });

    expect(catalogs.page).toEqual([]);
    expect(orders.page).toEqual([]);
  });

  it("requires the Preview capability and an explicit admin code", async () => {
    const t = testConvex();
    process.env.BFG_PREVIEW_DEMO_MODE = "false";
    await expect(t.mutation(api.prototypeSessions.createCustomer, { token: customerToken })).rejects.toThrow(
      "PREVIEW_MODE_DISABLED",
    );

    process.env.BFG_PREVIEW_DEMO_MODE = "true";
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await expect(
      t.mutation(api.prototypeSessions.claimAdmin, { token: customerToken, accessCode: "wrong" }),
    ).resolves.toMatchObject({ ok: false });
    await expect(
      t.mutation(api.prototypeSessions.claimAdmin, { token: customerToken, accessCode: adminAccessCode }),
    ).resolves.toMatchObject({ ok: true, role: "admin" });
  });

  it("rejects an expired prototype session", async () => {
    const t = testConvex();
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await t.run(async (ctx) => {
      const session = await ctx.db.query("prototypeSessions").first();
      if (!session) throw new Error("test session missing");
      await ctx.db.patch(session._id, { expiresAt: 0 });
    });
    await expect(
      t.query(api.catalogAccess.listAccessible, {
        sessionToken: customerToken,
        paginationOpts: { numItems: 10, cursor: null },
      }),
    ).rejects.toThrow("SESSION_EXPIRED");
  });

  it("persists the catalog vertical slice without storing raw secrets", async () => {
    const t = testConvex();
    const admin = await createAdmin(t);
    const bundle = await createOpenCatalog(t, admin);

    const storedCode = await t.run(async (ctx) => ctx.db.query("catalogAccessCodes").first());
    const storedSession = await t.run(async (ctx) => ctx.db.query("prototypeSessions").first());
    expect(storedCode).not.toHaveProperty("accessCode");
    expect(storedCode?.codeDigest).not.toContain("catalog-secret");
    expect(storedSession).not.toHaveProperty("token");
    expect(storedSession?.tokenDigest).not.toContain(adminToken);

    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await expect(
      t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "wrong" }),
    ).rejects.toThrow("ACCESS_CODE_INVALID");
    const grant = await t.mutation(api.catalogAccess.unlock, {
      sessionToken: customerToken,
      accessCode: "catalog-secret",
    });
    expect(grant.catalogId).toBe(bundle.catalogId);
    expect(grant.catalog).toMatchObject({ name: "Test Catalog", status: "open" });

    const catalog = await t.query(api.catalogAccess.getUnlocked, {
      sessionToken: customerToken,
      catalogId: bundle.catalogId,
    });
    expect(catalog).toMatchObject({ name: "Test Catalog", status: "open" });
    expect(catalog?.books[0].variants).toHaveLength(3);
  });

  it("submits atomic price snapshots and isolates customer ownership", async () => {
    const t = testConvex();
    const admin = await createAdmin(t);
    const bundle = await createOpenCatalog(t, admin);
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "catalog-secret" });

    const order = await t.mutation(api.orders.submit, {
      sessionToken: customerToken,
      catalogId: bundle.catalogId,
      customerName: "Test Blessfriend",
      customerEmail: "test@example.com",
      items: [{ variantId: bundle.variantIds[1], quantity: 2 }],
    });
    expect(order).toMatchObject({ totalAmount: 250000, status: "submitted" });
    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 125000, quantity: 2, formatSnapshot: "PB" });

    const mine = await t.query(api.orders.listMine, {
      sessionToken: customerToken,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(mine.page).toHaveLength(1);

    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    await expect(
      t.query(api.orders.getMine, { sessionToken: secondCustomerToken, orderId: order.orderId }),
    ).rejects.toThrow("ORDER_ACCESS_DENIED");

    const adminOrders = await t.query(api.orders.listForAdmin, {
      sessionToken: admin,
      paginationOpts: { numItems: 10, cursor: null },
    });
    expect(adminOrders.page).toHaveLength(1);
    expect(adminOrders.page[0].totalAmount).toBe(250000);
  });

  it("edits only before catalog close and rejects edits afterward", async () => {
    const t = testConvex();
    const admin = await createAdmin(t);
    const bundle = await createOpenCatalog(t, admin);
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "catalog-secret" });
    const order = await t.mutation(api.orders.submit, {
      sessionToken: customerToken,
      catalogId: bundle.catalogId,
      customerName: "Before Close",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });

    const edited = await t.mutation(api.orders.edit, {
      sessionToken: customerToken,
      orderId: order.orderId,
      customerName: "Edited Before Close",
      items: [{ variantId: bundle.variantIds[2], quantity: 1 }],
    });
    expect(edited).toMatchObject({ totalAmount: 150000, customerName: "Edited Before Close" });

    await t.mutation(api.secretCatalogs.close, { sessionToken: admin, catalogId: bundle.catalogId });
    await expect(
      t.mutation(api.orders.edit, {
        sessionToken: customerToken,
        orderId: order.orderId,
        customerName: "Too Late",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ORDER_LOCKED");
  });

  it("enforces role, catalog, book, variant, and access invariants", async () => {
    const t = testConvex();
    const admin = await createAdmin(t);
    const publisherId = await t.mutation(api.publishers.create, { sessionToken: admin, name: "Invariant Publisher" });
    await expect(
      t.mutation(api.publishers.create, { sessionToken: admin, name: "Invariant Publisher" }),
    ).rejects.toThrow("DUPLICATE_SLUG");

    await t.mutation(api.prototypeSessions.createCustomer, { token: secondCustomerToken });
    await expect(
      t.mutation(api.publishers.create, { sessionToken: secondCustomerToken, name: "Customer Publisher" }),
    ).rejects.toThrow("ADMIN_REQUIRED");

    const bookId = await t.mutation(api.books.create, {
      sessionToken: admin,
      publisherId,
      title: "Invariant Book",
    });
    await expect(
      t.mutation(api.books.create, { sessionToken: admin, publisherId, title: "Invariant Book" }),
    ).rejects.toThrow("DUPLICATE_SLUG");
    const variantId = await t.mutation(api.bookVariants.create, {
      sessionToken: admin,
      bookId,
      format: "BB",
      isbn: "9780000011111",
      priceAmount: 100000,
    });
    await expect(
      t.mutation(api.bookVariants.create, {
        sessionToken: admin,
        bookId,
        format: "PB",
        isbn: "9780000011111",
        priceAmount: 100000,
      }),
    ).rejects.toThrow("DUPLICATE_ISBN");
    await expect(
      t.mutation(api.bookVariants.create, {
        sessionToken: admin,
        bookId,
        format: "PB",
        isbn: "9780000011112",
        priceAmount: -1,
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      t.mutation(api.bookVariants.create, {
        sessionToken: admin,
        bookId,
        format: "BB",
        isbn: "9780000011113",
        priceAmount: 100000,
      }),
    ).rejects.toThrow("DUPLICATE_VARIANT");
    await expect(
      t.mutation(api.bookVariants.create, {
        sessionToken: admin,
        bookId,
        format: "XX" as never,
        isbn: "9780000011114",
        priceAmount: 100000,
      }),
    ).rejects.toThrow();
    expect(variantId).toBeDefined();

    const bundle = await createOpenCatalog(t, admin);
    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "catalog-secret" });
    await expect(
      t.mutation(api.orders.submit, {
        sessionToken: customerToken,
        catalogId: bundle.catalogId,
        customerName: "Empty Order",
        items: [],
      }),
    ).rejects.toThrow("ORDER_EMPTY");

    await t.run(async (ctx) => {
      const grant = await ctx.db.query("catalogAccessGrants").first();
      if (!grant) throw new Error("grant missing");
      await ctx.db.patch(grant._id, { expiresAt: 0 });
    });
    await expect(
      t.mutation(api.orders.submit, {
        sessionToken: customerToken,
        catalogId: bundle.catalogId,
        customerName: "Expired Grant",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ACCESS_GRANT_REQUIRED");

    await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "catalog-secret" });
    await t.mutation(api.secretCatalogs.close, { sessionToken: admin, catalogId: bundle.catalogId });
    await expect(
      t.mutation(api.orders.submit, {
        sessionToken: customerToken,
        catalogId: bundle.catalogId,
        customerName: "Closed Catalog",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("CATALOG_NOT_OPEN");
  });

  it("cleans only the explicitly identified Browser QA catalog", async () => {
    const t = testConvex();
    const admin = await createAdmin(t);
    const bundle = await t.mutation(api.secretCatalogs.createBundle, {
      sessionToken: admin,
      name: "Browser QA cleanup-test",
      publisherName: "Cleanup Publisher",
      bookTitle: "Cleanup Book",
      accessCode: "cleanup-code",
      variants: [{ format: "BB", isbn: "9780000099999", priceAmount: 100000 }],
    });
    await t.mutation(api.secretCatalogs.open, { sessionToken: admin, catalogId: bundle.catalogId });

    await t.mutation(api.prototypeSessions.createCustomer, { token: customerToken });
    await t.mutation(api.catalogAccess.unlock, { sessionToken: customerToken, accessCode: "cleanup-code" });
    await t.mutation(api.orders.submit, {
      sessionToken: customerToken,
      catalogId: bundle.catalogId,
      customerName: "Cleanup Customer",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });

    await expect(
      t.mutation(api.prototypeSessions.cleanupTest, {
        sessionToken: admin,
        customerSessionToken: customerToken,
        testId: "cleanup-test",
      }),
    ).resolves.toMatchObject({ ok: true });

    const counts = await t.run(async (ctx) =>
      Promise.all([
        ctx.db.query("publishers").collect(),
        ctx.db.query("books").collect(),
        ctx.db.query("bookVariants").collect(),
        ctx.db.query("secretCatalogs").collect(),
        ctx.db.query("catalogAccessCodes").collect(),
        ctx.db.query("catalogItems").collect(),
        ctx.db.query("catalogAccessGrants").collect(),
        ctx.db.query("orders").collect(),
        ctx.db.query("orderItems").collect(),
        ctx.db.query("orderStatusHistory").collect(),
      ]),
    );
    expect(counts.every((records) => records.length === 0)).toBe(true);
  });
});
