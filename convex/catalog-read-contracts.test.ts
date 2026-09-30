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
    const variant = await ctx.db.get(bookVariantId);
    if (!variant) throw new Error("scale variant missing");
    for (let index = 0; index < count; index += 1) {
      await ctx.db.insert("catalogItems", {
        catalogId,
        bookVariantId,
        bookId: variant.bookId,
        isAvailable: true,
        sortOrder: index + 1,
        createdAt: now + index,
        updatedAt: now + index,
      });
    }
    const membership = await ctx.db
      .query("catalogTitles")
      .withIndex("by_catalog_and_book", (query) => query.eq("catalogId", catalogId).eq("bookId", variant.bookId))
      .unique();
    if (!membership) {
      await ctx.db.insert("catalogTitles", {
        catalogId,
        bookId: variant.bookId,
        createdAt: now,
        updatedAt: now,
      });
      await ctx.db.patch(catalogId, { titleCount: 1 });
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

    const adminRows = await admin.query(api.secretCatalogs.listAdminRows, {
      paginationOpts: { numItems: 100, cursor: null },
    });
    const adminRowById = new Map(adminRows.page.map((catalog) => [String(catalog.id), catalog]));
    expect(adminRows.page.length).toBeGreaterThanOrEqual(55);
    expect(adminRowById.get(String(emptyCatalogId))).toMatchObject({ titleCount: 0, preview: null });
    expect(adminRowById.get(String(small.catalogId))).toMatchObject({
      titleCount: 1,
      preview: { title: "501 item scale catalog Book", formatCount: 501 },
    });
    expect(adminRowById.get(String(large.catalogId))).toMatchObject({
      titleCount: 1,
      preview: { title: "1000 item scale catalog Book", formatCount: 1000 },
    });
    expect(adminRowById.get(String(detail.catalogId))).toMatchObject({ titleCount: 1, preview: { formatCount: 1 } });
    expect(JSON.stringify(adminRows)).not.toContain("gallery");
    expect(JSON.stringify(adminRows)).not.toContain("coverStorageId");

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

  it("loads a customer book detail directly even when the title is beyond the 600th catalog position", async () => {
    const t = testConvex();
    const { admin, customer, secondCustomer } = await setupUsers(t);
    const customerUser = await customer.query(api.users.current, {});
    const adminUser = await admin.query(api.users.current, {});
    if (!customerUser || !adminUser) throw new Error("catalog detail fixture missing");

    const publisherId = await admin.mutation(api.publishers.create, { name: "Large Detail Publisher" });
    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Large Customer Detail Catalog" });
    await admin.mutation(api.secretCatalogs.open, { catalogId });

    const target = await t.run(async (ctx) => {
      const now = Date.now();
      const targets: Array<{ bookId: Id<"books">; variantId: Id<"bookVariants">; position: number }> = [];
      const coverStorageId = await ctx.storage.store(new Blob(["catalog media fixture"]));
      for (let index = 0; index < 660; index += 1) {
        const bookId = await ctx.db.insert("books", {
          publisherId,
          title: `Large Catalog Book ${index + 1}`,
          slug: `large-catalog-book-${index + 1}`,
          author: `Author ${index + 1}`,
          description: `Detail for book ${index + 1}`,
          categories: ["Children Books"],
          publicationStatus: "published",
          coverStorageId,
          isActive: true,
          createdAt: now + index,
          updatedAt: now + index,
          createdByUserId: adminUser.appUserId,
        });
        const variantId = await ctx.db.insert("bookVariants", {
          bookId,
          format: "PB",
          isbn: `9789${String(index + 1).padStart(9, "0")}`,
          priceAmount: 100000 + index,
          currency: "IDR",
          isAvailable: true,
          createdAt: now + index,
          updatedAt: now + index,
        });
        await ctx.db.insert("catalogItems", {
          catalogId,
          bookVariantId: variantId,
          bookId,
          isAvailable: true,
          sortOrder: index,
          createdAt: now + index,
          updatedAt: now + index,
        });
        await ctx.db.insert("catalogTitles", {
          catalogId,
          bookId,
          createdAt: now + index,
          updatedAt: now + index,
        });
        if ([24, 597, 600, 614, 627].includes(index)) {
          targets.push({ bookId, variantId, position: index + 1 });
          await ctx.db.insert("bookMedia", {
            bookId,
            storageId: coverStorageId,
            displayOrder: 0,
            altText: "Inside pages",
            createdAt: now,
            updatedAt: now,
            createdByUserId: adminUser.appUserId,
          });
        }
      }
      await ctx.db.patch(catalogId, { titleCount: 660, updatedAt: now + 661 });
      await ctx.db.insert("catalogAccessGrants", {
        appUserId: customerUser.appUserId,
        catalogId,
        grantedAt: now,
        expiresAt: now + 60 * 60 * 1000,
      });
      return targets;
    });

    for (const item of target) {
      const search = await customer.query(api.catalogAccess.getUnlocked, {
        catalogId,
        pageNumber: 1,
        pageSize: 25,
        search: `Large Catalog Book ${item.position}`,
        publishers: [],
        formats: [],
      });
      expect(search?.books.some((book) => book.id === item.bookId)).toBe(true);
      const args = { catalogId, bookId: item.bookId };
      const detail = await customer.query(api.catalogAccess.getBookUnlocked, args);
      expect(detail).toMatchObject({
        id: item.bookId,
        title: `Large Catalog Book ${item.position}`,
        description: `Detail for book ${item.position}`,
        coverImageUrl: expect.any(String),
        gallery: [expect.objectContaining({ altText: "Inside pages", url: expect.any(String) })],
        variants: [
          expect.objectContaining({
            id: item.variantId,
            catalogItemId: expect.any(String),
            price: 100000 + item.position - 1,
          }),
        ],
      });
      expect(await customer.query(api.catalogAccess.getBookUnlocked, args)).toEqual(detail);
      expect(await secondCustomer.query(api.catalogAccess.getBookUnlocked, args)).toBeNull();
    }
    const args = { catalogId, bookId: target.at(-1)!.bookId };
    await expect(t.query(api.catalogAccess.getBookUnlocked, args)).rejects.toThrow("IDENTITY_REQUIRED");
    expect(await t.query(api.catalogAccess.getBookUnlocked, { ...args, sessionToken: "invalid-session" })).toBeNull();
    const other = await createOpenCatalog(admin, "Outside catalog", "9009", "outside-code");
    expect(await customer.query(api.catalogAccess.getBookUnlocked, { catalogId, bookId: other.bookId })).toBeNull();
    const code = await admin.mutation(api.catalogAccess.generateCode, { catalogId });
    const unlocked = await t.mutation(api.catalogAccess.unlock, {
      accessCode: code.code,
      attemptKey: "large-catalog-verification",
    });
    if ("errorCode" in unlocked) throw Error(unlocked.errorCode);
    expect(
      await t.query(api.catalogAccess.getBookUnlocked, { ...args, sessionToken: unlocked.sessionToken }),
    ).toMatchObject({ id: args.bookId });
    await admin.mutation(api.secretCatalogs.close, { catalogId });
    expect(await customer.query(api.catalogAccess.getBookUnlocked, args)).toBeNull();
    expect(
      await t.query(api.catalogAccess.getBookUnlocked, { ...args, sessionToken: unlocked.sessionToken }),
    ).toBeNull();
  });

  it("keeps the Admin-list title counter idempotent across concurrent formats and eligibility changes", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const catalog = await createOpenCatalog(admin, "Admin list invariant catalog", "5011", "scale-invariant");
    const secondVariantId = await admin.mutation(api.bookVariants.create, {
      bookId: catalog.bookId,
      format: "HB",
      isbn: "978000050112",
      priceAmount: 150000,
    });
    const thirdVariantId = await admin.mutation(api.bookVariants.create, {
      bookId: catalog.bookId,
      format: "FLEXIBOUND",
      isbn: "978000050113",
      priceAmount: 165000,
    });

    await Promise.all([
      admin.mutation(api.catalogItems.add, { catalogId: catalog.catalogId, bookVariantId: secondVariantId }),
      admin.mutation(api.catalogItems.add, { catalogId: catalog.catalogId, bookVariantId: thirdVariantId }),
    ]);

    const list = () =>
      admin.query(api.secretCatalogs.listAdminRows, { paginationOpts: { numItems: 10, cursor: null } });
    const row = (await list()).page.find((candidate) => candidate.id === catalog.catalogId);
    expect(row).toMatchObject({ titleCount: 1, preview: { formatCount: 3 } });

    await admin.mutation(api.books.update, { bookId: catalog.bookId, publicationStatus: "draft" });
    expect((await list()).page.find((candidate) => candidate.id === catalog.catalogId)).toMatchObject({
      titleCount: 0,
      preview: null,
    });
    await admin.mutation(api.books.update, { bookId: catalog.bookId, publicationStatus: "special" });
    expect((await list()).page.find((candidate) => candidate.id === catalog.catalogId)).toMatchObject({
      titleCount: 1,
      preview: { formatCount: 3 },
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
