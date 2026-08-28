import { readFileSync } from "node:fs";
import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import {
  createBookMetadata,
  createBookStructuredData,
  createBreadcrumbStructuredData,
  createHomepageStructuredData,
} from "@/lib/seo";
import type { PublicReadyStockBook } from "@/lib/seo";

const book = {
  bookId: "book-1",
  slug: "the-public-book",
  title: "The Public Book",
  author: "A. Writer",
  description: "A real customer-facing description.",
  categories: ["Fiction"],
  coverImageUrl: "https://clean-eel-522.convex.cloud/api/storage/cover-1",
  coverPresentation: null,
  gallery: [],
  externalPreview: null,
  publisher: { id: "publisher-1", name: "BFG Press" },
  variants: [
    {
      id: "variant-1",
      format: "PB" as const,
      isbn: "9780000000010",
      priceAmount: 125000,
      currency: "IDR" as const,
      stockQuantity: 2,
    },
  ],
  minPrice: 125000,
  maxPrice: 125000,
  totalStock: 2,
  createdAt: 1,
} as unknown as PublicReadyStockBook;

afterEach(() => vi.unstubAllEnvs());

describe("BFG search discovery foundation", () => {
  it("allows public crawling while disallowing private route families and advertises the canonical sitemap", () => {
    const result = robots();
    const rules = Array.isArray(result.rules) ? result.rules : [result.rules];
    const universal = rules.find((rule) => rule.userAgent === "*");
    const oai = rules.find((rule) => rule.userAgent === "OAI-SearchBot");

    expect(universal?.allow).toBe("/");
    expect(universal?.disallow).toEqual(
      expect.arrayContaining(["/admin", "/account", "/catalog", "/sign-in", "/sign-up", "/accept-invitation"]),
    );
    expect(oai?.allow).toBe("/");
    expect(oai?.disallow).toEqual(universal?.disallow);
    expect(result.sitemap).toBe("https://www.blessingforgood.com/sitemap.xml");
  });

  it("emits only canonical public sitemap URLs when the public data backend is unavailable", async () => {
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
    const entries = await sitemap();
    const urls = entries.map((entry) => entry.url);

    expect(urls).toEqual([
      "https://www.blessingforgood.com/",
      "https://www.blessingforgood.com/ready-stock",
      "https://www.blessingforgood.com/community",
      "https://www.blessingforgood.com/how-to-order",
      "https://www.blessingforgood.com/help",
    ]);
    expect(new Set(urls).size).toBe(urls.length);
    expect(urls.some((url) => /admin|account|catalog|sign-in|sign-up|invoice|payment/i.test(url))).toBe(false);
  });

  it("keeps homepage entity markup factual and product markup tied to live public fields", () => {
    const homepage = createHomepageStructuredData();
    const product = createBookStructuredData(book);
    const breadcrumb = createBreadcrumbStructuredData(book);

    expect(homepage).toMatchObject({ "@context": "https://schema.org" });
    expect(JSON.stringify(homepage)).toContain("OnlineStore");
    expect(JSON.stringify(homepage)).toContain("WebSite");
    expect(product).toMatchObject({
      "@type": "Product",
      name: book.title,
      url: "https://www.blessingforgood.com/ready-stock/the-public-book",
      offers: [
        {
          price: 125000,
          priceCurrency: "IDR",
          availability: "https://schema.org/InStock",
          sku: "9780000000010",
        },
      ],
    });
    expect(JSON.stringify(product)).not.toContain("rating");
    expect(JSON.stringify(product)).not.toContain("review");
    expect(breadcrumb).toMatchObject({ "@type": "BreadcrumbList" });
  });

  it("generates unique canonical book metadata from real fields", () => {
    expect(createBookMetadata(book)).toMatchObject({
      title: "The Public Book — Ready Stock | Blessing For Goods",
      alternates: { canonical: "/ready-stock/the-public-book" },
      robots: { index: true, follow: true },
    });
    expect(createBookMetadata(book).description).toContain("A real customer-facing description.");
  });

  it("keeps the canonical public route server-rendered for metadata and not-found handling", () => {
    const source = readFileSync("src/app/ready-stock/[slug]/page.tsx", "utf8");
    expect(source).toContain("generateMetadata");
    expect(source).toContain("notFound");
    expect(source).not.toContain("useParams");
  });

  it("marks private and invitation surfaces noindex", () => {
    for (const file of [
      "src/app/catalog/layout.tsx",
      "src/app/account/layout.tsx",
      "src/app/admin/layout.tsx",
      "src/app/sign-in/[[...sign-in]]/page.tsx",
      "src/app/sign-up/[[...sign-up]]/page.tsx",
      "src/app/accept-invitation/page.tsx",
      "src/app/join/layout.tsx",
    ]) {
      expect(readFileSync(file, "utf8")).toContain("index: false");
    }
  });
});
