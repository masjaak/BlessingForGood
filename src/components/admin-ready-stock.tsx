"use client";

import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { BFGSelect } from "@/components/bfg-select";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";
import { ProductGallery } from "@/components/product-gallery";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  StatusBadge,
} from "@/components/ui";
import { SkeletonSummaryGrid, SkeletonTableBlock } from "@/components/workspace-skeleton-primitives";
import { SiteShell } from "@/components/site-shell";
import { BOOK_FORMATS, type BookFormat } from "@/domain/prototype/types";
import { uploadBfgFile } from "@/lib/upload-file";

type ListingRows = Awaited<FunctionReturnType<typeof api.readyStockManual.listForAdmin>>;
type Listing = ListingRows[number];
type Purchases = Awaited<FunctionReturnType<typeof api.readyStockManual.listPurchasesForAdmin>>;

function number(value: number) {
  return value.toLocaleString("id-ID");
}

function purchaseLabel(status: string) {
  if (status === "waiting_payment") return "Blessy menunggu pembayaran";
  if (status === "verifying_payment") return "Blessy memverifikasi pembayaran";
  if (status === "payment_success") return "Pembayaran berhasil";
  if (status === "packing") return "Paket sedang dikemas Blessy";
  if (status === "shipping") return "Paket sedang diantar Blessy";
  if (status === "delivered") return "Paket sampai";
  if (status === "cancelled") return "Dibatalkan";
  return status;
}

function listingStatusLabel(status: string) {
  if (status === "draft") return "Draf";
  if (status === "published") return "Tayang";
  if (status === "archived") return "Diarsipkan";
  return status;
}

function ListingForm({
  listing,
  onClose,
  onSaved,
}: {
  listing?: Listing;
  onClose?: () => void;
  onSaved: (listingId: string, message: string) => void;
}) {
  const createListing = useMutation(api.readyStockManual.create);
  const updateListing = useMutation(api.readyStockManual.update);
  const [title, setTitle] = useState(listing?.title ?? "");
  const [price, setPrice] = useState(listing ? String(listing.priceAmount) : "");
  const [format, setFormat] = useState<BookFormat>(listing?.format ?? "PB");
  const [quantity, setQuantity] = useState(listing ? String(listing.quantity) : "1");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    if (pending) return;
    const priceAmount = Number(price);
    const qty = Number(quantity);
    if (!title.trim()) {
      setError("Judul wajib diisi.");
      return;
    }
    if (!Number.isSafeInteger(priceAmount) || priceAmount <= 0) {
      setError("Harga harus Rupiah bulat lebih dari 0.");
      return;
    }
    if (!Number.isSafeInteger(qty) || qty < 0) {
      setError("QTY tersedia tidak valid.");
      return;
    }
    setPending(true);
    setError("");
    try {
      if (listing) {
        const updated = await updateListing({
          listingId: listing.listingId,
          title: title.trim(),
          priceAmount,
          format,
          quantity: qty,
        });
        onSaved(updated.listingId, "Data Ready Stock berhasil diperbarui.");
      } else {
        const created = await createListing({
          title: title.trim(),
          priceAmount,
          format,
          quantity: qty,
          status: "draft",
        });
        onSaved(created.listingId, "Draft Ready Stock dibuat. Tambahkan cover dan foto isi sebelum diterbitkan.");
        setTitle("");
        setPrice("");
        setQuantity("1");
      }
    } catch {
      setError("Ready Stock belum berhasil disimpan. Coba lagi.");
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="content-stack ready-stock-manual-form" onSubmit={submit}>
      <div className="form-grid ready-stock-manual-form-grid">
        <Field label="Judul">
          <input className="input" value={title} maxLength={200} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <Field label="Harga">
          <input
            className="input"
            type="number"
            min="1"
            step="1"
            value={price}
            onChange={(event) => setPrice(event.target.value)}
          />
        </Field>
        <Field label="Format">
          <BFGSelect value={format} onChange={(event) => setFormat(event.target.value as BookFormat)}>
            {BOOK_FORMATS.map((value) => (
              <option value={value} key={value}>
                {value}
              </option>
            ))}
          </BFGSelect>
        </Field>
        <Field label="QTY tersedia">
          <input
            className="input"
            type="number"
            min="0"
            step="1"
            value={quantity}
            onChange={(event) => setQuantity(event.target.value)}
          />
        </Field>
      </div>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
      <div className="form-actions">
        <Button type="submit" loading={pending} loadingLabel="Menyimpan…">
          {listing ? "Simpan perubahan" : "Buat Ready Stock"}
        </Button>
        {onClose ? (
          <Button type="button" variant="tertiary" disabled={pending} onClick={onClose}>
            Batal
          </Button>
        ) : null}
      </div>
    </form>
  );
}

function MediaEditor({
  listing,
  onClose,
  onMessage,
}: {
  listing: Listing;
  onClose: () => void;
  onMessage: (message: string) => void;
}) {
  const attachCover = useAction(api.readyStockManual.attachCover);
  const attachGalleryImage = useAction(api.readyStockManual.attachGalleryImage);
  const removeGalleryImage = useMutation(api.readyStockManual.removeGalleryImage);
  const { getToken, sessionClaims } = useAuth();
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [pending, setPending] = useState<"cover" | "gallery" | string | null>(null);
  const [error, setError] = useState("");

  async function saveCover() {
    if (!coverFile) return;
    setPending("cover");
    setError("");
    try {
      const storageId = await uploadBfgFile(coverFile, "ready-stock-cover", getToken, sessionClaims);
      await attachCover({
        listingId: listing.listingId,
        storageId,
        fileName: coverFile.name,
        mimeType: coverFile.type,
      });
      setCoverFile(null);
      onMessage("Cover Ready Stock tersimpan.");
    } catch {
      setError("Cover belum berhasil diunggah.");
    } finally {
      setPending(null);
    }
  }

  async function saveGallery() {
    if (!galleryFile || listing.gallery.length >= 8) return;
    setPending("gallery");
    setError("");
    try {
      const storageId = await uploadBfgFile(galleryFile, "ready-stock-gallery", getToken, sessionClaims);
      await attachGalleryImage({
        listingId: listing.listingId,
        storageId,
        fileName: galleryFile.name,
        mimeType: galleryFile.type,
        altText: listing.title,
      });
      setGalleryFile(null);
      onMessage("Foto isi Ready Stock tersimpan.");
    } catch {
      setError("Foto isi belum berhasil diunggah.");
    } finally {
      setPending(null);
    }
  }

  async function removeImage(mediaId: Id<"readyStockListingMedia">) {
    setPending(String(mediaId));
    setError("");
    try {
      await removeGalleryImage({ mediaId });
      onMessage("Foto isi dihapus.");
    } catch {
      setError("Foto belum berhasil dihapus.");
    } finally {
      setPending(null);
    }
  }

  return (
    <Card className="content-stack ready-stock-media-editor">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Foto etalase</span>
          <h2>{listing.title}</h2>
        </div>
        <Button type="button" variant="tertiary" onClick={onClose}>Tutup</Button>
      </div>

      <CoverUploadField
        currentSrc={listing.coverUrl || undefined}
        error={error}
        file={coverFile}
        format={listing.format}
        message=""
        onFileChange={setCoverFile}
        onUpload={() => void saveCover()}
        loading={pending === "cover"}
        publisher="Ready Stock BFG"
        title={listing.title}
      />

      <section className="content-stack ready-stock-gallery-editor">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Foto isi</span>
            <h3>Maksimal 8 gambar</h3>
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
        ) : null}

        <BFGFilePicker
          accept="image/jpeg,image/png,image/webp"
          ariaLabel="Pilih foto isi Ready Stock"
          buttonLabel="Pilih gambar"
          changeLabel="Ganti gambar"
          file={galleryFile}
          helper="JPG, PNG, atau WebP. Maksimal 5 MB per gambar."
          label="Foto isi"
          onFileChange={setGalleryFile}
          onValidationError={setError}
          validateFile={validateCoverFile}
          disabled={listing.gallery.length >= 8 || pending !== null}
        />
        <div className="form-actions">
          <Button
            type="button"
            variant="secondary"
            disabled={!galleryFile || listing.gallery.length >= 8 || pending !== null}
            loading={pending === "gallery"}
            loadingLabel="Mengunggah…"
            onClick={() => void saveGallery()}
          >
            Simpan foto isi
          </Button>
        </div>

        {listing.gallery.map((media, index) => (
          <div className="summary-line" key={media.mediaId}>
            <span>Gambar {index + 1}</span>
            <Button
              type="button"
              variant="danger"
              size="compact"
              disabled={pending !== null}
              onClick={() => void removeImage(media.mediaId)}
            >
              Hapus
            </Button>
          </div>
        ))}
      </section>
      {error ? <p className="error-text" role="alert">{error}</p> : null}
    </Card>
  );
}

function PurchaseQueue({ purchases }: { purchases: Purchases }) {
  const setStage = useMutation(api.readyStockManual.setFulfillmentStage);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [message, setMessage] = useState("");

  async function advance(purchaseId: Id<"readyStockPurchases">, stage: "packing" | "shipping" | "delivered") {
    setPendingId(String(purchaseId));
    setMessage("");
    try {
      await setStage({ purchaseId, stage });
      setMessage("Status Ready Stock customer berhasil diperbarui.");
    } finally {
      setPendingId(null);
    }
  }

  return (
    <Card className="content-stack ready-stock-purchase-queue">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Pesanan Ready Stock</span>
          <h2>Proses checkout dan pengiriman</h2>
        </div>
        <StatusBadge>{purchases.length}</StatusBadge>
      </div>
      {message ? <p className="success-banner" role="status">{message}</p> : null}
      {purchases.length ? (
        <div className="table-wrap">
          <table className="data-table admin-ready-stock-purchase-table">
            <thead>
              <tr>
                <th>Customer</th>
                <th>Item</th>
                <th>Total</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {purchases.map((purchase) => {
                const nextStage =
                  purchase.operationalStatus === "payment_success"
                    ? "packing"
                    : purchase.operationalStatus === "packing"
                      ? "shipping"
                      : purchase.operationalStatus === "shipping"
                        ? "delivered"
                        : null;
                return (
                  <tr key={purchase.purchaseId}>
                    <td>
                      <strong>{purchase.customerName}</strong>
                      <span className="subtle table-secondary">{purchase.memberCode || purchase.customerEmail || "Blessfriend"}</span>
                    </td>
                    <td>
                      <strong>{purchase.title}</strong>
                      <span className="subtle table-secondary">{purchase.format} · {purchase.quantity} buku</span>
                    </td>
                    <td><Money amount={purchase.subtotalAmount} /></td>
                    <td><StatusBadge tone={purchase.operationalStatus === "delivered" ? "positive" : "warning"}>{purchaseLabel(purchase.operationalStatus)}</StatusBadge></td>
                    <td>
                      <div className="form-actions">
                        {purchase.invoiceId ? (
                          <LinkButton href={`/admin/invoices/${purchase.invoiceId}`} variant="secondary" size="compact">
                            Tagihan
                          </LinkButton>
                        ) : null}
                        {nextStage ? (
                          <Button
                            type="button"
                            size="compact"
                            disabled={pendingId !== null}
                            loading={pendingId === String(purchase.purchaseId)}
                            loadingLabel="Menyimpan…"
                            onClick={() => void advance(purchase.purchaseId, nextStage)}
                          >
                            {nextStage === "packing" ? "Mulai kemas" : nextStage === "shipping" ? "Mulai antar" : "Tandai sampai"}
                          </Button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Belum ada checkout Ready Stock" description="Pesanan customer akan tampil di sini setelah checkout langsung." />
      )}
    </Card>
  );
}

function ReadyStockContent({ rows, purchases }: { rows: ListingRows; purchases: Purchases }) {
  const setPublicationStatus = useMutation(api.readyStockManual.setPublicationStatus);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mediaId, setMediaId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const editing = rows.find((row) => row.listingId === editingId);
  const mediaListing = rows.find((row) => row.listingId === mediaId);
  const totals = rows
    .filter((row) => row.status !== "archived")
    .reduce(
      (summary, row) => ({
        listings: summary.listings + 1,
        onHand: summary.onHand + row.quantity,
        reserved: summary.reserved + row.reservedQuantity,
        available: summary.available + row.availableQuantity,
      }),
      { listings: 0, onHand: 0, reserved: 0, available: 0 },
    );

  async function changeStatus(listing: Listing, status: "draft" | "published" | "archived") {
    setMessage("");
    try {
      await setPublicationStatus({ listingId: listing.listingId, status });
      setMessage(status === "published" ? "Ready Stock sudah tampil di etalase." : status === "archived" ? "Ready Stock diarsipkan." : "Ready Stock dikembalikan ke draft.");
    } catch {
      setMessage("Status belum berhasil diperbarui. Pastikan cover sudah ada dan stok tersedia.");
    }
  }

  return (
    <>
      <div className="admin-inventory-summary ready-stock-manual-summary">
        <Card>
          <span className="card-kicker">Item etalase</span>
          <strong>{number(totals.listings)}</strong>
          <span className="subtle">Ready Stock manual aktif</span>
        </Card>
        <Card>
          <span className="card-kicker">Stok fisik</span>
          <strong>{number(totals.onHand)}</strong>
          <span className="subtle">Jumlah yang dicatat Admin</span>
        </Card>
        <Card>
          <span className="card-kicker">Dipesan</span>
          <strong>{number(totals.reserved)}</strong>
          <span className="subtle">Diamankan checkout aktif</span>
        </Card>
        <Card>
          <span className="card-kicker">Tersedia</span>
          <strong>{number(totals.available)}</strong>
          <span className="subtle">Bisa langsung di-checkout</span>
        </Card>
      </div>

      <Card className="content-stack">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Tambah Ready Stock</span>
            <h2>Input etalase manual</h2>
          </div>
          <span className="subtle">Master Buku tidak digunakan</span>
        </div>
        <ListingForm
          onSaved={(listingId, text) => {
            setMessage(text);
            setMediaId(listingId);
          }}
        />
      </Card>

      {editing ? (
        <Card className="content-stack">
          <div className="split-heading">
            <div>
              <span className="card-kicker">Edit Ready Stock</span>
              <h2>{editing.title}</h2>
            </div>
          </div>
          <ListingForm
            listing={editing}
            onClose={() => setEditingId(null)}
            onSaved={(_listingId, text) => {
              setMessage(text);
              setEditingId(null);
            }}
          />
        </Card>
      ) : null}

      {mediaListing ? (
        <MediaEditor
          listing={mediaListing}
          onClose={() => setMediaId(null)}
          onMessage={setMessage}
        />
      ) : null}

      {message ? <p className="success-banner" role="status">{message}</p> : null}

      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table admin-stock-table ready-stock-manual-table">
            <caption className="sr-only">Etalase Ready Stock manual</caption>
            <thead>
              <tr>
                <th>Cover / Judul</th>
                <th>Format</th>
                <th>Harga</th>
                <th>QTY</th>
                <th>Tersedia</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.listingId}>
                  <td>
                    <div className="ready-stock-admin-title-cell">
                      {row.coverUrl ? <img className="ready-stock-admin-thumb" src={row.coverUrl} alt="" /> : <span className="ready-stock-admin-thumb is-empty" aria-hidden="true" />}
                      <strong>{row.title}</strong>
                    </div>
                  </td>
                  <td>{row.format}</td>
                  <td><Money amount={row.priceAmount} /></td>
                  <td className="numeric-cell">{number(row.quantity)}</td>
                  <td className="numeric-cell"><strong>{number(row.availableQuantity)}</strong></td>
                  <td><StatusBadge tone={row.status === "published" ? "positive" : "neutral"}>{listingStatusLabel(row.status)}</StatusBadge></td>
                  <td>
                    <div className="form-actions ready-stock-admin-actions">
                      <Button type="button" size="compact" variant="secondary" onClick={() => setEditingId(row.listingId)}>Edit data</Button>
                      <Button type="button" size="compact" variant="secondary" onClick={() => setMediaId(row.listingId)}>Kelola foto</Button>
                      {row.status === "draft" ? (
                        <Button type="button" size="compact" onClick={() => void changeStatus(row, "published")}>Terbitkan</Button>
                      ) : row.status === "published" ? (
                        <Button type="button" size="compact" variant="tertiary" onClick={() => void changeStatus(row, "draft")}>Jadikan draft</Button>
                      ) : null}
                      {row.status !== "archived" ? (
                        <Button type="button" size="compact" variant="danger" onClick={() => void changeStatus(row, "archived")}>Arsipkan</Button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Belum ada etalase Ready Stock."
          description="Tambahkan buku secara manual beserta foto asli, harga, format, dan QTY."
        />
      )}

      <PurchaseQueue purchases={purchases} />
    </>
  );
}

function ConnectedAdminReadyStock() {
  const rows = useQuery(api.readyStockManual.listForAdmin, {});
  const purchases = useQuery(api.readyStockManual.listPurchasesForAdmin, {});
  const loading = rows === undefined || purchases === undefined;

  return (
    <AdminOperationalPage
      eyebrow="Ready Stock"
      title="Etalase stok nyata."
      description="Ready Stock berdiri sendiri dari Master Buku. Kelola foto asli, harga, format, QTY, checkout, pembayaran, dan pengiriman dari satu tempat."
      loading={loading}
      skeleton={{ titleWidth: "54%", descriptionWidths: ["92%", "56%"], actionWidths: [] }}
    >
      {loading ? (
        <LoadingRegion label="Memuat Ready Stock">
          <SkeletonSummaryGrid />
          <SkeletonTableBlock rows={8} columnWidths={["1.8fr", "0.8fr", "1fr", "0.7fr", "0.7fr", "0.8fr", "1.4fr"]} />
        </LoadingRegion>
      ) : (
        <ReadyStockContent rows={rows} purchases={purchases} />
      )}
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
