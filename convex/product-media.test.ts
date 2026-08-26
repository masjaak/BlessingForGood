/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const validWebp = new Uint8Array([
  0x52, 0x49, 0x46, 0x46, 0x22, 0x00, 0x00, 0x00, 0x57, 0x45, 0x42, 0x50, 0x56, 0x50, 0x38, 0x20, 0x18, 0x00, 0x00,
  0x00, 0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x0e, 0xc0, 0xfe, 0x25, 0xa4, 0x00, 0x03, 0x70,
  0x00, 0xfe, 0xfb, 0x94, 0x00, 0x00,
]);

const validPng = new Uint8Array([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00,
  0x01, 0x00, 0x00, 0x00, 0x01, 0x08, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x49,
  0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

async function storeFile(
  t: ReturnType<typeof testConvex>,
  bytes: Uint8Array,
  contentType: string,
  ownerUserId: string,
  purpose: "book-cover" | "book-gallery",
) {
  return t.run(async (ctx) => {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    const storageId = await ctx.storage.store(new Blob([copy.buffer as ArrayBuffer], { type: contentType }));
    // convex-test does not retain Blob.type in synthetic storage metadata.
    await ctx.db.patch(storageId as never, { contentType } as never);
    await ctx.db.insert("uploadClaims", {
      storageId,
      ownerUserId: ownerUserId as never,
      purpose,
      createdAt: Date.now(),
    });
    return storageId;
  });
}

async function storeImage(t: ReturnType<typeof testConvex>, ownerUserId: string) {
  return storeFile(t, validWebp, "image/webp", ownerUserId, "book-gallery");
}

describe("BFG Book Master product media", () => {
  beforeEach(configureTestEnvironment);

  it("keeps the cover separate while persisting ordered customer-safe gallery media", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Media Publisher" });
    const bookId = await admin.mutation(api.books.create, {
      publisherId,
      title: "Media Book",
      author: "Media Author",
      description: "Customer-safe description",
    });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000088011",
      priceAmount: 150000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 2 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const cover = await storeFile(t, validWebp, "image/webp", adminUser.appUserId, "book-cover");
    const first = await storeImage(t, adminUser.appUserId);
    const second = await storeImage(t, adminUser.appUserId);
    await admin.action(api.books.attachCover, {
      bookId,
      storageId: cover,
      fileName: "cover.webp",
      mimeType: "image/webp",
    });
    const firstMediaId = await admin.action(api.books.attachGalleryImage, {
      bookId,
      storageId: first,
      fileName: "first.webp",
      mimeType: "image/webp",
      altText: "Halaman isi pertama",
    });
    const secondMediaId = await admin.action(api.books.attachGalleryImage, {
      bookId,
      storageId: second,
      fileName: "second.webp",
      mimeType: "image/webp",
      altText: "Halaman isi kedua",
    });
    await admin.mutation(api.books.moveGalleryImage, { mediaId: secondMediaId, direction: "up" });
    await admin.mutation(api.books.updateExternalPreview, {
      bookId,
      label: "Preview Amazon",
      url: "https://www.amazon.com/example-book",
    });

    const catalogId = await admin.mutation(api.secretCatalogs.create, { name: "Media Secret Catalog" });
    await admin.mutation(api.catalogItems.add, { catalogId, bookVariantId: variantId });
    await admin.mutation(api.catalogAccess.setCode, { catalogId, accessCode: "media-secret-code" });
    await admin.mutation(api.secretCatalogs.open, { catalogId });
    const unlocked = await customer.mutation(api.catalogAccess.unlock, { accessCode: "media-secret-code" });
    if ("errorCode" in unlocked) throw new Error(unlocked.errorCode);
    const secretBook = (
      await customer.query(api.catalogAccess.getUnlocked, {
        catalogId,
        sessionToken: unlocked.sessionToken,
      })
    )?.books[0];
    expect(secretBook).toMatchObject({
      title: "Media Book",
      author: "Media Author",
      description: "Customer-safe description",
      gallery: [{ altText: "Halaman isi kedua" }, { altText: "Halaman isi pertama" }],
      externalPreview: { label: "Preview Amazon", url: "https://www.amazon.com/example-book" },
    });
    expect(secretBook?.variants[0]).not.toHaveProperty("supplierPriceGbpMinor");
    expect(await t.query(api.catalogAccess.getUnlocked, { catalogId, sessionToken: "invalid-session" })).toBeNull();

    const adminBook = await admin.query(api.books.getForAdmin, { bookId });
    expect(adminBook?.coverStorageId).toBe(cover);
    expect(adminBook?.coverPresentation).toBeUndefined();
    expect(adminBook?.gallery.map((image) => image.storageId)).toEqual([second, first]);
    expect(adminBook).toMatchObject({
      externalPreviewLabel: "Preview Amazon",
      externalPreviewUrl: "https://www.amazon.com/example-book",
    });

    const publicBook = await customer.query(api.readyStock.getBySlug, { slug: "media-book" });
    expect(publicBook?.gallery.map((image) => image.altText)).toEqual(["Halaman isi kedua", "Halaman isi pertama"]);
    expect(publicBook?.coverPresentation).toBeNull();
    expect(JSON.stringify(publicBook)).not.toContain(String(cover));
    expect(JSON.stringify(publicBook)).not.toContain(String(first));
    expect(JSON.stringify(publicBook)).not.toContain(String(second));
    expect(publicBook?.externalPreview).toEqual({
      label: "Preview Amazon",
      url: "https://www.amazon.com/example-book",
    });

    await expect(
      customer.action(api.books.attachGalleryImage, {
        bookId,
        storageId: await storeImage(t, adminUser.appUserId),
        fileName: "denied.webp",
        mimeType: "image/webp",
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      admin.action(api.books.attachGalleryImage, {
        bookId,
        storageId: cover,
        fileName: "cover.webp",
        mimeType: "image/webp",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");

    await admin.mutation(api.books.removeGalleryImage, { mediaId: secondMediaId });
    expect((await admin.query(api.books.getForAdmin, { bookId }))?.gallery).toHaveLength(1);
    expect(await t.run(async (ctx) => ctx.db.system.get("_storage", second))).toBeNull();
    expect((await admin.query(api.books.getForAdmin, { bookId }))?.coverStorageId).toBe(cover);
    expect(firstMediaId).toBeDefined();
  });

  it("rejects unsafe external preview destinations and preserves source ownership", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "URL Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "URL Book" });

    for (const url of [
      "javascript:alert(1)",
      "http://example.com/book",
      "https://user:pass@example.com/book",
      "https://localhost/book",
      "data:text/plain,hello",
    ]) {
      await expect(admin.mutation(api.books.updateExternalPreview, { bookId, url })).rejects.toThrow(
        "VALIDATION_FAILED",
      );
    }
    await expect(customer.query(api.books.getForAdmin, { bookId })).rejects.toThrow("PERMISSION_DENIED");
  });

  it("persists non-destructive cover framing, projects it to customers, and supports reset", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Framing Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Framing Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000088028",
      priceAmount: 150000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 1 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });
    const storageId = await storeFile(t, validWebp, "image/webp", adminUser.appUserId, "book-cover");

    await admin.action(api.books.attachCover, {
      bookId,
      storageId,
      fileName: "cover.webp",
      mimeType: "image/webp",
      presentation: { zoom: 1.4, x: 18, y: -12 },
    });

    expect((await admin.query(api.books.getForAdmin, { bookId }))?.coverPresentation).toEqual({
      zoom: 1.4,
      x: 18,
      y: -12,
    });
    expect((await customer.query(api.readyStock.getBySlug, { slug: "framing-book" }))?.coverPresentation).toEqual({
      zoom: 1.4,
      x: 18,
      y: -12,
    });
    expect((await t.run(async (ctx) => ctx.db.get(bookId)))?.coverStorageId).toBe(storageId);

    await expect(
      admin.mutation(api.books.updateCoverPresentation, {
        bookId,
        presentation: { zoom: 5, x: 0, y: 0 },
      }),
    ).rejects.toThrow("VALIDATION_FAILED");

    await expect(
      customer.mutation(api.books.updateCoverPresentation, {
        bookId,
        presentation: { zoom: 1.2, x: 0, y: 0 },
      }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await admin.mutation(api.books.updateCoverPresentation, { bookId });
    expect((await admin.query(api.books.getForAdmin, { bookId }))?.coverPresentation).toBeUndefined();
    expect((await customer.query(api.readyStock.getBySlug, { slug: "framing-book" }))?.coverPresentation).toBeNull();
  });

  it("rejects content, MIME, extension, and truncation mismatches before attachment", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const publisherId = await admin.mutation(api.publishers.create, { name: "Validation Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Validation Book" });
    const textAsPng = await storeFile(
      t,
      new TextEncoder().encode("not an image"),
      "image/png",
      adminUser.appUserId,
      "book-cover",
    );
    const truncatedPng = await storeFile(t, validPng.slice(0, 33), "image/png", adminUser.appUserId, "book-cover");
    const truncatedJpeg = await storeFile(
      t,
      new Uint8Array([0xff, 0xd8, 0xff, 0xe0]),
      "image/jpeg",
      adminUser.appUserId,
      "book-cover",
    );
    const validPngStorageId = await storeFile(t, validPng, "image/png", adminUser.appUserId, "book-cover");

    await expect(
      admin.action(api.books.attachCover, {
        bookId,
        storageId: textAsPng,
        fileName: "cover.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.action(api.books.attachCover, {
        bookId,
        storageId: truncatedPng,
        fileName: "cover.png",
        mimeType: "image/png",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.action(api.books.attachCover, {
        bookId,
        storageId: truncatedJpeg,
        fileName: "cover.jpg",
        mimeType: "image/jpeg",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
    await expect(
      admin.action(api.books.attachCover, {
        bookId,
        storageId: validPngStorageId,
        fileName: "cover.jpg",
        mimeType: "image/jpeg",
      }),
    ).rejects.toThrow("VALIDATION_FAILED");
  });
});
