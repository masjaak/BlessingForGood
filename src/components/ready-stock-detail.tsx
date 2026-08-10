"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { BookCover } from "@/components/book-cover";
import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { usePrototype } from "@/domain/prototype/store";

function ConnectedDetail({ slug }: { slug: string }) {
  const book = useQuery(api.readyStock.getBySlug, { slug });
  if (book === undefined) return <div className="state-panel">Memuat detail buku…</div>;
  if (!book)
    return (
      <EmptyState
        title="Buku tidak tersedia."
        description="Buku ini tidak dipublikasikan atau stoknya sedang kosong."
        action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
      />
    );
  return (
    <>
      <PageHeader eyebrow="Ready Stock" title={book.title} description={book.author || book.publisher.name} />
      <div className="ready-stock-detail">
        <BookCover title={book.title} publisher={book.publisher.name} src={book.coverImageUrl} />
        <div className="content-stack">
          <div className="form-actions">
            <StatusBadge tone="positive">{book.totalStock} tersedia</StatusBadge>
            <span className="subtle">{book.publisher.name}</span>
          </div>
          {book.description ? <p>{book.description}</p> : null}
          {book.categories.length ? <p className="subtle">{book.categories.join(" · ")}</p> : null}
          <div className="content-stack">
            {book.variants.map((variant) => (
              <Card className="ready-stock-variant" key={variant.id}>
                <div>
                  <strong>{variant.format}</strong>
                  <span className="subtle">ISBN {variant.isbn}</span>
                </div>
                <div>
                  <Money amount={variant.priceAmount} />
                  <span className="subtle">{variant.stockQuantity} tersedia</span>
                </div>
              </Card>
            ))}
          </div>
          <Card className="notice-card">
            <h2>Pesan melalui BFG</h2>
            <p>Pencatatan order Ready Stock belum ditetapkan. Hubungi BFG untuk konfirmasi pembelian.</p>
            <LinkButton href="/help">Hubungi BFG</LinkButton>
          </Card>
        </div>
      </div>
    </>
  );
}

export function ReadyStockDetail({ slug }: { slug: string }) {
  const { dataSource } = usePrototype();
  return (
    <div className="page ready-stock-page">
      {dataSource === "convex" ? (
        <ConnectedDetail slug={slug} />
      ) : (
        <EmptyState
          title="Buku tidak tersedia."
          description="Ready Stock belum terhubung ke sumber data."
          action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
        />
      )}
    </div>
  );
}
