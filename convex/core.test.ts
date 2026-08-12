/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("BFG Convex core persistence", () => {
  beforeEach(configureTestEnvironment);

  it("starts with no business records for an authenticated customer", async () => {
    const t = testConvex();
    const { customer } = await setupUsers(t);
    const catalogs = await customer.query(api.catalogAccess.listAccessible, {
      paginationOpts: { numItems: 10, cursor: null },
    });
    const orders = await customer.query(api.orders.listMine, { paginationOpts: { numItems: 10, cursor: null } });
    expect(catalogs.page).toEqual([]);
    expect(orders.page).toEqual([]);
  });

  it("disables the legacy prototype identity", async () => {
    const t = testConvex();
    await expect(t.mutation(api.prototypeSessions.createCustomer, { token: "legacy-test-token" })).rejects.toThrow(
      "LEGACY_IDENTITY_DISABLED",
    );
  });

  it("persists a catalog slice without raw access secrets", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin);
    const storedCode = await t.run(async (ctx) => ctx.db.query("catalogAccessCodes").first());
    expect(storedCode).not.toHaveProperty("accessCode");
    expect(storedCode?.codeDigest).not.toContain("catalog-secret");

    await expect(customer.mutation(api.catalogAccess.unlock, { accessCode: "wrong" })).resolves.toMatchObject({
      errorCode: "ACCESS_CODE_INVALID",
    });
    const grant = await customer.mutation(api.catalogAccess.unlock, { accessCode: "catalog-secret" });
    if ("errorCode" in grant) throw new Error(grant.errorCode);
    expect(grant.catalogId).toBe(bundle.catalogId);
    expect(grant.catalog).toMatchObject({ name: "Test Catalog", status: "open" });
    const catalog = await customer.query(api.catalogAccess.getUnlocked, { catalogId: bundle.catalogId });
    expect(catalog).toMatchObject({ name: "Test Catalog", status: "open" });
    expect(catalog?.books[0].variants).toHaveLength(1);
  });

  it("allows anonymous token redemption only through a scoped expiring session", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Anonymous Catalog", "0003", "anonymous-code");

    const unlocked = await t.mutation(api.catalogAccess.unlock, {
      accessCode: "anonymous-code",
      attemptKey: "browser-session-a",
    });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    expect(unlocked.sessionToken).toMatch(/^[a-f0-9]{64}$/);
    const storedSession = await t.run(async (ctx) => ctx.db.query("catalogAccessSessions").first());
    expect(storedSession).not.toHaveProperty("sessionToken");
    expect(storedSession?.sessionDigest).not.toBe(unlocked.sessionToken);

    await expect(
      t.query(api.catalogAccess.getUnlocked, {
        catalogId: bundle.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toMatchObject({ id: bundle.catalogId });

    const otherCatalog = await createOpenCatalog(admin, "Other Catalog", "0004", "other-code");
    await expect(
      t.query(api.catalogAccess.getUnlocked, {
        catalogId: otherCatalog.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toBeNull();

    await t.run(async (ctx) => {
      if (!storedSession) throw new Error("session missing");
      await ctx.db.patch(storedSession._id, { expiresAt: 0 });
    });
    await expect(
      t.query(api.catalogAccess.getUnlocked, {
        catalogId: bundle.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toBeNull();

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await t.mutation(api.catalogAccess.unlock, {
        accessCode: `wrong-anonymous-${attempt}`,
        attemptKey: "browser-session-b",
      });
    }
    await expect(
      t.mutation(api.catalogAccess.unlock, {
        accessCode: "wrong-anonymous-after-lock",
        attemptKey: "browser-session-b",
      }),
    ).resolves.toMatchObject({ errorCode: "ACCESS_CODE_RATE_LIMITED" });

    const replacement = await t.mutation(api.catalogAccess.unlock, {
      accessCode: "anonymous-code",
      attemptKey: "browser-session-c",
    });
    if ("errorCode" in replacement) throw new Error(replacement.errorCode);
    await admin.mutation(api.catalogAccess.revokeCode, { catalogId: bundle.catalogId });
    await expect(
      t.query(api.catalogAccess.getUnlocked, {
        catalogId: bundle.catalogId,
        sessionToken: replacement.sessionToken,
      }),
    ).resolves.toBeNull();
    await expect(
      t.mutation(api.catalogAccess.unlock, {
        accessCode: "anonymous-code",
        attemptKey: "browser-session-d",
      }),
    ).resolves.toMatchObject({ errorCode: "ACCESS_CODE_INVALID" });
    await t.run(async (ctx) => {
      const code = await ctx.db
        .query("catalogAccessCodes")
        .withIndex("by_lookup_digest")
        .collect()
        .then((records) => records.find((record) => record.catalogId === otherCatalog.catalogId));
      if (!code) throw new Error("other catalog code missing");
      await ctx.db.patch(code._id, { expiresAt: -1 });
    });
    await expect(
      t.mutation(api.catalogAccess.unlock, {
        accessCode: "other-code",
        attemptKey: "browser-session-e",
      }),
    ).resolves.toMatchObject({ errorCode: "ACCESS_CODE_EXPIRED" });
  });

  it("generates one-time codes, rate-limits failures, and keeps existing grants readable after revocation", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin, "Generated Catalog", "0002", "legacy-code");
    await expect(customer.mutation(api.catalogAccess.generateCode, { catalogId: bundle.catalogId })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    const generated = await admin.mutation(api.catalogAccess.generateCode, { catalogId: bundle.catalogId });
    expect(generated.code).toMatch(/^BFG-[A-Z2-9]{4}-[A-Z2-9]{4}-[A-Z2-9]{4}$/);
    const stored = await t.run(async (ctx) => ctx.db.query("catalogAccessCodes").collect());
    expect(stored.every((record) => !("accessCode" in record))).toBe(true);

    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: generated.code });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    await admin.mutation(api.catalogAccess.revokeCode, { catalogId: bundle.catalogId });
    const revoked = await secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: generated.code });
    expect(revoked).toMatchObject({ errorCode: "ACCESS_CODE_INVALID" });
    expect(await customer.query(api.catalogAccess.getUnlocked, { catalogId: bundle.catalogId })).toMatchObject({
      id: bundle.catalogId,
    });

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await customer.mutation(api.catalogAccess.unlock, { accessCode: `wrong-${attempt}` });
    }
    expect(await customer.mutation(api.catalogAccess.unlock, { accessCode: "wrong-after-lock" })).toMatchObject({
      errorCode: "ACCESS_CODE_RATE_LIMITED",
    });
  });

  it("submits price snapshots and isolates customer ownership", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "catalog-secret" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Test Blessfriend",
      customerEmail: "test@example.com",
      items: [{ variantId: bundle.variantIds[0], quantity: 2 }],
    });
    expect(order).toMatchObject({ totalAmount: 250000, status: "submitted" });
    expect(order.items[0]).toMatchObject({ unitPriceAmountSnapshot: 125000, quantity: 2, formatSnapshot: "PB" });
    expect(
      (await customer.query(api.orders.listMine, { paginationOpts: { numItems: 10, cursor: null } })).page,
    ).toHaveLength(1);
    await expect(secondCustomer.query(api.orders.getMine, { orderId: order.orderId })).rejects.toThrow(
      "ORDER_ACCESS_DENIED",
    );
    expect(
      (await admin.query(api.orders.listForAdmin, { paginationOpts: { numItems: 10, cursor: null } })).page,
    ).toHaveLength(1);
  });

  it("edits only before catalog close", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const bundle = await createOpenCatalog(admin);
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "catalog-secret" });
    const order = await customer.mutation(api.orders.submit, {
      catalogId: bundle.catalogId,
      customerName: "Before Close",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    const edited = await customer.mutation(api.orders.edit, {
      orderId: order.orderId,
      customerName: "Edited Before Close",
      items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
    });
    expect(edited).toMatchObject({ customerName: "Edited Before Close" });
    await admin.mutation(api.secretCatalogs.close, { catalogId: bundle.catalogId });
    await expect(
      customer.mutation(api.orders.edit, {
        orderId: order.orderId,
        customerName: "Too Late",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ORDER_LOCKED");
  });

  it("enforces role and catalog invariants", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    await expect(customer.mutation(api.publishers.create, { name: "Customer Publisher" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    const publisherId = await admin.mutation(api.publishers.create, { name: "Invariant Publisher" });
    await expect(admin.mutation(api.publishers.create, { name: "Invariant Publisher" })).rejects.toThrow(
      "DUPLICATE_SLUG",
    );
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Invariant Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "BB",
      isbn: "9780000011111",
      priceAmount: 100000,
    });
    await expect(
      admin.mutation(api.bookVariants.create, {
        bookId,
        format: "PB",
        isbn: "9780000011111",
        priceAmount: 100000,
      }),
    ).rejects.toThrow("DUPLICATE_ISBN");
    expect(variantId).toBeDefined();

    const bundle = await createOpenCatalog(admin, "Invariant Catalog", "1111", "invariant-code");
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: bundle.catalogId,
        customerName: "No Grant",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ACCESS_GRANT_REQUIRED");
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "invariant-code" });
    await expect(
      customer.mutation(api.orders.submit, { catalogId: bundle.catalogId, customerName: "Empty", items: [] }),
    ).rejects.toThrow("ORDER_EMPTY");
    await t.run(async (ctx) => {
      const grant = await ctx.db.query("catalogAccessGrants").first();
      if (!grant) throw new Error("grant missing");
      await ctx.db.patch(grant._id, { expiresAt: 0 });
    });
    await expect(
      customer.mutation(api.orders.submit, {
        catalogId: bundle.catalogId,
        customerName: "Expired Grant",
        items: [{ variantId: bundle.variantIds[0], quantity: 1 }],
      }),
    ).rejects.toThrow("ACCESS_GRANT_REQUIRED");
  });

  it("keeps the old cleanup entry point disabled", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    await expect(
      admin.mutation(api.prototypeSessions.cleanupTest, {
        sessionToken: "legacy",
        testId: "cleanup-test",
      }),
    ).rejects.toThrow("LEGACY_IDENTITY_DISABLED");
  });
});
