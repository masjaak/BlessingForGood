import type { MetadataRoute } from "next";
import { getPublicReadyStockList, publicBookUrl, SITE_URL } from "@/lib/seo";

export const dynamic = "force-dynamic";

const staticPublicPaths = ["/", "/ready-stock", "/community", "/how-to-order", "/help"];

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const result = await getPublicReadyStockList();
  const paths = [...staticPublicPaths, ...(result?.items.map((book) => new URL(publicBookUrl(book)).pathname) || [])];
  return [...new Set(paths)].map((path) => ({ url: new URL(path, SITE_URL).toString() }));
}
