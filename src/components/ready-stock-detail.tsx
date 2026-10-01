"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useRef, useState } from "react";
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

type ReadyStockBook = NonNullable<FunctionReturnType<typeof api.readyStockListings.getBySlug>>;

function ConnectedDetail({ slug, initialBook }: { slug: string; initialBook?: PublicReadyStockBook }) {
  const liveBook = useQuery(api.readyStockListings.getBySlug, { slug });
  const [checkoutInvoiceId, setCheckoutInvoiceId] = useState<string | null>(null);
  const book = liveBook === undefined ? initialBook : liveBook;
  if (checkoutInvoiceId) {
    return (
      <Card className="notice-card">
        <p role="status">Checkout berhasil. Tagihan sudah dibuat dan stokmu sudah diamankan.</p>
        <div className="form-actions">
          <LinkButton href={`/account/invoices/${checkoutInvoiceId}`}>Buka tagihan</LinkButton>
          <LinkButton href="/account/orders" variant="secondary">
            Pantau pesanan
          </LinkButton>
        </div>
      </Card>
    );
  }
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
        description="Ready Stock ini tidak dipublikasikan atau stoknya sedang kosong."
        action={<LinkButton href="/ready-stock">Kembali ke Ready Stock</LinkButton>}
      />
    );

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
      <PageHeader
        eyebrow="Ready Stock · Real stock"
        title={book.title}
        description={`${book.format} · ${book.availableQuantity} tersedia`}
      />
      <div className="ready-stock-detail ready-stock-standalone-detail">
        <BookCover
          title={book.title}
          publisher="Blessing For Good"
          format={book.format}
          src={book.coverImageUrl || undefined}
          alt={`Foto Ready Stock ${book.title}`}
        />
        <div className="content-stack">
          <div className="form-actions">
            <StatusBadge tone="positive">{book.availableQuantity} tersedia</StatusBadge>
            <span className="subtle">{book.format}</span>
          </div>
          <strong className="ready-stock-detail-price">
            <Money amount={book.priceAmount} />
          </strong>
          {book.description ? <p className="ready-stock-product-description">{book.description}</p> : null}
          {gallery.length ? <ProductGallery images={gallery} title={book.title} /> : null}
          <Card className="notice-card">
            <span className="card-kicker">Checkout langsung</span>
            <h2>Pesan Ready Stock</h2>
            <p>Pesanan langsung dibuat menjadi tagihan. Pilih jumlah lalu lanjutkan pembayaran.</p>
            <ReadyStockCheckoutAction book={book} onCheckout={setCheckoutInvoiceId} />
          </Card>
        </div>
      </div>
    </>
  );
}

export function ReadyStockCheckoutAction({
  book,
  onCheckout,
}: {
  book: ReadyStockBook;
  onCheckout?: (invoiceId: string) => void;
}) {
  const { authState, retryAuth, sessionRole } = useProduct();
  const checkout = useMutation(api.readyStockOrders.checkout);
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const requestKey = useRef<string | null>(null);

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
    return <p className="subtle">Akun customer aktif diperlukan untuk checkout Ready Stock.</p>;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (pendingRef.current) return;
    pendingRef.current = true;
    requestKey.current ??= crypto.randomUUID();
    setMessage("");
    setPending(true);
    try {
      const result = await checkout({
        listingId: book.listingId,
        quantity: Number(quantity),
        requestKey: requestKey.current,
      });
      setInvoiceId(String(result.invoiceId));
      onCheckout?.(String(result.invoiceId));
      setMessage("Checkout berhasil. Tagihan sudah dibuat dan stokmu sudah diamankan.");
    } catch (error) {
      const raw = String(error);
      setMessage(
        raw.includes("Tambahkan alamat pengiriman")
          ? "Tambahkan alamat pengiriman di Akun sebelum checkout Ready Stock."
          : productErrorMessage(error, "Checkout belum berhasil. Silakan coba lagi."),
      );
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  }

  if (invoiceId) {
    return (
      <div className="content-stack">
        <p className="success-banner" role="status">
          {message}
        </p>
        <div className="form-actions">
          <LinkButton href={`/account/invoices/${invoiceId}`}>Buka tagihan</LinkButton>
          <LinkButton href="/account/orders" variant="secondary">
            Pantau pesanan
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <form className="form-card ready-stock-direct-checkout" onSubmit={submit}>
      <div className="summary-line">
        <span>Harga</span>
        <Money amount={book.priceAmount} />
      </div>
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
      {message ? (
        <p className="error-text" role="alert">
          {message}
        </p>
      ) : null}
      <Button type="submit" loading={pending} loadingLabel="Membuat tagihan…">
        Checkout sekarang
      </Button>
      <p className="subtle">
        Alamat pengiriman diambil dari alamat utama akunmu. Stok langsung direservasi saat checkout berhasil.
      </p>
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
        <EmptyState title="Buku tidak tersedia." description="Ready Stock belum dapat dimuat." />
      )}
    </div>
  );
}
