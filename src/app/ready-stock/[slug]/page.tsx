import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ReadyStockDetail } from "@/components/ready-stock-detail";
import { BackButton } from "@/components/back-button";
import { JsonLd } from "@/components/json-ld";
import { SiteShell } from "@/components/site-shell";
import {
  createBookMetadata,
  createBookStructuredData,
  createBreadcrumbStructuredData,
  createPageMetadata,
  getPublicReadyStockBook,
} from "@/lib/seo";

export const dynamic = "force-dynamic";

type ReadyStockDetailPageProps = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: ReadyStockDetailPageProps): Promise<Metadata> {
  const { slug } = await params;
  const book = await getPublicReadyStockBook(slug);
  return book
    ? createBookMetadata(book)
    : createPageMetadata({
        title: "Buku Ready Stock Tidak Tersedia | Blessing For Goods",
        description: "Buku Ready Stock yang diminta tidak tersedia untuk dilihat.",
        path: `/ready-stock/${slug}`,
        index: false,
      });
}

export default async function ReadyStockDetailPage({ params }: ReadyStockDetailPageProps) {
  const { slug } = await params;
  const initialBook = await getPublicReadyStockBook(slug);
  if (initialBook === null) notFound();

  return (
    <SiteShell>
      <div className="route-with-back">
        <BackButton fallback="/ready-stock" />
        {initialBook ? (
          <>
            <JsonLd data={createBookStructuredData(initialBook)} />
            <JsonLd data={createBreadcrumbStructuredData(initialBook)} />
          </>
        ) : null}
        <ReadyStockDetail slug={slug} initialBook={initialBook} />
      </div>
    </SiteShell>
  );
}
