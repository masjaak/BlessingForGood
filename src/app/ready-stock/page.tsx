import type { Metadata } from "next";
import { ReadyStockCatalog } from "@/components/ready-stock-catalog";
import { SiteShell } from "@/components/site-shell";
import { getPublicReadyStockList, createPageMetadata } from "@/lib/seo";

// ponytail: five-second ISR bounds repeated public Convex fan-out; shorten or invalidate it if stock freshness requires it.
export const revalidate = 5;

export const metadata: Metadata = createPageMetadata({
  title: "Ready Stock — Buku Tersedia Sekarang | Blessing For Goods",
  description: "Temukan judul pilihan, format, harga, dan ketersediaan buku Ready Stock di Blessing For Goods.",
  path: "/ready-stock",
});

export default async function ReadyStockPage() {
  const initialResult = await getPublicReadyStockList();
  return (
    <SiteShell>
      <ReadyStockCatalog initialResult={initialResult} />
    </SiteShell>
  );
}
