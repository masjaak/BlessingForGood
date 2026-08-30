/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

describe("Secret Catalog discovery and access periods", () => {
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

  it("shares one active period code across associated Catalogs without widening session scope", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const first = await createOpenCatalog(admin, "Period A", "1101", "period-a-legacy");
    const second = await createOpenCatalog(admin, "Period B", "1102", "period-b-legacy");
    const outside = await createOpenCatalog(admin, "Outside Period", "1103", "outside-period");
    const period = await admin.mutation(api.catalogAccess.createPeriod, {
      catalogId: first.catalogId,
      label: "September 2026",
      accessCode: "BFGSEP26",
      endsAt: Date.now() + 86_400_000,
    });
    await admin.mutation(api.catalogAccess.attachPeriod, { catalogId: second.catalogId, periodId: period.periodId });

    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "BFGSEP26" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    expect(unlocked.catalogId).toBe(first.catalogId);
    expect(unlocked.catalogs.map((catalog) => catalog.id)).toEqual([first.catalogId, second.catalogId]);
    expect(
      await customer.query(api.catalogAccess.listForSession, { sessionToken: unlocked.sessionToken }),
    ).toHaveLength(2);
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: second.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toMatchObject({ id: second.catalogId });
    await expect(
      customer.query(api.catalogAccess.getUnlocked, {
        catalogId: outside.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toBeNull();
    await expect(secondCustomer.mutation(api.catalogAccess.unlock, { accessCode: "wrong-period-code" })).resolves.toMatchObject(
      { errorCode: "ACCESS_CODE_INVALID" },
    );

    await t.run(async (ctx) => {
      const customerUser = await ctx.db
        .query("appUsers")
        .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", "phase041-customer-test"))
        .unique();
      if (!customerUser) throw new Error("customer missing");
      await ctx.db.patch(customerUser._id, { status: "suspended" });
    });
    await expect(customer.mutation(api.catalogAccess.unlock, { accessCode: "BFGSEP26" })).resolves.toMatchObject({
      errorCode: "ACCESS_CODE_INVALID",
    });

    await admin.mutation(api.catalogAccess.revokePeriod, { periodId: period.periodId });
    await expect(
      secondCustomer.query(api.catalogAccess.getUnlocked, {
        catalogId: second.catalogId,
        sessionToken: unlocked.sessionToken,
      }),
    ).resolves.toBeNull();
    const storedPeriod = await t.run((ctx) => ctx.db.get(period.periodId));
    expect(storedPeriod).not.toHaveProperty("accessCode");
  });
});
