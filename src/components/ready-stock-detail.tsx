"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import { BookCover } from "@/components/book-cover";
import { ProductGallery, type ProductGalleryImage } from "@/components/product-gallery";
import {
  Button,
  Card,
  EmptyState,
  ErrorState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";
import { productErrorMessage } from "@/domain/prototype/errors";
import type { PublicReadyStockBook } from "@/lib/seo";

type ReadyStockBook = NonNullable<FunctionReturnType<typeof api.readyStockManual.getBySlug>>;

function ConnectedDetail({ slug, initialBook }: { slug: string; initialBook?: PublicReadyStockBook }) {
  const liveBook = useQuery(api.readyStockManual.getBySlug, { slug });
  const book = liveBook === undefined ? initialBook : liveBook;

  if (book === undefined) {
    return (
      <LoadingRegion label="Memuat detail Ready Stock">
        <SkeletonCard variant="book" />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!book) {
    return (
      <EmptyState
        title="Ready Stock tidak tersedia."
        description="Item ini tidak dipublikasikan atau stoknya sedang habis."
        action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
      />
    );
  }

  const gallery = book.gallery
    .filter((image) => Boolean(image.url))
    .map((image): ProductGalleryImage => ({
      mediaId: image.mediaId,
      url: image.url!,
      altText: image.altText,
      displayOrder: image.displayOrder,
    }));

  return (
    <>
      <PageHeader eyebrow="Ready Stock" title={book.title} description={`${book.format} · Foto asli stok BFG`} />
      <div className="ready-stock-detail">
        <BookCover
          title={book.title}
          publisher="Ready Stock BFG"
          format={book.format}
          src={book.coverUrl || undefined}
          alt={`Foto cover Ready Stock ${book.title}`}
        />
        <div className="content-stack">
          <div className="form-actions">
            <StatusBadge tone="positive">{book.availableQuantity} tersedia</StatusBadge>
            <span className="subtle">{book.format}</span>
          </div>

          <Card className="ready-stock-manual-price-card">
            <span className="card-kicker">Harga Ready Stock</span>
            <strong className="metric-money">
              <Money amount={book.priceAmount} />
            </strong>
            <span className="subtle">Harga khusus untuk stok yang sedang tersedia.</span>
          </Card>

          {gallery.length ? <ProductGallery images={gallery} title={book.title} /> : null}

          <Card className="notice-card">
            <h2>Checkout langsung</h2>
            <p>
              Ready Stock tidak masuk keranjang. Setelah checkout, stok langsung diamankan dan tagihan muncul di akunmu.
            </p>
            <ReadyStockOrderAction book={book as ReadyStockBook} />
          </Card>
        </div>
      </div>
    </>
  );
}

export function ReadyStockOrderAction({ book }: { book: ReadyStockBook }) {
  const { authState, retryAuth, sessionRole } = useProduct();
  const checkout = useMutation(api.readyStockManual.checkout);
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (authState === "loading" || authState === "convex-loading" || authState === "provisioning") {
    return <p className="subtle">Menyiapkan akun BFG…</p>;
  }
  if (authState === "convex-error" || authState === "network-error") {
    return (
      <ErrorState
        title="Sesi BFG belum siap."
        description="Kami belum dapat mengonfirmasi akunmu. Coba lagi sebentar lagi."
        action={<Button onClick={retryAuth}>Coba lagi</Button>}
      />
    );
  }
  if (authState === "admission-required") {
    return (
      <div className="catalog-member-note">
        <p>Akunmu belum aktif sebagai Blessfriend.</p>
        <LinkButton href="/join" variant="secondary">
          Gabung Blessfriends
        </LinkButton>
      </div>
    );
  }
  if (authState === "removed") {
    return (
      <div className="catalog-member-note">
        <p>Membership BFG-mu telah dihapus.</p>
        <LinkButton href="/join" variant="secondary">
          Gabung Blessfriends
        </LinkButton>
      </div>
    );
  }
  if (sessionRole === "admin" || sessionRole === "owner") {
    return (
      <div className="catalog-member-note">
        <p>Checkout Ready Stock dilakukan dari akun customer.</p>
        <LinkButton href="/admin/ready-stock" variant="secondary">
          Buka Ready Stock Admin
        </LinkButton>
      </div>
    );
  }
  if (authState === "suspended") {
    return <p className="subtle">Akunmu sedang ditangguhkan. Hubungi admin BFG untuk bantuan.</p>;
  }
  if (authState === "signed-out") {
    return (
      <div className="form-actions">
        <LinkButton href="/account" variant="secondary">
          Masuk untuk checkout
        </LinkButton>
      </div>
    );
  }
  if (!(authState === "authenticated" && sessionRole === "customer")) {
    return null;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pending) return;
    const qty = Number(quantity);
    if (!Number.isSafeInteger(qty) || qty < 1 || qty > book.availableQuantity) {
      setMessage("Jumlah Ready Stock tidak valid.");
      return;
    }
    setMessage("");
    setPending(true);
    try {
      const result = await checkout({ listingId: book.listingId, quantity: qty });
      setInvoiceId(result.invoiceId);
      setMessage("Checkout berhasil. Stok sudah diamankan dan tagihan siap dibayar.");
    } catch (error) {
      setMessage(productErrorMessage(error, "Checkout belum berhasil. Silakan coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <Field label="Jumlah" hint={`Maksimum ${book.availableQuantity}`}>
        <input
          className="input"
          type="number"
          min="1"
          max={book.availableQuantity}
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" loading={pending} loadingLabel="Mengamankan stok…">
          Checkout sekarang
        </Button>
        {invoiceId ? (
          <LinkButton href={`/account/invoices/${invoiceId}`} variant="secondary">
            Buka tagihan
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

export function ReadyStockDetail({ slug, initialBook }: { slug: string; initialBook?: PublicReadyStockBook }) {
  const { dataSource } = useProduct();
  return (
    <div className="page ready-stock-page">
      {dataSource === "convex" ? (
        <ConnectedDetail slug={slug} initialBook={initialBook} />
      ) : (
        <EmptyState
          title="Ready Stock tidak tersedia."
          description="Detail Ready Stock belum dapat ditampilkan saat ini."
          action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
        />
      )}
    </div>
  );
}
