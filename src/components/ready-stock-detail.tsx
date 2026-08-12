"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { BookCover } from "@/components/book-cover";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";

type ReadyStockBook = NonNullable<FunctionReturnType<typeof api.readyStock.getBySlug>>;

function ConnectedDetail({ slug }: { slug: string }) {
  const book = useQuery(api.readyStock.getBySlug, { slug });
  if (book === undefined) {
    return (
      <LoadingRegion label="Memuat detail buku">
        <SkeletonCard variant="book" />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
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
            <p>Pemesanan Ready Stock dicatat ke akun BFG dan dilanjutkan melalui invoice serta konfirmasi admin.</p>
            <ReadyStockOrderAction book={book} />
          </Card>
        </div>
      </div>
    </>
  );
}

function ReadyStockOrderAction({ book }: { book: ReadyStockBook }) {
  const { authState, sessionRole } = useProduct();
  const createOrder = useMutation(api.orders.createReadyStock);
  const [variantId, setVariantId] = useState(book.variants[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = book.variants.find((variant) => variant.id === variantId);

  if (authState !== "authenticated" || sessionRole !== "customer") {
    return (
      <div className="form-actions">
        <LinkButton href="/account" variant="secondary">
          Masuk untuk memesan
        </LinkButton>
      </div>
    );
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!selected || pending) return;
    setMessage("");
    setPending(true);
    try {
      const order = await createOrder({ variantId: selected.id, quantity: Number(quantity) });
      setOrderId(order.orderId);
      setMessage("Ready Stock berhasil dicatat dan stok sudah diamankan.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Stok belum dapat dipesan.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <Field label="Format">
        <select className="select" value={variantId} onChange={(event) => setVariantId(event.target.value)}>
          {book.variants.map((variant) => (
            <option value={variant.id} key={variant.id}>
              {variant.format} · {variant.stockQuantity} tersedia
            </option>
          ))}
        </select>
      </Field>
      <Field label="Jumlah" hint={selected ? `Maksimum ${selected.stockQuantity}` : undefined}>
        <input
          className="input"
          type="number"
          min="1"
          max={selected?.stockQuantity}
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" pending={pending} pendingLabel="Mengamankan stok…">
          Pesan Ready Stock
        </Button>
        {orderId ? (
          <LinkButton href={`/account/orders/${orderId}`} variant="secondary">
            Lihat pesanan
          </LinkButton>
        ) : null}
      </div>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}

export function ReadyStockDetail({ slug }: { slug: string }) {
  const { dataSource } = useProduct();
  return (
    <div className="page ready-stock-page">
      {dataSource === "convex" ? (
        <ConnectedDetail slug={slug} />
      ) : (
        <EmptyState
          title="Buku tidak tersedia."
          description="Detail Ready Stock belum dapat ditampilkan saat ini."
          action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
        />
      )}
    </div>
  );
}
