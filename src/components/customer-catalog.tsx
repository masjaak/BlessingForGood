"use client";

import { useMemo, useState } from "react";
import { BrandMascot } from "@/components/brand";
import { BookCover } from "@/components/book-cover";
import { productErrorMessage } from "@/domain/prototype/errors";
import { orderReference } from "@/domain/prototype/order-reference";
import { formatIdr } from "@/domain/prototype/logic";
import { roleCanAccess } from "@/domain/prototype/session";
import { useProduct } from "@/domain/prototype/store";
import type { Order } from "@/domain/prototype/types";
import {
  Button,
  Card,
  EmptyState,
  Field,
  IconButton,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
} from "@/components/ui";

export function CustomerCatalog() {
  const { unlockedCatalog: catalog, catalogLoading, unlockCatalog, submitOrder, sessionRole } = useProduct();
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerName, setCustomerName] = useState("");
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedItems = useMemo(() => {
    if (!catalog) return [];
    return catalog.books.flatMap((book) => {
      const variantId =
        selectedVariants[book.id] || book.variants.find((variant) => variant.availability === "available")?.id;
      const quantity = variantId ? quantities[variantId] || 0 : 0;
      return variantId && quantity > 0 ? [{ variantId, quantity }] : [];
    });
  }, [catalog, quantities, selectedVariants]);

  const total = catalog
    ? selectedItems.reduce((sum, item) => {
        const variant = catalog.books
          .flatMap((book) => book.variants)
          .find((candidate) => candidate.id === item.variantId);
        return sum + (variant?.price || 0) * item.quantity;
      }, 0)
    : 0;

  async function handleUnlock(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAccessError("");
    setIsUnlocking(true);
    try {
      const unlocked = await unlockCatalog(accessCode);
      if (!unlocked) setAccessError("Kode belum cocok, katalog sudah ditutup, atau akses belum tersedia.");
    } catch (error) {
      setAccessError(productErrorMessage(error, "Katalog belum dapat dibuka"));
    } finally {
      setIsUnlocking(false);
    }
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!catalog) return;
    setSubmitError("");
    setIsSubmitting(true);
    try {
      const order = await submitOrder(catalog.id, { customerName, customerEmail, items: selectedItems });
      setSubmittedOrder(order);
    } catch (error) {
      setSubmitError(productErrorMessage(error, "Pesanan belum dapat dicatat"));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submittedOrder) {
    const whatsappText = encodeURIComponent(
      `Halo, saya ${submittedOrder.customerName}. Pesanan ${orderReference(submittedOrder)} sudah tercatat.`,
    );
    return (
      <div className="content-stack">
        <PageHeader
          eyebrow="Pesanan tercatat"
          title="Preordermu sudah masuk."
          description="Detail pesanan tersimpan di akunmu. Lanjutkan ke WhatsApp bila kamu perlu menghubungi admin."
        />
        <Card className="success-banner success-card">
          <BrandMascot variant="success" className="success-mascot" />
          <strong>{orderReference(submittedOrder)}</strong>
          <p>
            Total {formatIdr(submittedOrder.total)} · {submittedOrder.items.length} pilihan buku
          </p>
          <div className="actions">
            <LinkButton variant="primary" href={`https://wa.me/?text=${whatsappText}`} target="_blank" rel="noreferrer">
              Lanjut ke WhatsApp ↗
            </LinkButton>
            <LinkButton href="/account/orders" variant="secondary">
              Lihat status pesanan
            </LinkButton>
          </div>
        </Card>
      </div>
    );
  }

  if (!catalog && catalogLoading) {
    return (
      <LoadingRegion label="Memuat katalog">
        <SkeletonCard variant="book" />
        <SkeletonCard variant="book" />
      </LoadingRegion>
    );
  }

  if (!catalog) {
    return (
      <div className="catalog-access">
        <Card frame="form" className="form-card">
          <PageHeader
            eyebrow="Secret Catalog"
            title="Buka katalog privatmu."
            description="Masukkan kode akses yang dibagikan admin BFG. Kode ini langsung membuka katalog yang sesuai."
          />
          <form onSubmit={handleUnlock} className="form-card">
            <Field label="Kode akses katalog" hint="Gunakan kode yang dibagikan oleh BFG.">
              <input
                className="input"
                value={accessCode}
                onChange={(event) => setAccessCode(event.target.value)}
                autoComplete="off"
                required
              />
            </Field>
            {accessError ? (
              <p className="error-text" role="alert">
                {accessError}
              </p>
            ) : null}
            <Button type="submit" loading={isUnlocking} loadingLabel="Memeriksa…">
              Buka katalog
            </Button>
          </form>
        </Card>
        <Card className="accent-card">
          <BrandMascot className="catalog-access-mascot" />
          <span className="card-kicker">Katalog privat</span>
          <h2>Kode akses ada di undanganmu.</h2>
          <p>Jika belum memiliki kode atau katalog tidak terbuka, hubungi admin BFG untuk bantuan.</p>
          <LinkButton href="/help" variant="tertiary">
            Buka bantuan →
          </LinkButton>
        </Card>
      </div>
    );
  }

  if (catalog.books.length === 0) {
    return (
      <div className="content-stack">
        <PageHeader
          eyebrow="Katalog terbuka"
          title={catalog.name}
          description="Katalog ini sudah terbuka, tetapi belum memiliki buku yang dapat dipilih."
        />
        <EmptyState
          title="Belum ada buku di katalog"
          description="Admin BFG perlu menambahkan judul dan varian nyata sebelum preorder dapat dicatat."
          action={
            <LinkButton href="/help" variant="secondary">
              Buka bantuan
            </LinkButton>
          }
        />
      </div>
    );
  }

  return (
    <div className="content-stack">
      <PageHeader
        eyebrow="Katalog terbuka"
        title={catalog.name}
        description={
          catalog.closingAt
            ? `Terbuka sampai ${new Intl.DateTimeFormat("id-ID", { dateStyle: "medium" }).format(new Date(catalog.closingAt))}.`
            : "Katalog ini sedang terbuka."
        }
      />
      <div className="catalog-grid">
        <div className="book-list">
          {catalog.books.map((book) => {
            const selectedVariantId = selectedVariants[book.id] || book.variants[0]?.id;
            const selectedQuantity = selectedVariantId ? quantities[selectedVariantId] || 0 : 0;
            const selectedFormat = book.variants.find((variant) => variant.id === selectedVariantId)?.format;
            return (
              <Card frame="list" className="book-card" key={book.id}>
                <div className="book-card-layout">
                  <BookCover
                    title={book.title}
                    publisher={book.publisher}
                    format={selectedFormat}
                    presentation={book.coverPresentation}
                    src={book.coverImageUrl || undefined}
                  />
                  <div className="book-card-details">
                    <div className="book-meta">
                      <div>
                        <span className="card-kicker">{book.publisher}</span>
                        <h2>{book.title}</h2>
                      </div>
                      <span className="subtle">Pilih satu format</span>
                    </div>
                    <div className="variant-list" role="radiogroup" aria-label={`Format untuk ${book.title}`}>
                      {book.variants.map((variant) => (
                        <label className="variant-option" key={variant.id}>
                          <input
                            type="radio"
                            name={book.id}
                            value={variant.id}
                            checked={selectedVariantId === variant.id}
                            onChange={() => setSelectedVariants((current) => ({ ...current, [book.id]: variant.id }))}
                            disabled={variant.availability !== "available"}
                          />
                          <strong>{variant.format}</strong>
                          <span>
                            <Money amount={variant.price} />
                          </span>
                          <small>{variant.isbn}</small>
                        </label>
                      ))}
                    </div>
                    <div className="quantity-row">
                      <span>Jumlah</span>
                      <div className="quantity-control">
                        <IconButton
                          variant="secondary"
                          aria-label={`Kurangi jumlah ${book.title}`}
                          disabled={!selectedVariantId || selectedQuantity === 0}
                          onClick={() =>
                            selectedVariantId &&
                            setQuantities((current) => ({
                              ...current,
                              [selectedVariantId]: Math.max(0, selectedQuantity - 1),
                            }))
                          }
                        >
                          −
                        </IconButton>
                        <output aria-label={`Jumlah ${book.title}`}>{selectedQuantity}</output>
                        <IconButton
                          variant="secondary"
                          aria-label={`Tambah jumlah ${book.title}`}
                          onClick={() =>
                            selectedVariantId &&
                            setQuantities((current) => ({ ...current, [selectedVariantId]: selectedQuantity + 1 }))
                          }
                        >
                          +
                        </IconButton>
                      </div>
                    </div>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
        <Card frame="detail" className="order-summary">
          <div>
            <span className="card-kicker">Tinjau preorder</span>
            <h2>Pastikan pilihanmu.</h2>
          </div>
          <div className="summary-line">
            <span>Jumlah buku</span>
            <strong>{selectedItems.reduce((sum, item) => sum + item.quantity, 0)}</strong>
          </div>
          <div className="summary-total">
            <span>Total</span>
            <Money amount={total} />
          </div>
          {roleCanAccess(sessionRole, "customer") ? (
            <form onSubmit={handleSubmit} className="form-card">
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
              {submitError ? (
                <p className="error-text" role="alert">
                  {submitError}
                </p>
              ) : null}
              <Button
                type="submit"
                loading={isSubmitting}
                loadingLabel="Mencatat…"
                disabled={selectedItems.length === 0}
              >
                Catat preorder
              </Button>
            </form>
          ) : (
            <div className="catalog-member-note">
              <span className="card-kicker">Sudah menemukan bukunya?</span>
              <p>Masuk lewat Akun untuk mencatat preorder dan melihat perjalanannya.</p>
              <LinkButton href="/account">Ke Akun</LinkButton>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
