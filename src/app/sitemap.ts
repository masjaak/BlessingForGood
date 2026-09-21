import type { MetadataRoute } from "next";
import { getPublicReadyStockSlugs, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const staticPublicPaths = ["/", "/ready-stock", "/community", "/how-to-order", "/help"];

export function buildSitemapEntries(bookSlugs: readonly string[] = []): MetadataRoute.Sitemap {
  const paths = [...staticPublicPaths, ...bookSlugs.map((slug) => `/ready-stock/${slug}`)];
  return [...new Set(paths)].map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  return buildSitemapEntries((await getPublicReadyStockSlugs()) || []);
}
