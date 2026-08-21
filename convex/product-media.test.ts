/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

async function storeImage(t: ReturnType<typeof testConvex>, label: string) {
  return t.run(async (ctx) => {
    const storageId = await ctx.storage.store(new Blob([label], { type: "image/webp" }));
    // convex-test does not retain Blob.type in synthetic storage metadata.
    await ctx.db.patch(storageId as never, { contentType: "image/webp" } as never);
    return storageId;
  });
}

describe("BFG Book Master product media", () => {
  beforeEach(configureTestEnvironment);

  it("keeps the cover separate while persisting ordered customer-safe gallery media", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Media Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Media Book" });
    const variantId = await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780000088011",
      priceAmount: 150000,
    });
    await admin.mutation(api.readyStock.setQuantity, { bookVariantId: variantId, quantity: 2 });
    await admin.mutation(api.books.update, { bookId, publicationStatus: "published" });

    const cover = await storeImage(t, "cover");
    const first = await storeImage(t, "first");
    const second = await storeImage(t, "second");
    await admin.mutation(api.books.attachCover, { bookId, storageId: cover });
    const firstMediaId = await admin.mutation(api.books.attachGalleryImage, {
      bookId,
      storageId: first,
      altText: "Halaman isi pertama",
    });
    const secondMediaId = await admin.mutation(api.books.attachGalleryImage, {
      bookId,
      storageId: second,
      altText: "Halaman isi kedua",
    });
    await admin.mutation(api.books.moveGalleryImage, { mediaId: secondMediaId, direction: "up" });
    await admin.mutation(api.books.updateExternalPreview, {
      bookId,
      label: "Preview Amazon",
      url: "https://www.amazon.com/example-book",
    });

    const adminBook = await admin.query(api.books.getForAdmin, { bookId });
    expect(adminBook?.coverStorageId).toBe(cover);
    expect(adminBook?.gallery.map((image) => image.storageId)).toEqual([second, first]);
    expect(adminBook).toMatchObject({
      externalPreviewLabel: "Preview Amazon",
      externalPreviewUrl: "https://www.amazon.com/example-book",
    });

    const publicBook = await customer.query(api.readyStock.getBySlug, { slug: "media-book" });
    expect(publicBook?.gallery.map((image) => image.altText)).toEqual(["Halaman isi kedua", "Halaman isi pertama"]);
    expect(JSON.stringify(publicBook)).not.toContain(String(cover));
    expect(JSON.stringify(publicBook)).not.toContain(String(first));
    expect(JSON.stringify(publicBook)).not.toContain(String(second));
    expect(publicBook?.externalPreview).toEqual({
      label: "Preview Amazon",
      url: "https://www.amazon.com/example-book",
    });

    await expect(
      customer.mutation(api.books.attachGalleryImage, { bookId, storageId: await storeImage(t, "denied") }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(admin.mutation(api.books.attachGalleryImage, { bookId, storageId: cover })).rejects.toThrow(
      "VALIDATION_FAILED",
    );

    await admin.mutation(api.books.removeGalleryImage, { mediaId: secondMediaId });
    expect((await admin.query(api.books.getForAdmin, { bookId }))?.gallery).toHaveLength(1);
    expect(
      await t.run(async (ctx) => ctx.db.system.get("_storage", second)),
    ).toBeNull();
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
});
