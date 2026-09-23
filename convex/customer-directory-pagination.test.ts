import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, testConvex } from "../tests/convex-helpers";

describe("Admin Customer directory pagination", () => {
  beforeEach(configureTestEnvironment);

  it("returns all 61 customers across exact 25, 50, and 100 row pages", async () => {
    const t = testConvex();
    const admin = t.withIdentity({ subject: "directory-admin", tokenIdentifier: "clerk|directory-admin" });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("appUsers", {
        clerkUserId: "directory-admin",
        role: "admin",
        status: "active",
        emailSnapshot: "admin@example.com",
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
      for (let index = 1; index <= 61; index += 1) {
        const number = String(index).padStart(3, "0");
        const userId = await ctx.db.insert("appUsers", {
          clerkUserId: `directory-customer-${number}`,
          role: "customer",
          status: "active",
          emailSnapshot: `customer-${number}@example.com`,
          memberCode: `member-${number}`,
          createdAt: now + index,
          updatedAt: now + index,
          lastSeenAt: now + index,
        });
        await ctx.db.insert("customerProfiles", {
          userId,
          displayName: `Maria User ${number}`,
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
    });

    const first25 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
    });
    const second25 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 25, cursor: first25.continueCursor },
    });
    const last25 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 25, cursor: second25.continueCursor },
    });
    expect(first25).toMatchObject({ totalCount: 61, totalCountKnown: true, isDone: false });
    expect(first25.page).toHaveLength(25);
    expect(second25.page).toHaveLength(25);
    expect(last25.page).toHaveLength(11);
    expect(last25.isDone).toBe(true);
    const allIds = [...first25.page, ...second25.page, ...last25.page].map((row) => row.customerUserId);
    expect(new Set(allIds).size).toBe(61);

    const first50 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 50, cursor: null },
    });
    const last50 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 50, cursor: first50.continueCursor },
    });
    expect(first50.page).toHaveLength(50);
    expect(last50.page).toHaveLength(11);
    const all61 = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 100, cursor: null },
    });
    expect(all61).toMatchObject({
      totalCount: 61,
      page: expect.arrayContaining([expect.objectContaining({ displayName: "Maria User 061" })]),
    });
    expect(all61.page).toHaveLength(61);
  });

  it("filters search results before pagination and preserves the customers.read boundary", async () => {
    const t = testConvex();
    const admin = t.withIdentity({
      subject: "directory-search-admin",
      tokenIdentifier: "clerk|directory-search-admin",
    });
    const customer = t.withIdentity({
      subject: "directory-search-customer",
      tokenIdentifier: "clerk|directory-search-customer",
    });
    const owner = t.withIdentity({
      subject: "directory-search-owner",
      tokenIdentifier: "clerk|directory-search-owner",
    });
    const suspended = t.withIdentity({
      subject: "directory-search-suspended",
      tokenIdentifier: "clerk|directory-search-suspended",
    });
    await t.run(async (ctx) => {
      const now = Date.now();
      for (const [clerkUserId, role, status] of [
        ["directory-search-admin", "admin", "active"],
        ["directory-search-owner", "owner", "active"],
        ["directory-search-customer", "customer", "active"],
        ["directory-search-suspended", "admin", "suspended"],
      ] as const) {
        await ctx.db.insert("appUsers", {
          clerkUserId,
          role,
          status,
          createdAt: now,
          updatedAt: now,
          lastSeenAt: now,
        });
      }
      for (let index = 1; index <= 61; index += 1) {
        const number = String(index).padStart(3, "0");
        const userId = await ctx.db.insert("appUsers", {
          clerkUserId: `directory-search-${number}`,
          role: "customer",
          status: "active",
          emailSnapshot: `customer-${number}@example.com`,
          memberCode: `member-${number}`,
          createdAt: now + index,
          updatedAt: now + index,
          lastSeenAt: now + index,
        });
        await ctx.db.insert("customerProfiles", {
          userId,
          displayName: index <= 3 ? `Maria Match ${number}` : `Other Customer ${number}`,
          createdAt: now + index,
          updatedAt: now + index,
        });
      }
    });

    const matches = await admin.query(api.users.listCustomersForAdmin, {
      search: "maria",
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(matches).toMatchObject({ totalCount: 3, totalCountKnown: true, isDone: true });
    expect(matches.page.map((row) => row.displayName)).toEqual([
      "Maria Match 003",
      "Maria Match 002",
      "Maria Match 001",
    ]);
    await expect(
      owner.query(api.users.listCustomersForAdmin, { paginationOpts: { numItems: 25, cursor: null } }),
    ).resolves.toMatchObject({ totalCount: 62 });
    await expect(
      customer.query(api.users.listCustomersForAdmin, {
        paginationOpts: { numItems: 25, cursor: null },
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      suspended.query(api.users.listCustomersForAdmin, {
        paginationOpts: { numItems: 25, cursor: null },
      }),
    ).rejects.toThrow("USER_SUSPENDED");
  });

  it("keeps growing directories bounded and labels totals above the count window", async () => {
    const t = testConvex();
    const admin = t.withIdentity({ subject: "directory-large-admin", tokenIdentifier: "clerk|directory-large-admin" });
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("appUsers", {
        clerkUserId: "directory-large-admin",
        role: "admin",
        status: "active",
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
      for (let index = 1; index <= 2001; index += 1) {
        await ctx.db.insert("appUsers", {
          clerkUserId: `directory-large-customer-${index}`,
          role: "customer",
          status: "active",
          createdAt: now + index,
          updatedAt: now + index,
          lastSeenAt: now + index,
        });
      }
    });

    const page = await admin.query(api.users.listCustomersForAdmin, {
      paginationOpts: { numItems: 25, cursor: null },
    });
    expect(page).toMatchObject({ totalCount: 2000, totalCountKnown: false, truncated: true, isDone: false });
    expect(page.page).toHaveLength(25);
  });
});
