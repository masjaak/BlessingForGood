/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Secret Catalog discovery and global access", () => {
  beforeEach(configureTestEnvironment);

  it("keeps the customer projection scoped and exposes Catalog ETA metadata", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const first = await createOpenCatalog(admin, "Discovery A", "1001", "discovery-a");
    const second = await createOpenCatalog(admin, "Discovery B", "1002", "discovery-b");
    await admin.mutation(api.secretCatalogs.update, {
      catalogId: first.catalogId,
      name: "Discovery A",
      estimatedArrivalMonth: "2026-11",
    });
    await customer.mutation(api.catalogAccess.unlock, { accessCode: "discovery-a" });

    const view = await customer.query(api.catalogAccess.getUnlocked, { catalogId: first.catalogId });
    expect(view).toMatchObject({ estimatedArrivalMonth: "2026-11", titleCount: 1 });
    expect(view?.books.map((book) => book.title)).toEqual(["Discovery A Book"]);
    expect(view?.books.map((book) => book.title)).not.toContain("Discovery B Book");
    expect(second.catalogId).not.toBe(first.catalogId);
  });

  it("shares one generated code across eligible Catalogs without exposing ineligible Catalogs", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const first = await createOpenCatalog(admin, "Global A", "1101", "global-a-legacy");
    const second = await createOpenCatalog(admin, "Global B", "1102", "global-b-legacy");
    const closed = await createOpenCatalog(admin, "Closed Catalog", "1103", "closed-legacy");
    await admin.mutation(api.secretCatalogs.close, { catalogId: closed.catalogId });
    const legacySession = await customer.mutation(api.catalogAccess.unlock, { accessCode: "global-a-legacy" });
    if ("errorCode" in legacySession) throw new Error(legacySession.errorCode);
    const draft = await admin.mutation(api.secretCatalogs.create, { name: "Draft Catalog" });
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const historicalPeriodId = await t.run(async (ctx) => {
      const now = Date.now();
      const periodId = await ctx.db.insert("catalogAccessPeriods", {
        anchorCatalogId: first.catalogId,
        label: "Deprecated period",
        codeDigest: "deprecated-code-digest",
        lookupDigest: "deprecated-lookup-digest",
        isActive: true,
        startsAt: now,
        createdAt: now,
        updatedAt: now,
        createdByUserId: adminUser.appUserId,
      });
      await ctx.db.patch(first.catalogId, { accessPeriodId: periodId });
      return periodId;
    });
    const generated = await admin.mutation(api.catalogAccess.generateCode, { catalogId: first.catalogId });

    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: generated.code });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    expect(unlocked.catalogs.map((catalog) => catalog.id)).toEqual(
      expect.arrayContaining([first.catalogId, second.catalogId]),
    );
    expect(historicalPeriodId).toBeTruthy();
    expect(unlocked.catalogs.map((catalog) => catalog.id)).not.toContain(closed.catalogId);
    expect(unlocked.catalogs.map((catalog) => catalog.id)).not.toContain(draft);
    expect(
      await customer.query(api.catalogAccess.listForSession, { sessionToken: unlocked.sessionToken }),
    ).toHaveLength(unlocked.catalogs.length);
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: second.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toMatchObject({ id: second.catalogId });
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: closed.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toBeNull();
    await expect(
      secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "wrong-global-code" }),
    ).resolves.toMatchObject({ errorCode: "ACCESS_CODE_INVALID" });

    const storedGlobalCode = await t.run(async (ctx) =>
      ctx.db
        .query("catalogAccessCodes")
        .withIndex("by_scope_and_active", (query) => query.eq("scope", "global").eq("isActive", true))
        .first(),
    );
    expect(storedGlobalCode).toMatchObject({ scope: "global", isActive: true });
    expect(storedGlobalCode).not.toHaveProperty("accessCode");

    const replacement = await admin.mutation(api.catalogAccess.generateCode, { catalogId: second.catalogId });
    await expect(customer.mutation(api.catalogAccess.unlock, { accessCode: generated.code })).resolves.toMatchObject({
      errorCode: "ACCESS_CODE_INVALID",
    });
    const replacementUnlock = await customer.mutation(api.catalogAccess.unlock, { accessCode: replacement.code });
    if ("errorCode" in replacementUnlock) throw new Error(replacementUnlock.errorCode);
    expect(replacementUnlock.catalogs.map((catalog) => catalog.id)).toEqual(
      expect.arrayContaining([first.catalogId, second.catalogId]),
    );

    await admin.mutation(api.catalogAccess.revokeCode, { catalogId: second.catalogId });
    await expect(
      secondCustomer.query(api.catalogAccess.getUnlocked, {
        catalogId: second.catalogId,
        sessionToken: replacementUnlock.sessionToken,
      }),
    ).resolves.toBeNull();
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: first.catalogId,
        sessionToken: legacySession.sessionToken,
      }),
    ).resolves.toMatchObject({ id: first.catalogId });
  });
});
