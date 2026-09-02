"use client";

import { useUser } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { formatBfgCalendarDate } from "@/lib/calendar-date";
import { BrandMascot } from "@/components/brand";
import { BookCover } from "@/components/book-cover";
import { BFGSelect } from "@/components/bfg-select";
import { productErrorMessage } from "@/domain/prototype/errors";
import { orderReference } from "@/domain/prototype/order-reference";
import { catalogDeadlineLabel, formatIdr } from "@/domain/prototype/logic";
import { formatCargoEta } from "@/domain/prototype/operations";
import type { ProductContextValue } from "@/domain/prototype/context";
import { useProduct } from "@/domain/prototype/store";
import type { Order } from "@/domain/prototype/types";
import { matchesCustomerCatalogBook } from "@/lib/catalog-discovery";
import { usePreorderCustomerName } from "@/lib/preorder-customer-name";
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
  StatusBadge,
} from "@/components/ui";

function CatalogHeader({ catalog }: { catalog: NonNullable<ReturnType<typeof useProduct>["unlockedCatalog"]> }) {
  const availableBooks = catalog.titleCount ?? catalog.books.length;
  return (
    <header className="catalog-header" aria-labelledby="catalog-title">
      <div className="catalog-header-main">
        <span className="eyebrow">Secret Catalog</span>
        <h1 id="catalog-title">{catalog.name}</h1>
        <StatusBadge tone={catalog.status === "open" ? "positive" : "neutral"}>
          {catalogDeadlineLabel(catalog.closingAt, catalog.status)}
        </StatusBadge>
      </div>
      <dl className="catalog-header-metrics">
        <div>
          <dt>Close Order</dt>
          <dd>{catalog.closingAt ? formatBfgCalendarDate(catalog.closingAt) : "Belum ditentukan"}</dd>
        </div>
        <div>
          <dt>Est. Arrival</dt>
          <dd>{formatCargoEta(catalog.estimatedArrivalMonth)}</dd>
        </div>
        <div>
          <dt>Total tersedia</dt>
          <dd>{availableBooks} buku tersedia</dd>
        </div>
      </dl>
    </header>
  );
}

export function CustomerCatalog() {
  const product = useProduct();
  return <CustomerCatalogView key={product.unlockedCatalog?.id ?? "locked"} product={product} />;
}

function CustomerCatalogView({ product }: { product: ProductContextValue }) {
  const {
    unlockedCatalog: catalog,
    catalogLoading,
    unlockCatalog,
    submitOrder,
    sessionRole,
    authState,
    customerProfileDisplayName,
    catalogOptions = [],
    selectCatalog = () => undefined,
  } = product;
  const { isLoaded: clerkUserLoaded, user } = useUser();
  const [accessCode, setAccessCode] = useState("");
  const [accessError, setAccessError] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [publisherFilter, setPublisherFilter] = useState("");
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [customerEmail, setCustomerEmail] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submittedOrder, setSubmittedOrder] = useState<Order | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { customerName, onCustomerNameChange } = usePreorderCustomerName({
    enabled: authState === "authenticated" && sessionRole === "customer",
    profileLoaded: product.dataSource !== "convex" || customerProfileDisplayName !== undefined,
    bfgDisplayName: customerProfileDisplayName,
    clerkLoaded: clerkUserLoaded,
    clerkFullName: user?.fullName,
    clerkUsername: user?.username,
  });

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

  const publishers = useMemo(
    () =>
      catalog
        ? Array.from(new Set(catalog.books.map((book) => book.publisher))).sort((left, right) =>
            left.localeCompare(right),
          )
        : [],
    [catalog],
  );
  const filteredBooks = useMemo(
    () =>
      catalog?.books.filter(
        (book) =>
          matchesCustomerCatalogBook(book, searchQuery) && (!publisherFilter || book.publisher === publisherFilter),
      ) || [],
    [catalog, publisherFilter, searchQuery],
  );
  const hasFilters = Boolean(searchQuery.trim() || publisherFilter);

  function resetDiscovery() {
    setSearchQuery("");
    setPublisherFilter("");
  }

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
            description="Masukkan satu kode akses yang dibagikan admin BFG. Kode ini membuka Secret Catalog yang sedang tersedia."
          />
          <form onSubmit={handleUnlock} className="form-card">
            <Field label="Kode akses Secret Catalog" hint="Gunakan satu kode yang dibagikan oleh BFG.">
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
        <CatalogHeader catalog={catalog} />
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
      <CatalogHeader catalog={catalog} />
      {catalogOptions.length > 1 ? (
        <Card frame="list" className="catalog-session-switcher">
          <div>
            <span className="card-kicker">Secret Catalog tersedia</span>
            <h2>Pilih katalog yang ingin dijelajahi.</h2>
          </div>
          <BFGSelect
            aria-label="Katalog dalam periode"
            value={catalog.id}
            onChange={(event) => selectCatalog(event.target.value)}
          >
            {catalogOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </BFGSelect>
        </Card>
      ) : null}
      <section className="catalog-discovery" aria-label="Cari buku di katalog">
        <div className="catalog-discovery-controls">
          <Field label="Cari buku">
            <input
              className="input"
              type="search"
              aria-label="Cari judul atau ISBN"
              placeholder="Cari judul atau ISBN"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
            />
          </Field>
          <Field label="Publisher">
            <BFGSelect
              aria-label="Publisher"
              value={publisherFilter}
              onChange={(event) => setPublisherFilter(event.target.value)}
            >
              <option value="">Semua Publisher</option>
              {publishers.map((publisher) => (
                <option key={publisher} value={publisher}>
                  {publisher}
                </option>
              ))}
            </BFGSelect>
          </Field>
          {hasFilters ? (
            <Button type="button" variant="tertiary" onClick={resetDiscovery}>
              Reset pencarian
            </Button>
          ) : null}
        </div>
        <p className="catalog-result-count" role="status" aria-live="polite">
          {hasFilters
            ? `${filteredBooks.length} buku ditemukan`
            : `${catalog.titleCount ?? catalog.books.length} buku tersedia`}
        </p>
      </section>
      <div className="catalog-grid">
        <div className="book-list">
          {filteredBooks.length ? (
            filteredBooks.map((book) => {
              const selectedVariantId = selectedVariants[book.id] || book.variants[0]?.id;
              const selectedQuantity = selectedVariantId ? quantities[selectedVariantId] || 0 : 0;
              const selectedVariant = book.variants.find((variant) => variant.id === selectedVariantId);
              const selectedFormat = selectedVariant?.format;
              const hasMultipleVariants = book.variants.length > 1;
              return (
                <Card frame="list" className="book-card" key={book.id}>
                  <div className="book-card-layout">
                    <BookCover
                      title={book.title}
                      publisher={book.publisher}
                      format={selectedFormat}
                      src={book.coverImageUrl || undefined}
                    />
                    <div className="book-card-details">
                      <div className="book-card-header">
                        <div className="book-meta">
                          <div className="book-card-heading">
                            <h2>{book.title}</h2>
                            <p className="book-card-isbn">
                              ISBN: {book.variants.map((variant) => variant.isbn).join(" · ")}
                            </p>
                            <LinkButton
                              href={`/catalog/${catalog.id}/${book.id}`}
                              variant="secondary"
                              size="compact"
                              className="book-detail-action"
                            >
                              Buka detail buku
                            </LinkButton>
                          </div>
                          {selectedVariant ? (
                            <div className="book-card-price">
                              <span className="book-card-price-label">Harga</span>
                              <Money amount={selectedVariant.price} />
                            </div>
                          ) : null}
                        </div>
                        {hasMultipleVariants ? (
                          <div className="book-format-selection">
                            <span className="book-format-label">Pilih format</span>
                            <div className="variant-list" role="radiogroup" aria-label={`Format untuk ${book.title}`}>
                              {book.variants.map((variant) => (
                                <label className="variant-option" key={variant.id}>
                                  <input
                                    type="radio"
                                    name={book.id}
                                    value={variant.id}
                                    checked={selectedVariantId === variant.id}
                                    onChange={() =>
                                      setSelectedVariants((current) => ({ ...current, [book.id]: variant.id }))
                                    }
                                    disabled={variant.availability !== "available"}
                                  />
                                  <span className="variant-option-format">{variant.format}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                        ) : (
                          <div
                            className="book-format-summary"
                            aria-label={`Format ${selectedFormat || "tidak tersedia"}`}
                          >
                            <span className="book-format-label">Format</span>
                            <strong className="book-format-value">{selectedFormat || "—"}</strong>
                          </div>
                        )}
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
            })
          ) : (
            <EmptyState
              title="Tidak ada buku yang cocok."
              description="Coba kata kunci lain atau hapus filter Publisher."
              mascotVariant={false}
              action={
                <Button type="button" variant="secondary" onClick={resetDiscovery}>
                  Reset pencarian
                </Button>
              }
            />
          )}
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
          {authState === "authenticated" && sessionRole === "customer" ? (
            <form onSubmit={handleSubmit} className="form-card">
              <Field label="Nama">
                <input
                  className="input"
                  value={customerName}
                  onChange={(event) => onCustomerNameChange(event.target.value)}
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
          ) : sessionRole === "admin" || sessionRole === "owner" ? (
            <div className="catalog-member-note">
              <span className="card-kicker">Pesanan berbantuan</span>
              <p>Pesanan pelanggan dibuat melalui ruang kerja Admin.</p>
              <LinkButton href="/admin/orders">Buka Pesanan Admin</LinkButton>
            </div>
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
