"use client";
import { useAction, useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { useAuth } from "@clerk/nextjs";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { BFGSelect } from "@/components/bfg-select";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";
import { ProductGallery } from "@/components/product-gallery";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, SkeletonCard } from "@/components/ui";
import { BOOK_FORMATS, type BookFormat } from "@/domain/prototype/types";
import { BfgUploadError, uploadBfgFileWithMetadata } from "@/lib/upload-file";
import { DirectR2TransportError, uploadDirectPublicMedia } from "@/lib/upload-direct-public-media";
type ListingStatus = "draft" | "published" | "archived";
function uploadFailure(label: string, reason: unknown) {
  if (reason instanceof BfgUploadError && reason.code === "UPLOAD_RATE_LIMITED") {
    return reason.retryAfterSeconds
      ? `${label} dibatasi sementara. Coba lagi dalam ${reason.retryAfterSeconds} detik.`
      : `${label} dibatasi sementara. Coba lagi beberapa saat lagi.`;
  }
  return `${label} belum berhasil. Coba lagi.`;
}

export function ReadyStockListingEditor({
  listingId,
  onClose,
}: {
  listingId: Id<"readyStockListings">;
  onClose: () => void;
}) {
  const listing = useQuery(api.readyStockListings.getForAdmin, { listingId });
  const update = useMutation(api.readyStockListings.update);
  const preparePublicUpload = useMutation(api.directPublicMedia.prepare);
  const attachPublicUpload = useAction(api.directPublicMedia.attach);
  const attachLegacyCover = useAction(api.readyStockListings.attachCover);
  const attachLegacyGallery = useAction(api.readyStockListings.attachGalleryImage);
  const { getToken, sessionClaims } = useAuth();
  const removeGallery = useMutation(api.readyStockListings.removeGalleryImage);
  const moveGallery = useMutation(api.readyStockListings.moveGalleryImage);

  const [title, setTitle] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
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
  const currentDescription = description ?? listing.description ?? "";
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
        description: currentDescription,
        priceAmount: Number(currentPrice),
        format: currentFormat,
        quantity: Number(currentQuantity),
        status: currentStatus,
      });
      setTitle(null);
      setDescription(null);
      setPrice(null);
      setFormat(null);
      setQuantity(null);
      setStatus(null);
      setMessage("Ready Stock berhasil diperbarui.");
    } catch (reason) {
      setError(
        String(reason).includes("Cover wajib")
          ? "Upload cover sebelum menerbitkan Ready Stock."
          : "Data belum berhasil disimpan.",
      );
    } finally {
      setPending(null);
    }
  }

  async function uploadMediaWithFallback(file: File, purpose: "cover" | "gallery", altText?: string) {
    try {
      await uploadDirectPublicMedia(file, { listingId, purpose }, preparePublicUpload, attachPublicUpload, altText);
    } catch (reason) {
      if (!(reason instanceof DirectR2TransportError)) throw reason;
      const uploaded = await uploadBfgFileWithMetadata(
        file,
        purpose === "cover" ? "book-cover" : "book-gallery",
        getToken,
        sessionClaims,
      );
      if (purpose === "cover") {
        await attachLegacyCover({
          listingId,
          storageId: uploaded.storageId,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
        });
      } else {
        await attachLegacyGallery({
          listingId,
          storageId: uploaded.storageId,
          fileName: uploaded.fileName,
          mimeType: uploaded.mimeType,
          altText,
        });
      }
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
      await uploadMediaWithFallback(coverFile, "cover");
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
      await uploadMediaWithFallback(galleryFile, "gallery", currentTitle);
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
        <div className="admin-ready-stock-description-field">
          <Field label="Deskripsi">
            <textarea
              className="textarea"
              maxLength={2000}
              placeholder="Tulis deskripsi singkat buku Ready Stock"
              value={currentDescription}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
        </div>
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
