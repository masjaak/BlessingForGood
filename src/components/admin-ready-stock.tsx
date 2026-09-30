"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { BFGSelect } from "@/components/bfg-select";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { ProductGallery } from "@/components/product-gallery";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { BOOK_FORMATS, type BookFormat } from "@/domain/prototype/types";
import { uploadBfgFile, BfgUploadError } from "@/lib/upload-file";

type ListingStatus = "draft" | "published" | "archived";
type ReadyStage =
  | "waiting_payment"
  | "verifying_payment"
  | "paid"
  | "packing"
  | "shipping"
  | "delivered"
  | "cancelled";

const listingStatusLabel: Record<ListingStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
};

const orderStageLabel: Record<ReadyStage, string> = {
  waiting_payment: "Blessy menunggu pembayaran",
  verifying_payment: "Blessy memverifikasi pembayaran",
  paid: "Pembayaran berhasil",
  packing: "Paket sedang dikemas Blessy",
  shipping: "Paket sedang diantar Blessy",
  delivered: "Paket sampai",
  cancelled: "Dibatalkan",
};

function uploadFailure(label: string, reason: unknown) {
  if (reason instanceof BfgUploadError && reason.code === "UPLOAD_RATE_LIMITED") {
    return reason.retryAfterSeconds
      ? `${label} dibatasi sementara. Coba lagi dalam ${reason.retryAfterSeconds} detik.`
      : `${label} dibatasi sementara. Coba lagi beberapa saat lagi.`;
  }
  return `${label} belum berhasil. Coba lagi.`;
}

function ReadyStockListingEditor({
  listingId,
  onClose,
}: {
  listingId: Id<"readyStockListings">;
  onClose: () => void;
}) {
  const listing = useQuery(api.readyStockListings.getForAdmin, { listingId });
  const update = useMutation(api.readyStockListings.update);
  const attachCover = useAction(api.readyStockListings.attachCover);
  const attachGallery = useAction(api.readyStockListings.attachGalleryImage);
  const removeGallery = useMutation(api.readyStockListings.removeGalleryImage);
  const moveGallery = useMutation(api.readyStockListings.moveGalleryImage);
  const { getToken, sessionClaims } = useAuth();

  const [title, setTitle] = useState<string | null>(null);
  const [price, setPrice] = useState<string | null>(null);
  const [format, setFormat] = useState<BookFormat | null>(null);
  const [quantity, setQuantity] = useState<string | null>(null);
  const [status, setStatus] = useState<ListingStatus | null>(null);
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverError, setCoverError] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryError, setGalleryError] = useState("");

  if (listing === undefined) {
    return (
      <LoadingRegion label="Memuat editor Ready Stock">
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!listing) {
    return (
      <EmptyState
        title="Ready Stock tidak ditemukan"
        description="Item ini mungkin sudah tidak tersedia."
        action={<Button onClick={onClose}>Tutup</Button>}
      />
    );
  }

  const currentTitle = title ?? listing.title;
  const currentPrice = price ?? String(listing.priceAmount);
  const currentFormat = format ?? listing.format;
  const currentQuantity = quantity ?? String(listing.quantity);
  const currentStatus = status ?? listing.status;

  async function saveDetails() {
    setPending("details");
    setMessage("");
    setError("");
    try {
      await update({
        listingId,
        title: currentTitle,
        priceAmount: Number(currentPrice),
        format: currentFormat,
        quantity: Number(currentQuantity),
        status: currentStatus,
      });
      setTitle(null);
      setPrice(null);
      setFormat(null);
      setQuantity(null);
      setStatus(null);
      setMessage("Ready Stock berhasil diperbarui.");
    } catch (reason) {
      setError(String(reason).includes("Cover wajib") ? "Upload cover sebelum menerbitkan Ready Stock." : "Data belum berhasil disimpan.");
    } finally {
      setPending(null);
    }
  }

  async function saveCover() {
    if (!coverFile) return;
    setPending("cover");
    setCoverError("");
    setMessage("");
    try {
      const validation = validateCoverFile(coverFile);
      if (validation) {
        setCoverError(validation);
        return;
      }
      const storageId = await uploadBfgFile(coverFile, "book-cover", getToken, sessionClaims);
      await attachCover({
        listingId,
        storageId,
        fileName: coverFile.name,
        mimeType: coverFile.type,
      });
      setCoverFile(null);
      setMessage("Cover Ready Stock tersimpan.");
    } catch (reason) {
      setCoverError(uploadFailure("Upload cover", reason));
    } finally {
      setPending(null);
    }
  }

  async function saveGallery() {
    if (!galleryFile) return;
    setPending("gallery");
    setGalleryError("");
    setMessage("");
    try {
      const validation = validateCoverFile(galleryFile);
      if (validation) {
        setGalleryError(validation.replace("Cover", "Gambar isi"));
        return;
      }
      const storageId = await uploadBfgFile(galleryFile, "book-gallery", getToken, sessionClaims);
      await attachGallery({
        listingId,
        storageId,
        fileName: galleryFile.name,
        mimeType: galleryFile.type,
        altText: listing.title,
      });
      setGalleryFile(null);
      setMessage("Gambar isi Ready Stock tersimpan.");
    } catch (reason) {
      setGalleryError(uploadFailure("Upload gambar isi", reason));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="admin-ready-stock-editor">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Kelola etalase</span>
          <h2>{listing.title}</h2>
          <p className="subtle">Data ini berdiri sendiri dan tidak mengubah Master Buku.</p>
        </div>
        <Button type="button" variant="tertiary" onClick={onClose}>
          Tutup editor
        </Button>
      </div>

      <div className="form-grid admin-ready-stock-editor-fields">
        <Field label="Judul">
          <input className="input" value={currentTitle} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Harga">
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={currentPrice}
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
        <Field label="Format">
          <BFGSelect value={currentFormat} onChange={(event) => setFormat(event.target.value as BookFormat)}>
            {BOOK_FORMATS.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </BFGSelect>
        </Field>
        <Field label="Qty tersedia" hint={`${listing.reservedQuantity} sedang direservasi`}>
          <input
            className="input"
            type="number"
            min={listing.reservedQuantity}
            step="1"
            value={currentQuantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
        <Field label="Status etalase">
          <BFGSelect value={currentStatus} onChange={(event) => setStatus(event.target.value as ListingStatus)}>
            <option value="draft">Draf</option>
            <option value="published">Terbit</option>
            <option value="archived">Diarsipkan</option>
          </BFGSelect>
        </Field>
      </div>

      <div className="form-actions">
        <Button
          type="button"
          loading={pending === "details"}
          loadingLabel="Menyimpan…"
          disabled={pending !== null}
          onClick={() => void saveDetails()}
        >
          Simpan data
        </Button>
        {listing.status === "published" ? (
          <LinkButton href={`/ready-stock/${listing.slug}`} variant="secondary">
            Lihat etalase
          </LinkButton>
        ) : null}
      </div>

      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <div className="admin-ready-stock-media-grid">
        <div className="admin-ready-stock-media-frame">
          <CoverUploadField
            currentSrc={listing.coverImageUrl || undefined}
            error={coverError}
            file={coverFile}
            format={listing.format}
            loading={pending === "cover"}
            onFileChange={(file) => {
              setCoverFile(file);
              setCoverError("");
            }}
            onUpload={() => void saveCover()}
            publisher="Blessing For Good"
            title={listing.title}
          />
        </div>

        <div className="admin-ready-stock-media-frame admin-ready-stock-gallery-editor">
          <div className="split-heading">
            <div>
              <span className="card-kicker">Gambar isi</span>
              <h2>Galeri produk</h2>
            </div>
            <span className="subtle">{listing.gallery.length}/8</span>
          </div>
          {listing.gallery.length ? (
            <ProductGallery
              images={listing.gallery
                .filter((image) => Boolean(image.url))
                .map((image) => ({
                  mediaId: image.mediaId,
                  url: image.url!,
                  altText: image.altText,
                  displayOrder: image.displayOrder,
                }))}
              title={listing.title}
            />
          ) : (
            <p className="subtle">Belum ada gambar isi. Maksimal 8 foto.</p>
          )}
          <BFGFilePicker
            accept="image/jpeg,image/png,image/webp"
            ariaLabel="Pilih gambar isi Ready Stock"
            buttonLabel="Pilih gambar"
            changeLabel="Ganti gambar"
            error={galleryError}
            file={galleryFile}
            helper="JPG, PNG, atau WebP. Maksimal 5 MB per gambar."
            label="Tambah gambar isi"
            loading={pending === "gallery"}
            onFileChange={(file) => {
              setGalleryFile(file);
              setGalleryError("");
            }}
            onValidationError={setGalleryError}
            validateFile={validateCoverFile}
          />
          <Button
            type="button"
            variant="secondary"
            disabled={!galleryFile || listing.gallery.length >= 8 || pending !== null}
            loading={pending === "gallery"}
            loadingLabel="Mengunggah…"
            onClick={() => void saveGallery()}
          >
            Upload gambar isi
          </Button>
          <div className="admin-ready-stock-gallery-list">
            {listing.gallery.map((media, index) => (
              <div className="summary-line" key={media.mediaId}>
                <span>Gambar {index + 1}</span>
                <span className="form-actions">
                  <Button
                    type="button"
                    variant="tertiary"
                    size="compact"
                    disabled={index === 0 || pending !== null}
                    onClick={() => void moveGallery({ mediaId: media.mediaId, direction: "up" })}
                  >
                    Naik
                  </Button>
                  <Button
                    type="button"
                    variant="tertiary"
                    size="compact"
                    disabled={index === listing.gallery.length - 1 || pending !== null}
                    onClick={() => void moveGallery({ mediaId: media.mediaId, direction: "down" })}
                  >
                    Turun
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    size="compact"
                    disabled={pending !== null}
                    onClick={() => void removeGallery({ mediaId: media.mediaId })}
                  >
                    Hapus
                  </Button>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </Card>
  );
}

function ReadyStockContent() {
  const [search, setSearch] = useState("");
  const [orderSearch, setOrderSearch] = useState("");
  const [selectedListingId, setSelectedListingId] = useState<Id<"readyStockListings"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFormat, setNewFormat] = useState<BookFormat>("PB");
  const [newQuantity, setNewQuantity] = useState("1");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useQuery(api.readyStockListings.listForAdmin, { search: search.trim() || undefined });
  const orders = useQuery(api.readyStockOrders.listForAdmin, { search: orderSearch.trim() || undefined });
  const createListing = useMutation(api.readyStockListings.create);
  const updateStage = useMutation(api.readyStockOrders.updateStage);

  const summary = useMemo(() => {
    const listingRows = rows ?? [];
    const orderRows = orders ?? [];
    return {
      published: listingRows.filter((row) => row.status === "published").length,
      available: listingRows.reduce((sum, row) => sum + row.availableQuantity, 0),
      waiting: orderRows.filter((order) =>
        ["waiting_payment", "verifying_payment", "paid", "packing", "shipping"].includes(order.operationalStatus),
      ).length,
      delivered: orderRows.filter((order) => order.operationalStatus === "delivered").length,
    };
  }, [orders, rows]);

  async function create() {
    setPending("create");
    setMessage("");
    setError("");
    try {
      const result = await createListing({
        title: newTitle,
        priceAmount: Number(newPrice),
        format: newFormat,
        quantity: Number(newQuantity),
      });
      setSelectedListingId(result.listingId);
      setNewTitle("");
      setNewPrice("");
      setNewQuantity("1");
      setCreateOpen(false);
      setMessage("Ready Stock dibuat sebagai draf. Upload cover lalu terbitkan saat siap.");
    } catch {
      setError("Ready Stock belum berhasil dibuat. Periksa judul, harga, format, dan qty.");
    } finally {
      setPending(null);
    }
  }

  async function advance(orderId: Id<"readyStockOrders">, stage: "packing" | "shipping" | "delivered") {
    setPending(String(orderId));
    setMessage("");
    setError("");
    try {
      await updateStage({ orderId, stage });
      setMessage(
        stage === "packing"
          ? "Status diperbarui: Paket sedang dikemas Blessy."
          : stage === "shipping"
            ? "Status diperbarui: Paket sedang diantar Blessy."
            : "Status diperbarui: Paket sampai.",
      );
    } catch {
      setError("Status belum dapat diperbarui. Pastikan pembayaran sudah lunas dan tahap sebelumnya selesai.");
    } finally {
      setPending(null);
    }
  }

  return (
    <>
      <div className="admin-ready-stock-summary-grid">
        <Card frame="summary">
          <span className="card-kicker">Etalase terbit</span>
          <strong className="metric-money">{summary.published}</strong>
          <span className="subtle">Produk real Ready Stock</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Qty tersedia</span>
          <strong className="metric-money">{summary.available}</strong>
          <span className="subtle">Stok yang belum direservasi</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Sedang diproses</span>
          <strong className="metric-money">{summary.waiting}</strong>
          <span className="subtle">Dari pembayaran sampai pengiriman</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Paket sampai</span>
          <strong className="metric-money">{summary.delivered}</strong>
          <span className="subtle">Order Ready Stock selesai</span>
        </Card>
      </div>

      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="admin-ready-stock-toolbar">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Etalase manual</span>
            <h2>Ready Stock</h2>
            <p className="subtle">Judul, harga, format, qty, dan foto tidak lagi ditarik dari Master Buku.</p>
          </div>
          <Button type="button" onClick={() => setCreateOpen((current) => !current)}>
            {createOpen ? "Tutup form" : "Tambah Ready Stock"}
          </Button>
        </div>
        <Field label="Cari Ready Stock">
          <input
            className="input"
            type="search"
            placeholder="Cari judul"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </Field>
      </Card>

      {createOpen ? (
        <Card className="admin-ready-stock-create-card">
          <div className="split-heading">
            <div>
              <span className="card-kicker">Produk baru</span>
              <h2>Tambah ke etalase Ready Stock</h2>
            </div>
            <StatusBadge>Draf</StatusBadge>
          </div>
          <div className="form-grid admin-ready-stock-create-grid">
            <Field label="Judul">
              <input className="input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            </Field>
            <Field label="Harga">
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
              />
            </Field>
            <Field label="Format">
              <BFGSelect value={newFormat} onChange={(event) => setNewFormat(event.target.value as BookFormat)}>
                {BOOK_FORMATS.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </BFGSelect>
            </Field>
            <Field label="Qty tersedia">
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
              />
            </Field>
          </div>
          <Button
            type="button"
            loading={pending === "create"}
            loadingLabel="Membuat…"
            disabled={pending !== null}
            onClick={() => void create()}
          >
            Buat draf Ready Stock
          </Button>
        </Card>
      ) : null}

      {selectedListingId ? (
        <ReadyStockListingEditor listingId={selectedListingId} onClose={() => setSelectedListingId(null)} />
      ) : null}

      {rows === undefined ? (
        <LoadingRegion label="Memuat etalase Ready Stock">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : rows.length ? (
        <div className="table-wrap">
          <table className="data-table admin-ready-stock-table">
            <caption className="sr-only">Etalase Ready Stock manual</caption>
            <thead>
              <tr>
                <th>Judul</th>
                <th>Format</th>
                <th>Harga</th>
                <th>Qty</th>
                <th>Reservasi</th>
                <th>Tersedia</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.listingId}>
                  <td>
                    <strong>{row.title}</strong>
                    <span className="subtle table-secondary">{row.slug}</span>
                  </td>
                  <td>{row.format}</td>
                  <td className="numeric-cell"><Money amount={row.priceAmount} /></td>
                  <td className="numeric-cell">{row.quantity}</td>
                  <td className="numeric-cell">{row.reservedQuantity}</td>
                  <td className="numeric-cell"><strong>{row.availableQuantity}</strong></td>
                  <td>
                    <StatusBadge tone={row.status === "published" ? "positive" : "neutral"}>
                      {listingStatusLabel[row.status as ListingStatus]}
                    </StatusBadge>
                  </td>
                  <td>
                    <Button type="button" variant="secondary" size="compact" onClick={() => setSelectedListingId(row.listingId)}>
                      Kelola
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Belum ada Ready Stock manual"
          description="Tambahkan produk Ready Stock untuk mulai membangun etalase foto asli."
          action={<Button onClick={() => setCreateOpen(true)}>Tambah Ready Stock</Button>}
        />
      )}

      <Card className="admin-ready-stock-orders-panel">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Operasional pesanan</span>
            <h2>Pesanan Ready Stock</h2>
            <p className="subtle">Pantau pembayaran sampai paket diterima customer.</p>
          </div>
        </div>
        <Field label="Cari pesanan">
          <input
            className="input"
            type="search"
            placeholder="Nama customer, judul, member code, atau invoice"
            value={orderSearch}
            onChange={(event) => setOrderSearch(event.target.value)}
          />
        </Field>

        {orders === undefined ? (
          <LoadingRegion label="Memuat pesanan Ready Stock">
            <SkeletonCard />
          </LoadingRegion>
        ) : orders.length ? (
          <div className="content-stack admin-ready-stock-order-list">
            {orders.map((order) => {
              const stage = order.operationalStatus as ReadyStage;
              const nextStage = stage === "paid" ? "packing" : stage === "packing" ? "shipping" : stage === "shipping" ? "delivered" : null;
              const nextLabel = stage === "paid" ? "Mulai kemas" : stage === "packing" ? "Tandai dikirim" : stage === "shipping" ? "Tandai sampai" : null;
              return (
                <Card className="admin-ready-stock-order-card" key={order.orderId}>
                  <div className="split-heading">
                    <div>
                      <span className="card-kicker">{order.invoiceNumber || "Ready Stock order"}</span>
                      <h3>{order.customerName}</h3>
                      <p className="subtle">{order.customerMemberCode || order.customerEmail || "Blessfriend"}</p>
                    </div>
                    <StatusBadge tone={stage === "delivered" ? "positive" : stage === "cancelled" ? "neutral" : "warning"}>
                      {orderStageLabel[stage]}
                    </StatusBadge>
                  </div>
                  <div className="admin-ready-stock-order-grid">
                    <div>
                      <span className="subtle">Item</span>
                      <strong>{order.title} · {order.format}</strong>
                    </div>
                    <div>
                      <span className="subtle">Qty</span>
                      <strong>{order.quantity}</strong>
                    </div>
                    <div>
                      <span className="subtle">Total</span>
                      <strong><Money amount={order.totalAmount} /></strong>
                    </div>
                    <div>
                      <span className="subtle">Kirim ke</span>
                      <strong>{order.shippingAddress.city}, {order.shippingAddress.province}</strong>
                    </div>
                  </div>
                  <div className="form-actions">
                    {order.invoiceId ? (
                      <LinkButton href={`/admin/invoices/${order.invoiceId}`} variant="secondary">
                        Buka tagihan
                      </LinkButton>
                    ) : null}
                    {nextStage && nextLabel ? (
                      <Button
                        type="button"
                        loading={pending === String(order.orderId)}
                        loadingLabel="Menyimpan…"
                        disabled={pending !== null}
                        onClick={() => void advance(order.orderId, nextStage)}
                      >
                        {nextLabel}
                      </Button>
                    ) : null}
                  </div>
                </Card>
              );
            })}
          </div>
        ) : (
          <p className="subtle">Belum ada checkout Ready Stock.</p>
        )}
      </Card>
    </>
  );
}

function ConnectedAdminReadyStock() {
  return (
    <AdminOperationalPage
      eyebrow="Ready Stock"
      title="Etalase real stock & pesanan."
      description="Kelola Ready Stock secara manual dari foto asli sampai checkout, tagihan, pembayaran, dan pengiriman."
      className="admin-ready-stock-page"
    >
      <ReadyStockContent />
    </AdminOperationalPage>
  );
}

export function AdminReadyStock() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ConnectedAdminReadyStock />
      </ProductAccessGuard>
    </SiteShell>
  );
}
