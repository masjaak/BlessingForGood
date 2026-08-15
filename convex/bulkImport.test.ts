/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const headers = "publisher,title,author,description,categories,format,isbn,price_idr";
const csv = (rows: string[]) => `${headers}\n${rows.join("\n")}\n`;
const validCsv = csv([
  '"New Publisher","A, Quiet Book","Author","A ""quoted"" description","Children Books; Picture Book",PB,9780306406157,305000',
]);

function isbn13(seed: number): string {
  const body = `978${String(seed).padStart(9, "0")}`;
  const sum = [...body].reduce((total, digit, index) => total + Number(digit) * (index % 2 ? 3 : 1), 0);
  return `${body}${(10 - (sum % 10)) % 10}`;
}

describe("Bulk Import V1", () => {
  beforeEach(configureTestEnvironment);

  it("denies preview and confirm to signed-out, customer, and suspended users", async () => {
    const t = testConvex();
    const { admin, customer, owner } = await setupUsers(t);
    const missingAppUser = t.withIdentity({ subject: "bulk-missing", tokenIdentifier: "clerk|bulk-missing" });

    await expect(t.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" })).rejects.toThrow(
      "IDENTITY_REQUIRED",
    );
    await expect(
      missingAppUser.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" }),
    ).rejects.toThrow("APP_USER_REQUIRED");
    await expect(customer.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(customer.mutation(api.bulkImport.confirm, { csv: validCsv, fileName: "books.csv" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    await expect(owner.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" })).resolves.toMatchObject({
      summary: { totalRows: 1, previewWrites: 0 },
    });
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin missing");
    await owner.mutation(api.users.suspend, { userId: adminUser.appUserId });
    await expect(admin.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" })).rejects.toThrow(
      "USER_SUSPENDED",
    );
  });

  it("returns a zero-write preview with canonical counts and safe row details", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const before = await t.run(async (ctx) => ({
      publishers: (await ctx.db.query("publishers").collect()).length,
      books: (await ctx.db.query("books").collect()).length,
      variants: (await ctx.db.query("bookVariants").collect()).length,
      audits: (await ctx.db.query("auditEvents").collect()).length,
    }));

    const preview = await admin.query(api.bulkImport.preview, { csv: validCsv, fileName: "books.csv" });

    expect(preview.summary).toMatchObject({
      totalRows: 1,
      validRows: 1,
      invalidRows: 0,
      newPublishers: 1,
      newBooks: 1,
      newVariants: 1,
      noOpRows: 0,
      warnings: 1,
      previewWrites: 0,
    });
    expect(preview.rows[0]).toMatchObject({
      rowNumber: 2,
      title: "A, Quiet Book",
      format: "PB",
      isbn: "9780306406157",
      status: "warning",
    });
    expect(preview).not.toHaveProperty("rawCsv");

    const after = await t.run(async (ctx) => ({
      publishers: (await ctx.db.query("publishers").collect()).length,
      books: (await ctx.db.query("books").collect()).length,
      variants: (await ctx.db.query("bookVariants").collect()).length,
      audits: (await ctx.db.query("auditEvents").collect()).length,
    }));
    expect(after).toEqual(before);
  });

  it("plans the locked 200-row maximum without writes", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const maximum = csv(
      Array.from(
        { length: 200 },
        (_, index) => `Maximum Publisher,Maximum Book ${index + 1},,,,PB,${isbn13(index + 1)},305000`,
      ),
    );

    const preview = await admin.query(api.bulkImport.preview, { csv: maximum, fileName: "books.csv" });

    expect(preview.summary).toMatchObject({ totalRows: 200, validRows: 200, newBooks: 200, newVariants: 200 });
    expect(preview.summary.previewWrites).toBe(0);
    expect(await t.run(async (ctx) => ctx.db.query("books").collect())).toHaveLength(0);
  });

  it("confirms atomically, keeps new products draft/inactive, audits safely, and retries as no-op", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const result = await admin.mutation(api.bulkImport.confirm, { csv: validCsv, fileName: "books.csv" });

    expect(result.summary).toMatchObject({
      createdPublishers: 1,
      createdBooks: 1,
      createdVariants: 1,
      noOpRows: 0,
      updated: 0,
    });
    const created = await t.run(async (ctx) => ({
      publisher: await ctx.db.query("publishers").first(),
      book: await ctx.db.query("books").first(),
      variant: await ctx.db.query("bookVariants").first(),
      audits: await ctx.db.query("auditEvents").collect(),
      stock: await ctx.db.query("readyStockInventory").collect(),
      reservations: await ctx.db.query("readyStockReservations").collect(),
      catalog: await ctx.db.query("catalogItems").collect(),
      notifications: await ctx.db.query("notifications").collect(),
    }));
    expect(created.book).toMatchObject({ publicationStatus: "draft", isActive: true });
    expect(created.variant).toMatchObject({ isAvailable: false, isbn: "9780306406157", priceAmount: 305000 });
    expect(created.stock).toEqual([]);
    expect(created.reservations).toEqual([]);
    expect(created.catalog).toEqual([]);
    expect(created.notifications).toEqual([]);
    expect((await customer.query(api.readyStock.list, {})).items).toEqual([]);
    const summaryAudit = created.audits.find((audit) => audit.action === "bulk_import.completed");
    expect(summaryAudit?.safeMetadata).toMatchObject({
      fileType: "csv",
      totalRows: "1",
      createdPublishers: "1",
      createdBooks: "1",
      createdVariants: "1",
      noOpCount: "0",
      updatedCount: "0",
      warningCount: "1",
    });
    expect(JSON.stringify(summaryAudit?.safeMetadata)).not.toContain("New Publisher");
    expect(JSON.stringify(summaryAudit?.safeMetadata)).not.toContain("A, Quiet Book");

    const retry = await admin.mutation(api.bulkImport.confirm, { csv: validCsv, fileName: "books.csv" });
    expect(retry.summary).toMatchObject({ createdPublishers: 0, createdBooks: 0, createdVariants: 0, noOpRows: 1 });
  });

  it("rejects duplicate/conflicting rows and late failures without partial writes", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const before = await t.run(async (ctx) => ({
      publishers: (await ctx.db.query("publishers").collect()).length,
      books: (await ctx.db.query("books").collect()).length,
      variants: (await ctx.db.query("bookVariants").collect()).length,
    }));
    const invalid = csv([
      "New Publisher,First Book,,, ,PB,9780306406157,305000",
      "New Publisher,Second Book,,, ,HB,9780306406157,305000",
      "New Publisher,Third Book,,, ,BB,9781861972712,Rp305.000",
    ]);
    const preview = await admin.query(api.bulkImport.preview, { csv: invalid, fileName: "books.csv" });
    expect(preview.summary.invalidRows).toBe(3);
    expect(preview.rows.flatMap((row) => row.errors).map((error) => error.field)).toEqual(
      expect.arrayContaining(["isbn", "price_idr"]),
    );
    await expect(admin.mutation(api.bulkImport.confirm, { csv: invalid, fileName: "books.csv" })).rejects.toThrow(
      "BULK_IMPORT_VALIDATION_FAILED",
    );
    const after = await t.run(async (ctx) => ({
      publishers: (await ctx.db.query("publishers").collect()).length,
      books: (await ctx.db.query("books").collect()).length,
      variants: (await ctx.db.query("bookVariants").collect()).length,
    }));
    expect(after).toEqual(before);
  });

  it("matches normalized publishers/books, creates only a new inactive variant, and retries idempotently", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const publisherId = await admin.mutation(api.publishers.create, { name: "Walker Books" });
    const bookId = await admin.mutation(api.books.create, {
      publisherId,
      title: "The Quiet Book",
      author: "Author",
      description: "Description",
    });
    await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9780306406157",
      priceAmount: 305000,
    });
    const importFile = csv([
      "Walker  Books,The Quiet Book,Author,Description,,PB,978-0-306-40615-7,305000",
      "walker books,The Quiet Book,Author,Description,,HB,9781861972712,350000",
    ]);

    const preview = await admin.query(api.bulkImport.preview, { csv: importFile, fileName: "books.csv" });
    expect(preview.summary).toMatchObject({
      existingPublishers: 1,
      existingBooks: 1,
      newVariants: 1,
      noOpRows: 1,
      invalidRows: 0,
    });
    expect(preview.rows.map((row) => row.status)).toEqual(["no_change", "ready"]);

    const result = await admin.mutation(api.bulkImport.confirm, { csv: importFile, fileName: "books.csv" });
    expect(result.summary).toMatchObject({ createdPublishers: 0, createdBooks: 0, createdVariants: 1, noOpRows: 1 });
    const variants = await t.run(async (ctx) => ctx.db.query("bookVariants").collect());
    expect(variants).toHaveLength(2);
    expect(variants.find((variant) => variant.format === "HB")).toMatchObject({
      isbn: "9781861972712",
      isAvailable: false,
      priceAmount: 350000,
    });

    const retry = await admin.mutation(api.bulkImport.confirm, { csv: importFile, fileName: "books.csv" });
    expect(retry.summary).toMatchObject({ createdPublishers: 0, createdBooks: 0, createdVariants: 0, noOpRows: 2 });
    expect(await t.run(async (ctx) => ctx.db.query("bookVariants").collect())).toHaveLength(2);
  });

  it("rejects inactive publishers, metadata conflicts, and global ISBN conflicts", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const inactivePublisherId = await admin.mutation(api.publishers.create, { name: "Inactive Publisher" });
    await admin.mutation(api.publishers.update, {
      publisherId: inactivePublisherId,
      name: "Inactive Publisher",
      isActive: false,
    });
    const existingPublisherId = await admin.mutation(api.publishers.create, { name: "Existing Publisher" });
    const existingBookId = await admin.mutation(api.books.create, {
      publisherId: existingPublisherId,
      title: "Existing Book",
      author: "Stored Author",
    });
    await admin.mutation(api.bookVariants.create, {
      bookId: existingBookId,
      format: "PB",
      isbn: "9780306406157",
      priceAmount: 305000,
    });

    const inactive = await admin.query(api.bulkImport.preview, {
      csv: csv(["Inactive Publisher,New Book,,, ,PB,9781861972712,100000"]),
      fileName: "books.csv",
    });
    expect(inactive.rows[0]?.errors.map((error) => error.code)).toContain("INACTIVE_PUBLISHER");

    const metadata = await admin.query(api.bulkImport.preview, {
      csv: csv(["Existing Publisher,Existing Book,Other Author,,,PB,9780747532743,305000"]),
      fileName: "books.csv",
    });
    expect(metadata.rows[0]?.errors.map((error) => error.code)).toContain("BOOK_METADATA_CONFLICT");

    const isbnConflict = await admin.query(api.bulkImport.preview, {
      csv: csv(["Other Publisher,Other Book,,,,HB,9780306406157,305000"]),
      fileName: "books.csv",
    });
    expect(isbnConflict.rows[0]?.errors.map((error) => error.code)).toContain("ISBN_ALREADY_EXISTS");
    await expect(
      admin.mutation(api.bulkImport.confirm, {
        csv: csv(["Other Publisher,Other Book,,,,HB,9780306406157,305000"]),
        fileName: "books.csv",
      }),
    ).rejects.toThrow("BULK_IMPORT_VALIDATION_FAILED");
  });

  it("revalidates current state at confirmation and rejects a stale price conflict", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const staleFile = csv(["Concurrent Publisher,Concurrent Book,,,,PB,9781861972712,305000"]);
    const preview = await admin.query(api.bulkImport.preview, { csv: staleFile, fileName: "books.csv" });
    expect(preview.summary.validRows).toBe(1);

    const publisherId = await admin.mutation(api.publishers.create, { name: "Concurrent Publisher" });
    const bookId = await admin.mutation(api.books.create, { publisherId, title: "Concurrent Book" });
    await admin.mutation(api.bookVariants.create, {
      bookId,
      format: "PB",
      isbn: "9781861972712",
      priceAmount: 400000,
    });

    await expect(admin.mutation(api.bulkImport.confirm, { csv: staleFile, fileName: "books.csv" })).rejects.toThrow(
      "BULK_IMPORT_VALIDATION_FAILED",
    );
    expect(await t.run(async (ctx) => ctx.db.query("bookVariants").collect())).toHaveLength(1);
  });
});
