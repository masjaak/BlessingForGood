import { describe, expect, it } from "vitest";
import { matchesAdminCatalogRecord, matchesCustomerCatalogBook } from "@/lib/catalog-discovery";

const book = {
  title: "Science Around Us",
  publisher: "DK",
  author: "Ada Lovelace",
  variants: [{ isbn: "978-0-01-1111-11-1" }],
};

describe("Secret Catalog discovery matching", () => {
  it("matches customer title and ISBN only, case-insensitively and partially", () => {
    expect(matchesCustomerCatalogBook(book, "science")).toBe(true);
    expect(matchesCustomerCatalogBook(book, "SCIENCE")).toBe(true);
    expect(matchesCustomerCatalogBook(book, "978 0 01 1111")).toBe(true);
    expect(matchesCustomerCatalogBook(book, "DK")).toBe(false);
    expect(matchesCustomerCatalogBook(book, "Ada")).toBe(false);
    expect(matchesCustomerCatalogBook(book, "")).toBe(true);
  });

  it("matches Admin title, publisher, ISBN, and author", () => {
    expect(matchesAdminCatalogRecord(book, "science")).toBe(true);
    expect(matchesAdminCatalogRecord(book, "dk")).toBe(true);
    expect(matchesAdminCatalogRecord(book, "9780011111")).toBe(true);
    expect(matchesAdminCatalogRecord(book, "lovelace")).toBe(true);
    expect(matchesAdminCatalogRecord(book, "history")).toBe(false);
  });
});
