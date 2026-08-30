"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { BookCover } from "@/components/book-cover";
import { ProductGallery, type ProductGalleryImage } from "@/components/product-gallery";
import { BFGSelect } from "@/components/bfg-select";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";
import { productErrorMessage } from "@/domain/prototype/errors";
import { orderReference } from "@/domain/prototype/order-reference";
import { useProduct } from "@/domain/prototype/store";
import type { Book } from "@/domain/prototype/types";

function DetailOrderForm({ catalogId, book }: { catalogId: string; book: Book }) {
  const { authState, sessionRole, submitOrder } = useProduct();
  const [variantId, setVariantId] = useState(book.variants[0]?.id || "");
  const [quantity, setQuantity] = useState("1");
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [message, setMessage] = useState("");
  const [orderId, setOrderId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const selected = book.variants.find((variant) => variant.id === variantId);

  if (authState === "authenticated" && sessionRole === "customer") {
    if (orderId) {
      return (
        <div className="catalog-member-note">
          <strong>Preordermu sudah masuk.</strong>
          <p>{message}</p>
          <LinkButton href={`/account/orders/${orderId}`} variant="secondary">
            Lihat pesanan
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
        const order = await submitOrder(catalogId, {
          customerName,
          customerEmail,
          items: [{ variantId: selected.id, quantity: Number(quantity) }],
        });
        setOrderId(order.id);
        setMessage(`Referensi pesanan ${orderReference(order)}.`);
      } catch (reason) {
        setMessage(productErrorMessage(reason, "Pesanan belum berhasil dibuat. Silakan coba lagi."));
      } finally {
        setPending(false);
      }
    }

    return (
      <form className="form-card" onSubmit={submit}>
        <Field label="Format">
          <BFGSelect value={variantId} onChange={(event) => setVariantId(event.target.value)}>
            {book.variants.map((variant) => (
              <option value={variant.id} key={variant.id}>
                {variant.format} · {variant.isbn} · IDR {variant.price.toLocaleString("id-ID")}
              </option>
            ))}
          </BFGSelect>
        </Field>
        <Field label="Jumlah">
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
            required
          />
        </Field>
        <Field label="Nama">
          <input
            className="input"
            value={customerName}
            onChange={(event) => setCustomerName(event.target.value)}
            required
          />
        </Field>
        <Field label="Email (opsional)">
          <input
            className="input"
            type="email"
            value={customerEmail}
            onChange={(event) => setCustomerEmail(event.target.value)}
          />
        </Field>
        {message ? (
          <p className="error-text" role="alert">
            {message}
          </p>
        ) : null}
        <Button type="submit" loading={pending} loadingLabel="Mencatat…" disabled={!selected}>
          Catat preorder
        </Button>
      </form>
    );
  }

  if (sessionRole === "admin" || sessionRole === "owner") {
    return (
      <div className="catalog-member-note">
        <p>Pesanan pelanggan dibuat melalui ruang kerja Admin.</p>
        <LinkButton href="/admin/orders" variant="secondary">
          Buka Pesanan Admin
        </LinkButton>
      </div>
    );
  }
  if (authState === "suspended")
    return <p className="subtle">Akunmu sedang ditangguhkan. Hubungi admin BFG untuk bantuan.</p>;
  return (
    <div className="catalog-member-note">
      <p>Masuk lewat Akun untuk mencatat preorder dan melihat perjalanannya.</p>
      <LinkButton href="/account" variant="secondary">
        Ke Akun
      </LinkButton>
    </div>
  );
}

export function SecretCatalogBookDetail() {
  const params = useParams<{ catalogId: string; bookId: string }>();
  const catalogId = String(params.catalogId);
  const bookId = String(params.bookId);
  const { dataSource, catalogLoading, unlockedCatalog: catalog } = useProduct();

  if (dataSource !== "convex") {
    return <EmptyState title="Detail buku belum tersedia" description="Katalog belum dapat dimuat saat ini." />;
  }
  if (catalogLoading) {
    return (
      <LoadingRegion label="Memuat detail buku">
        <SkeletonCard variant="book" />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!catalog || catalog.id !== catalogId) {
    return (
      <EmptyState
        title="Akses katalog diperlukan"
        description="Buka Secret Catalog dengan akses yang sah sebelum melihat detail buku ini."
        action={<LinkButton href="/catalog">Buka Secret Catalog</LinkButton>}
      />
    );
  }
  const book = catalog.books.find((candidate) => candidate.id === bookId);
  if (!book) {
    return (
      <EmptyState
        title="Buku tidak tersedia di katalog ini"
        description="Buku hanya dapat dibuka melalui Catalog yang memberikan aksesnya."
        action={<LinkButton href="/catalog">Kembali ke katalog</LinkButton>}
      />
    );
  }
  const gallery = (book.gallery || []).map((image): ProductGalleryImage => ({
    mediaId: image.mediaId,
    displayOrder: image.displayOrder,
    altText: image.altText,
    url: image.url,
  }));

  return (
    <div className="content-stack">
      <PageHeader
        eyebrow="Secret Catalog · Detail buku"
        title={book.title}
        description={[book.author, book.publisher].filter(Boolean).join(" · ") || book.publisher}
        actions={
          <LinkButton href="/catalog" variant="secondary">
            Kembali ke katalog
          </LinkButton>
        }
      />
      <div className="ready-stock-detail">
        <BookCover title={book.title} publisher={book.publisher} src={book.coverImageUrl || undefined} />
        <div className="content-stack">
          {book.description ? <p>{book.description}</p> : <p className="subtle">Deskripsi belum ditambahkan.</p>}
          {gallery.length ? <ProductGallery images={gallery} title={book.title} /> : null}
          {book.externalPreview ? (
            <LinkButton href={book.externalPreview.url} target="_blank" rel="noreferrer noopener" variant="secondary">
              {book.externalPreview.label} ↗
            </LinkButton>
          ) : null}
          <Card className="notice-card">
            <span className="card-kicker">Preorder Secret Catalog</span>
            <h2>Pilih format dan jumlah</h2>
            <p className="subtle">Harga yang tampil adalah harga jual IDR dari Catalog ini.</p>
            <DetailOrderForm catalogId={catalogId} book={book} />
          </Card>
        </div>
      </div>
    </div>
  );
}
