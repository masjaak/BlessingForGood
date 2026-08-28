import type { Metadata } from "next";
import { ConvexHttpClient } from "convex/browser";
import type { FunctionReturnType } from "convex/server";
import { cache } from "react";
import { api } from "../../convex/_generated/api";
import { isValidBackendUrl } from "./environment";

export const SITE_URL = "https://www.blessingforgood.com";
const SITE_NAME = "Blessing For Goods";
const HOMEPAGE_DESCRIPTION =
  "Blessing For Goods adalah community-led imported bookstore untuk menemukan Ready Stock, preorder, dan curated titles pilihan.";

export type PublicReadyStockBook = NonNullable<FunctionReturnType<typeof api.readyStock.getBySlug>>;
export type PublicReadyStockList = FunctionReturnType<typeof api.readyStock.list>;

function publicDataClient() {
  const url = process.env.NEXT_PUBLIC_CONVEX_URL;
  return isValidBackendUrl(url) ? new ConvexHttpClient(url) : null;
}

export const getPublicReadyStockBook = cache(async (slug: string): Promise<PublicReadyStockBook | null | undefined> => {
  const client = publicDataClient();
  return client ? client.query(api.readyStock.getBySlug, { slug }) : undefined;
});

export async function getPublicReadyStockList(): Promise<PublicReadyStockList | undefined> {
  const client = publicDataClient();
  return client ? client.query(api.readyStock.list, {}) : undefined;
}

export function publicBookUrl(book: Pick<PublicReadyStockBook, "slug">) {
  return `${SITE_URL}/ready-stock/${book.slug}`;
}

export function publicBookAlt(book: Pick<PublicReadyStockBook, "title" | "author">) {
  return `Cover ${book.title}${book.author ? ` by ${book.author}` : ""}`;
}

export function publicBookDescription(book: PublicReadyStockBook) {
  const facts = [
    book.author ? `oleh ${book.author}` : null,
    `penerbit ${book.publisher.name}`,
    book.variants.length ? `format ${book.variants.map((variant) => variant.format).join(", ")}` : null,
  ].filter((value): value is string => Boolean(value));
  const base = book.description?.trim() || book.title;
  return `${base} ${facts.join(", ")}. Tersedia di Ready Stock ${SITE_NAME}.`;
}

type PageMetadataOptions = {
  title: string;
  description: string;
  path: string;
  index?: boolean;
};

export function createPageMetadata({ title, description, path, index = true }: PageMetadataOptions): Metadata {
  const url = new URL(path, SITE_URL).toString();
  return {
    title,
    description,
    alternates: { canonical: path },
    robots: { index, follow: index },
    openGraph: { title, description, url, siteName: SITE_NAME, type: "website" },
    twitter: { card: "summary_large_image", title, description },
  };
}

export function createBookMetadata(book: PublicReadyStockBook): Metadata {
  const title = `${book.title} — Ready Stock | ${SITE_NAME}`;
  const description = publicBookDescription(book);
  const image = book.coverImageUrl ? [{ url: book.coverImageUrl, alt: publicBookAlt(book) }] : undefined;
  return {
    ...createPageMetadata({ title, description, path: `/ready-stock/${book.slug}` }),
    openGraph: {
      title,
      description,
      url: publicBookUrl(book),
      siteName: SITE_NAME,
      type: "website",
      ...(image ? { images: image } : {}),
    },
    twitter: { card: "summary_large_image", title, description, ...(image ? { images: image } : {}) },
  };
}

export function createHomepageStructuredData() {
  const storeId = `${SITE_URL}/#store`;
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "OnlineStore",
        "@id": storeId,
        name: SITE_NAME,
        url: SITE_URL,
        description: HOMEPAGE_DESCRIPTION,
        logo: `${SITE_URL}/brand/logos/Logo-2.png`,
      },
      {
        "@type": "WebSite",
        "@id": `${SITE_URL}/#website`,
        name: SITE_NAME,
        url: SITE_URL,
        inLanguage: "id",
        publisher: { "@id": storeId },
      },
    ],
  };
}

export function createBookStructuredData(book: PublicReadyStockBook) {
  const url = publicBookUrl(book);
  const images = [book.coverImageUrl, ...book.gallery.map((image) => image.url)].filter((image): image is string =>
    Boolean(image),
  );
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    "@id": `${url}#product`,
    name: book.title,
    description: publicBookDescription(book),
    ...(images.length ? { image: [...new Set(images)] } : {}),
    url,
    additionalProperty: book.variants.flatMap((variant) => [
      { "@type": "PropertyValue", name: "Format", value: variant.format },
      { "@type": "PropertyValue", name: "ISBN", value: variant.isbn },
    ]),
    offers: book.variants.map((variant) => ({
      "@type": "Offer",
      url,
      price: variant.priceAmount,
      priceCurrency: variant.currency,
      availability: variant.stockQuantity > 0 ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      sku: variant.isbn,
    })),
  };
}

export function createBreadcrumbStructuredData(book: Pick<PublicReadyStockBook, "slug" | "title">) {
  const url = publicBookUrl(book);
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Beranda", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Ready Stock", item: `${SITE_URL}/ready-stock` },
      { "@type": "ListItem", position: 3, name: book.title, item: url },
    ],
  };
}
