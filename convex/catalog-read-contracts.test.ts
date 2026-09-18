/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import { configureTestEnvironment, createOpenCatalog, setupUsers, testConvex } from "../tests/convex-helpers";

async function addDuplicateItems(
  t: ReturnType<typeof testConvex>,
  catalogId: Id<"secretCatalogs">,
  bookVariantId: Id<"bookVariants">,
  count: number,
) {
  await t.run(async (ctx) => {
    const now = Date.now();
    for (let index = 0; index < count; index += 1) {
      await ctx.db.insert("catalogItems", {
        catalogId,
        bookVariantId,
        isAvailable: true,
        sortOrder: index + 1,
        createdAt: now + index,
        updatedAt: now + index,
      });
    }
  });
}

describe("Catalog read contract characterization", () => {
  beforeEach(configureTestEnvironment);

  it("keeps the current lightweight Admin projection bounded for empty, 501-item, 1,000-item, and 50-root fixtures", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const emptyCatalogId = await admin.mutation(api.secretCatalogs.create, { name: "Empty scale catalog" });
    const small = await createOpenCatalog(admin, "501 item scale catalog", "5010", "scale-501");
    const large = await createOpenCatalog(admin, "1000 item scale catalog", "1000", "scale-1000");
    const detail = await createOpenCatalog(admin, "Media detail catalog", "1001", "scale-detail");
    await admin.mutation(api.secretCatalogs.update, {
      catalogId: detail.catalogId,
      name: "Media detail catalog",
      estimatedArrivalMonth: "2026-11",
    });
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["cover"]));
      await ctx.db.patch(detail.bookId, { coverStorageId: storageId });
      for (let index = 0; index < 8; index += 1) {
        await ctx.db.insert("bookMedia", {
          bookId: detail.bookId,
          storageId,
          displayOrder: index,
          altText: `Gallery ${index}`,
          createdAt: Date.now() + index,
          updatedAt: Date.now() + index,
          createdByUserId: adminUser.appUserId,
        });
      }
    });
    await addDuplicateItems(t, small.catalogId, small.variantIds[0], 500);
    await addDuplicateItems(t, large.catalogId, large.variantIds[0], 999);
    const closedCatalog = await createOpenCatalog(admin, "Closed scale catalog", "1002", "scale-closed");
    await admin.mutation(api.secretCatalogs.close, { catalogId: closedCatalog.catalogId });

    for (let index = 0; index < 50; index += 1) {
      await admin.mutation(api.secretCatalogs.create, { name: `Summary root ${index}` });
    }

    const page = await admin.query(api.secretCatalogs.list, {
      paginationOpts: { numItems: 100, cursor: null },
      includeBooks: false,
    });
    const byId = new Map(page.page.map((catalog) => [String(catalog.id), catalog]));

    expect(byId.get(String(emptyCatalogId))).toMatchObject({ books: [] });
    expect(byId.get(String(small.catalogId))).toMatchObject({ books: [] });
    expect(byId.get(String(large.catalogId))).toMatchObject({ books: [] });
    expect(page.page.length).toBeGreaterThanOrEqual(55);

    const summaries = await admin.query(api.secretCatalogs.listSummaries, {
      paginationOpts: { numItems: 100, cursor: null },
    });
    const summaryById = new Map(summaries.page.map((catalog) => [String(catalog.id), catalog]));
    const expectedKeys = ["id", "name", "status", "closingAt", "estimatedArrivalMonth", "createdAt"];
    for (const catalogId of [
      emptyCatalogId,
      small.catalogId,
      large.catalogId,
      detail.catalogId,
      closedCatalog.catalogId,
    ]) {
      const summary = summaryById.get(String(catalogId));
      expect(summary).toBeDefined();
      expect(Object.keys(summary || {}).sort()).toEqual(expectedKeys.sort());
      expect(summary).not.toHaveProperty("books");
    }
    expect(summaryById.get(String(closedCatalog.catalogId))).toMatchObject({ status: "closed" });
    expect(summaryById.get(String(detail.catalogId))).toMatchObject({ estimatedArrivalMonth: "2026-11" });

    const detailView = await admin.query(api.secretCatalogs.getForAdmin, { catalogId: detail.catalogId });
    expect(detailView?.view.books[0]).toMatchObject({
      id: detail.bookId,
      variants: [{ id: detail.variantIds[0] }],
    });
  });

  it("returns root-only session selector summaries for 50 eligible catalogs and excludes a closed catalog", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const source = await createOpenCatalog(admin, "Session source catalog", "5050", "session-50");
    const heavySiblings: Array<Awaited<ReturnType<typeof createOpenCatalog>>> = [];
    for (let index = 0; index < 3; index += 1) {
      const sibling = await createOpenCatalog(
        admin,
        `Heavy sibling ${index}`,
        `505${index + 1}`,
        `session-heavy-${index}`,
      );
      await addDuplicateItems(t, sibling.catalogId, sibling.variantIds[0], 499);
      heavySiblings.push(sibling);
    }
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    await t.run(async (ctx) => {
      const storageId = await ctx.storage.store(new Blob(["sibling-cover"]));
      await ctx.db.patch(heavySiblings[0].bookId, { coverStorageId: storageId });
      for (let index = 0; index < 8; index += 1) {
        await ctx.db.insert("bookMedia", {
          bookId: heavySiblings[0].bookId,
          storageId,
          displayOrder: index,
          altText: `Sibling gallery ${index}`,
          createdAt: Date.now() + index,
          updatedAt: Date.now() + index,
          createdByUserId: adminUser.appUserId,
        });
      }
    });
    for (let index = 4; index < 50; index += 1) {
      const catalogId = await admin.mutation(api.secretCatalogs.create, { name: `Session catalog ${index}` });
      await admin.mutation(api.secretCatalogs.open, { catalogId });
    }

    const generated = await admin.mutation(api.catalogAccess.generateCode, { catalogId: source.catalogId });
    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: generated.code });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);

    expect(unlocked.catalog.id).toBe(source.catalogId);
    expect(unlocked.catalog.books[0]).toMatchObject({ id: source.bookId });
    expect(unlocked.catalogs).toHaveLength(50);
    const selectedSummary = unlocked.catalogs.find((catalog) => catalog.id === source.catalogId);
    expect(selectedSummary).toBeDefined();
    expect(Object.keys(selectedSummary || {}).sort()).toEqual(
      ["id", "name", "status", "closingAt", "estimatedArrivalMonth", "createdAt"].sort(),
    );
    expect(selectedSummary).not.toHaveProperty("books");

    const options = await customer.query(api.catalogAccess.listForSession, { sessionToken: unlocked.sessionToken });
    expect(options).toHaveLength(50);
    expect(Object.keys(options[0] || {}).sort()).toEqual(
      ["id", "name", "status", "closingAt", "estimatedArrivalMonth", "createdAt"].sort(),
    );
    expect(options[0]).not.toHaveProperty("books");

    await admin.mutation(api.secretCatalogs.close, { catalogId: source.catalogId });
    const afterClose = await customer.query(api.catalogAccess.listForSession, {
      sessionToken: unlocked.sessionToken,
    });
    expect(afterClose).toHaveLength(49);
    expect(afterClose.map((catalog) => catalog.id)).not.toContain(source.catalogId);
  });
});
