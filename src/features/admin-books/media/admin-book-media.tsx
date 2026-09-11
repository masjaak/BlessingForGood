"use client";

import type { FunctionReturnType } from "convex/server";
import { useAction, useMutation } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";
import { ProductGallery } from "@/components/product-gallery";
import { Button, ConfirmationDialog, Field, IconButton } from "@/components/ui";
import { BfgUploadError, uploadBfgFile } from "@/lib/upload-file";

type AdminBook = NonNullable<FunctionReturnType<typeof api.books.getForAdmin>>;
type GalleryImage = AdminBook["gallery"][number];
type MediaPendingAction = "cover" | "gallery";

function uploadFailureMessage(label: string, reason: unknown): string {
  if (reason instanceof BfgUploadError && reason.code === "UPLOAD_RATE_LIMITED") {
    return reason.retryAfterSeconds
      ? `${label} sementara dibatasi. Coba lagi dalam ${reason.retryAfterSeconds} detik.`
      : `${label} sementara dibatasi. Coba lagi beberapa saat lagi.`;
  }
  return `${label} belum tersimpan. Coba lagi.`;
}

export function AdminBookMedia({
  book,
  pendingAction,
  onPendingActionChange,
}: {
  book: AdminBook;
  pendingAction: MediaPendingAction | null;
  onPendingActionChange: (action: MediaPendingAction | null) => void;
}) {
  const attachCover = useAction(api.books.attachCover);
  const attachGalleryImage = useAction(api.books.attachGalleryImage);
  const removeGalleryImage = useMutation(api.books.removeGalleryImage);
  const moveGalleryImage = useMutation(api.books.moveGalleryImage);
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [coverMessage, setCoverMessage] = useState("");
  const [coverError, setCoverError] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryAltText, setGalleryAltText] = useState(book.title);
  const [galleryMessage, setGalleryMessage] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [galleryPendingMediaId, setGalleryPendingMediaId] = useState<string | null>(null);
  const [confirmGalleryMedia, setConfirmGalleryMedia] = useState<GalleryImage | null>(null);
  const { getToken, sessionClaims } = useAuth();

  async function saveCover() {
    setCoverMessage("");
    setCoverError("");
    onPendingActionChange("cover");
    try {
      if (coverFile) {
        const validationError = validateCoverFile(coverFile);
        if (validationError) {
          setCoverError(validationError);
          return;
        }
        const storageId = await uploadBfgFile(coverFile, "book-cover", getToken, sessionClaims);
        await attachCover({
          bookId: book._id,
          storageId,
          fileName: coverFile.name,
          mimeType: coverFile.type,
        });
        setCoverFile(null);
        setCoverMessage("Cover tersimpan.");
      }
    } catch (reason) {
      setCoverError(uploadFailureMessage("Unggah cover", reason));
    } finally {
      onPendingActionChange(null);
    }
  }

  async function uploadGalleryImage() {
    if (!galleryFile) return;
    setGalleryMessage("");
    setGalleryError("");
    onPendingActionChange("gallery");
    try {
      const validationError = validateCoverFile(galleryFile);
      if (validationError) {
        setGalleryError(validationError.replace("Cover", "Gambar galeri"));
        return;
      }
      const storageId = await uploadBfgFile(galleryFile, "book-gallery", getToken, sessionClaims);
      await attachGalleryImage({
        bookId: book._id,
        storageId,
        fileName: galleryFile.name,
        mimeType: galleryFile.type,
        altText: galleryAltText,
      });
      setGalleryFile(null);
      setGalleryMessage("Gambar galeri tersimpan.");
    } catch (reason) {
      setGalleryError(uploadFailureMessage("Unggah gambar galeri", reason));
    } finally {
      onPendingActionChange(null);
    }
  }

  async function removeGallery(media: GalleryImage) {
    setGalleryMessage("");
    setGalleryError("");
    setGalleryPendingMediaId(media.mediaId);
    try {
      await removeGalleryImage({ mediaId: media.mediaId });
      setGalleryMessage("Gambar galeri dihapus.");
    } catch {
      setGalleryError("Gambar galeri belum dapat dihapus.");
    } finally {
      setGalleryPendingMediaId(null);
    }
  }

  async function moveGallery(media: GalleryImage, direction: "up" | "down") {
    setGalleryMessage("");
    setGalleryError("");
    setGalleryPendingMediaId(media.mediaId);
    try {
      await moveGalleryImage({ mediaId: media.mediaId, direction });
    } catch {
      setGalleryError("Urutan galeri belum dapat diubah.");
    } finally {
      setGalleryPendingMediaId(null);
    }
  }

  function handleCoverFileChange(file: File | null) {
    setCoverFile(file);
    setCoverMessage("");
    setCoverError("");
  }

  function handleGalleryFileChange(file: File | null) {
    setGalleryFile(file);
    setGalleryMessage("");
    setGalleryError("");
  }

  return (
    <>
      <CoverUploadField
        currentSrc={book.coverUrl || undefined}
        error={coverError}
        file={coverFile}
        format={book.variants[0]?.format}
        message={coverMessage}
        onFileChange={handleCoverFileChange}
        onUpload={() => void saveCover()}
        loading={pendingAction === "cover"}
        publisher={book.publisher?.name || "BFG"}
        title={book.title}
      />
      <section className="admin-book-detail-section product-media-admin-section">
        <div className="split-heading">
          <div>
            <span className="card-kicker">GALERI PRODUK</span>
            <h2>Gambar tambahan</h2>
          </div>
          <span className="subtle">{book.gallery.length}/8</span>
        </div>
        <ProductGallery
          images={book.gallery
            .filter((image) => Boolean(image.url))
            .map((image) => ({
              mediaId: image.mediaId,
              url: image.url!,
              altText: image.altText,
              displayOrder: image.displayOrder,
            }))}
          title={book.title}
        />
        <div className="product-media-list">
          {book.gallery.map((media, index) => (
            <div className="product-media-row" key={media.mediaId}>
              <span>
                <strong>Gambar {index + 1}</strong>
                <small>{media.altText}</small>
              </span>
              <span className="form-actions">
                <IconButton
                  aria-label={`Naikkan gambar ${index + 1}`}
                  disabled={index === 0 || galleryPendingMediaId === media.mediaId}
                  onClick={() => void moveGallery(media, "up")}
                  type="button"
                  variant="tertiary"
                >
                  ↑
                </IconButton>
                <IconButton
                  aria-label={`Turunkan gambar ${index + 1}`}
                  disabled={index === book.gallery.length - 1 || galleryPendingMediaId === media.mediaId}
                  onClick={() => void moveGallery(media, "down")}
                  type="button"
                  variant="tertiary"
                >
                  ↓
                </IconButton>
                <Button
                  disabled={galleryPendingMediaId === media.mediaId}
                  onClick={() => setConfirmGalleryMedia(media)}
                  size="compact"
                  type="button"
                  variant="danger"
                >
                  Hapus gambar
                </Button>
              </span>
            </div>
          ))}
        </div>
        <div className="form-grid product-media-upload-grid">
          <Field label="Alt text gambar" hint="Maksimal 160 karakter.">
            <input
              className="input"
              maxLength={160}
              value={galleryAltText}
              onChange={(event) => setGalleryAltText(event.target.value)}
            />
          </Field>
          <BFGFilePicker
            accept="image/jpeg,image/png,image/webp"
            ariaLabel="Pilih file gambar galeri"
            buttonLabel="Pilih gambar"
            changeLabel="Ganti gambar"
            error={galleryError}
            file={galleryFile}
            helper="JPG, PNG, atau WebP. Maksimal 5 MB."
            label="Pilih gambar"
            onFileChange={handleGalleryFileChange}
            onValidationError={setGalleryError}
            validateFile={validateCoverFile}
            disabled={book.gallery.length >= 8}
          />
        </div>
        <div className="form-actions product-media-action-row">
          <Button
            disabled={!galleryFile || book.gallery.length >= 8}
            onClick={() => void uploadGalleryImage()}
            loading={pendingAction === "gallery"}
            loadingLabel="Mengunggah…"
            type="button"
            variant="secondary"
          >
            Simpan gambar
          </Button>
          <span className="subtle" aria-live="polite">
            {galleryMessage || (galleryFile ? "File siap diunggah." : "Belum ada file dipilih")}
          </span>
        </div>
      </section>
      <ConfirmationDialog
        open={confirmGalleryMedia !== null}
        title="Hapus gambar galeri?"
        description="Gambar akan dilepas dari Book Master. Pastikan gambar ini tidak lagi diperlukan."
        confirmLabel="Hapus gambar"
        danger
        onCancel={() => setConfirmGalleryMedia(null)}
        onConfirm={() => {
          const media = confirmGalleryMedia;
          setConfirmGalleryMedia(null);
          if (media) void removeGallery(media);
        }}
      />
    </>
  );
}
