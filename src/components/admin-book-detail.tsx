"use client";

import type { FunctionReturnType } from "convex/server";
import { useAction, useMutation, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import {
  ActionGroup,
  Button,
  Card,
  Field,
  IconButton,
  InlineBooleanField,
  LoadingRegion,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";
import { CoverUploadField, validateCoverFile } from "@/components/cover-upload-field";
import type { CoverPresentation } from "@/components/book-cover";
import { ProductGallery } from "@/components/product-gallery";
import { uploadBfgFile } from "@/lib/upload-file";

type AdminBook = NonNullable<FunctionReturnType<typeof api.books.getForAdmin>>;
type Variant = AdminBook["variants"][number];
type GalleryImage = AdminBook["gallery"][number];
type BookFormat = "BB" | "PB" | "HB";
type PublicationStatus = "draft" | "published" | "special" | "archived";

const publicationLabels: Record<PublicationStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  special: "Khusus / privat",
  archived: "Diarsipkan",
};

function VariantRow({ variant }: { variant: Variant }) {
  const updateVariant = useMutation(api.bookVariants.update);
  const setQuantity = useMutation(api.readyStock.setQuantity);
  const [isbn, setIsbn] = useState(variant.isbn);
  const [price, setPrice] = useState(String(variant.priceAmount));
  const [supplierPriceGbp, setSupplierPriceGbp] = useState(
    variant.supplierPriceGbpMinor === undefined ? "" : String(variant.supplierPriceGbpMinor),
  );
  const [quantity, setStock] = useState(String(variant.stockQuantity));
  const [enabled, setEnabled] = useState(variant.isAvailable);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      await updateVariant({
        bookVariantId: variant._id,
        isbn,
        priceAmount: Number(price),
        supplierPriceGbpMinor: supplierPriceGbp.trim() ? Number(supplierPriceGbp) : undefined,
        isAvailable: enabled,
      });
      await setQuantity({ bookVariantId: variant._id, quantity: Number(quantity) });
      setMessage("Tersimpan.");
    } catch {
      setMessage("Perubahan format atau stok ditolak.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <form className="admin-variant-row" onSubmit={save}>
      <strong>{variant.format}</strong>
      <Field label="ISBN">
        <input className="input" value={isbn} onChange={(event) => setIsbn(event.target.value)} required />
      </Field>
      <Field label="Harga IDR">
        <input
          className="input"
          type="number"
          min="1"
          step="1"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          required
        />
      </Field>
      <Field label="Ready Stock">
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={quantity}
          onChange={(event) => setStock(event.target.value)}
          required
        />
      </Field>
      <Field label="Harga GBP (pence)" hint="Harga pemasok; kosong bila belum tersedia">
        <input
          className="input"
          type="number"
          min="0"
          step="1"
          value={supplierPriceGbp}
          onChange={(event) => setSupplierPriceGbp(event.target.value)}
        />
      </Field>
      <InlineBooleanField checked={enabled} label="Aktif" onChange={setEnabled} />
      <Button type="submit" variant="secondary" loading={isSaving} loadingLabel="Menyimpan…">
        Simpan
      </Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </form>
  );
}

function BookEditor({ book }: { book: AdminBook }) {
  const publishers = useQuery(api.publishers.list, { paginationOpts: { numItems: 100, cursor: null } });
  const updateBook = useMutation(api.books.update);
  const createVariant = useMutation(api.bookVariants.create);
  const attachCover = useAction(api.books.attachCover);
  const updateCoverPresentation = useMutation(api.books.updateCoverPresentation);
  const attachGalleryImage = useAction(api.books.attachGalleryImage);
  const removeGalleryImage = useMutation(api.books.removeGalleryImage);
  const moveGalleryImage = useMutation(api.books.moveGalleryImage);
  const updateExternalPreview = useMutation(api.books.updateExternalPreview);
  const [publisherId, setPublisherId] = useState(book.publisherId);
  const [title, setTitle] = useState(book.title);
  const [slug, setSlug] = useState(book.slug);
  const [author, setAuthor] = useState(book.author || "");
  const [description, setDescription] = useState(book.description || "");
  const [categories, setCategories] = useState(book.categories.join(", "));
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(book.publicationStatus);
  const [format, setFormat] = useState<BookFormat>("PB");
  const [isbn, setIsbn] = useState("");
  const [price, setPrice] = useState("");
  const [supplierPriceGbp, setSupplierPriceGbp] = useState("");
  const [bookMessage, setBookMessage] = useState("");
  const [bookError, setBookError] = useState("");
  const [variantMessage, setVariantMessage] = useState("");
  const [coverMessage, setCoverMessage] = useState("");
  const [coverError, setCoverError] = useState("");
  const [galleryFile, setGalleryFile] = useState<File | null>(null);
  const [galleryAltText, setGalleryAltText] = useState(book.title);
  const [galleryMessage, setGalleryMessage] = useState("");
  const [galleryError, setGalleryError] = useState("");
  const [galleryPendingMediaId, setGalleryPendingMediaId] = useState<string | null>(null);
  const [previewLabel, setPreviewLabel] = useState(book.externalPreviewLabel || "");
  const [previewUrl, setPreviewUrl] = useState(book.externalPreviewUrl || "");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "book" | "publish" | "variant" | "cover" | "gallery" | "preview" | null
  >(null);
  const { getToken, sessionClaims } = useAuth();

  function bookInput(nextPublicationStatus?: PublicationStatus) {
    return {
      bookId: book._id,
      publisherId,
      title,
      slug,
      author,
      description,
      categories: categories.split(","),
      publicationStatus: nextPublicationStatus,
    };
  }

  async function saveBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookMessage("");
    setBookError("");
    setPendingAction("book");
    try {
      await updateBook(bookInput(publicationStatus === "published" ? undefined : publicationStatus));
      const savedStatus = publicationStatus === "published" ? book.publicationStatus : publicationStatus;
      setBookMessage(
        savedStatus === "draft" ? "✓ Perubahan tersimpan. Tersimpan sebagai draf." : "✓ Perubahan tersimpan.",
      );
    } catch {
      setBookError("Perubahan belum tersimpan. Periksa isian lalu coba lagi.");
    } finally {
      setPendingAction(null);
    }
  }

  async function publishBook() {
    setBookMessage("");
    setBookError("");
    setPendingAction("publish");
    try {
      await updateBook(bookInput("published"));
      setPublicationStatus("published");
      setBookMessage("✓ Buku diterbitkan.");
    } catch {
      setBookError("Buku belum diterbitkan. Periksa isian wajib lalu coba lagi.");
    } finally {
      setPendingAction(null);
    }
  }

  async function saveCover(presentation: CoverPresentation) {
    setCoverMessage("");
    setCoverError("");
    setPendingAction("cover");
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
          presentation,
        });
        setCoverFile(null);
        setCoverMessage("Cover dan tampilannya tersimpan.");
      } else {
        await updateCoverPresentation({ bookId: book._id, presentation });
        setCoverMessage("Tampilan cover tersimpan.");
      }
    } catch {
      setCoverError("Cover atau tampilannya belum tersimpan. Coba lagi.");
    } finally {
      setPendingAction(null);
    }
  }

  async function uploadGalleryImage() {
    if (!galleryFile) return;
    setGalleryMessage("");
    setGalleryError("");
    setPendingAction("gallery");
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
    } catch {
      setGalleryError("Gambar galeri belum tersimpan. Coba lagi.");
    } finally {
      setPendingAction(null);
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

  async function saveExternalPreview() {
    setPreviewMessage("");
    setPreviewError("");
    if (previewUrl && !/^https:\/\//i.test(previewUrl.trim())) {
      setPreviewError("Pratinjau eksternal harus menggunakan HTTPS.");
      return;
    }
    setPendingAction("preview");
    try {
      await updateExternalPreview({ bookId: book._id, label: previewLabel, url: previewUrl });
      setPreviewMessage(previewUrl.trim() ? "Pratinjau eksternal tersimpan." : "Pratinjau eksternal dihapus.");
    } catch {
      setPreviewError("Pratinjau eksternal belum dapat disimpan.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setVariantMessage("");
    setPendingAction("variant");
    try {
      await createVariant({
        bookId: book._id,
        format,
        isbn,
        priceAmount: Number(price),
        supplierPriceGbpMinor: supplierPriceGbp.trim() ? Number(supplierPriceGbp) : undefined,
      });
      setIsbn("");
      setPrice("");
      setSupplierPriceGbp("");
      setVariantMessage("Format ditambahkan.");
    } catch {
      setVariantMessage("Format ditolak. Periksa ISBN, harga, dan format unik.");
    } finally {
      setPendingAction(null);
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
    <div className="page admin-page">
      <PageHeader
        eyebrow="Master Buku"
        title={book.title}
        actions={
          <StatusBadge tone={book.publicationStatus === "published" ? "positive" : "neutral"}>
            {publicationLabels[book.publicationStatus]}
          </StatusBadge>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card className="admin-book-detail-card">
            <form className="form-card" onSubmit={saveBook}>
              <section className="admin-book-detail-section">
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">INFORMASI BUKU</span>
                    <h2>Identitas dan publikasi</h2>
                  </div>
                </div>
                <div className="form-grid">
                  <Field label="Judul">
                    <input
                      className="input"
                      value={title}
                      onChange={(event) => setTitle(event.target.value)}
                      required
                    />
                  </Field>
                  <Field label="Slug publik">
                    <input className="input" value={slug} onChange={(event) => setSlug(event.target.value)} required />
                  </Field>
                  <Field label="Penerbit">
                    <BFGSelect
                      className="select"
                      value={publisherId}
                      onChange={(event) => setPublisherId(event.target.value as Id<"publishers">)}
                    >
                      {publishers?.page.map((publisher) => (
                        <option value={publisher._id} key={publisher._id}>
                          {publisher.name}
                        </option>
                      ))}
                    </BFGSelect>
                  </Field>
                  <Field label="Penulis">
                    <input className="input" value={author} onChange={(event) => setAuthor(event.target.value)} />
                  </Field>
                  <Field label="Kategori" hint="Pisahkan dengan koma.">
                    <input
                      className="input"
                      value={categories}
                      onChange={(event) => setCategories(event.target.value)}
                    />
                  </Field>
                  <Field label="Status publikasi">
                    <BFGSelect
                      className="select"
                      value={publicationStatus}
                      onChange={(event) => setPublicationStatus(event.target.value as PublicationStatus)}
                    >
                      {book.publicationStatus === "published" ? <option value="published">Terbit</option> : null}
                      <option value="draft">Draf</option>
                      <option value="special">Khusus / privat</option>
                      <option value="archived">Diarsipkan</option>
                    </BFGSelect>
                  </Field>
                </div>
              </section>
              <CoverUploadField
                currentSrc={book.coverUrl || undefined}
                currentPresentation={book.coverPresentation || null}
                error={coverError}
                file={coverFile}
                format={book.variants[0]?.format}
                message={coverMessage}
                onFileChange={handleCoverFileChange}
                onUpload={(presentation) => void saveCover(presentation)}
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
                          onClick={() => void removeGallery(media)}
                          size="compact"
                          type="button"
                          variant="danger"
                        >
                          Hapus
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
              <section className="admin-book-detail-section">
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">PRATINJAU EKSTERNAL</span>
                    <h2>Tambahkan tautan aman</h2>
                  </div>
                </div>
                <div className="form-grid external-preview-field-grid">
                  <label className="field-label external-preview-label-field" htmlFor="external-preview-label">
                    Label tautan
                  </label>
                  <label className="field-label external-preview-url-field" htmlFor="external-preview-url">
                    URL HTTPS
                  </label>
                  <input
                    className="input external-preview-label-control"
                    id="external-preview-label"
                    maxLength={120}
                    placeholder="Mis. Preview Amazon"
                    value={previewLabel}
                    onChange={(event) => setPreviewLabel(event.target.value)}
                  />
                  <input
                    aria-describedby={
                      previewError ? "external-preview-url-help external-preview-error" : "external-preview-url-help"
                    }
                    className="input external-preview-url-control"
                    id="external-preview-url"
                    inputMode="url"
                    placeholder="https://..."
                    type="url"
                    value={previewUrl}
                    onChange={(event) => setPreviewUrl(event.target.value)}
                  />
                  <div className="external-preview-support">
                    <span className="field-hint" id="external-preview-url-help">
                      BFG tidak mengambil, menyematkan, atau meng-hotlink isi tautan.
                    </span>
                    {previewError ? (
                      <span className="error-text" id="external-preview-error" role="alert">
                        {previewError}
                      </span>
                    ) : null}
                  </div>
                </div>
                <div className="form-actions">
                  <Button
                    onClick={() => void saveExternalPreview()}
                    loading={pendingAction === "preview"}
                    loadingLabel="Menyimpan…"
                    type="button"
                    variant="secondary"
                  >
                    Simpan pratinjau
                  </Button>
                  {book.externalPreviewUrl ? (
                    <a href={book.externalPreviewUrl} rel="noreferrer noopener" target="_blank">
                      Buka tautan ↗
                    </a>
                  ) : null}
                </div>
                {previewMessage ? (
                  <p className="subtle" role="status">
                    {previewMessage}
                  </p>
                ) : null}
              </section>
              <section className="admin-book-detail-section">
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">DESKRIPSI</span>
                    <h2>Ceritakan isi buku</h2>
                  </div>
                </div>
                <Field label="Deskripsi">
                  <textarea
                    className="textarea"
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                  />
                </Field>
              </section>
              <ActionGroup variant="responsive">
                <Button
                  type="submit"
                  loading={pendingAction === "book"}
                  disabled={pendingAction !== null}
                  loadingLabel="Menyimpan…"
                >
                  Simpan Master Buku
                </Button>
                {book.publicationStatus !== "published" && book.publicationStatus !== "archived" ? (
                  <Button
                    type="button"
                    variant="secondary"
                    loading={pendingAction === "publish"}
                    disabled={pendingAction !== null}
                    loadingLabel="Menerbitkan…"
                    onClick={() => void publishBook()}
                  >
                    Terbitkan buku
                  </Button>
                ) : null}
              </ActionGroup>
              {bookError ? (
                <p className="error-text" role="alert">
                  {bookError}
                </p>
              ) : null}
              {bookMessage ? (
                <p className="success-banner" role="status">
                  {bookMessage}
                </p>
              ) : null}
            </form>
          </Card>
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">VARIANT / ISBN / HARGA</span>
                <h2>Format dan Ready Stock</h2>
              </div>
            </div>
            <div className="content-stack">
              {book.variants.map((variant) => (
                <VariantRow variant={variant} key={variant._id} />
              ))}
              {!book.variants.length ? <p>Belum ada format.</p> : null}
            </div>
            <form className="admin-variant-create" onSubmit={addVariant}>
              <Field label="Format">
                <BFGSelect
                  className="select"
                  value={format}
                  onChange={(event) => setFormat(event.target.value as BookFormat)}
                >
                  <option value="BB">BB</option>
                  <option value="PB">PB</option>
                  <option value="HB">HB</option>
                </BFGSelect>
              </Field>
              <Field label="ISBN">
                <input className="input" value={isbn} onChange={(event) => setIsbn(event.target.value)} required />
              </Field>
              <Field label="Harga IDR">
                <input
                  className="input"
                  type="number"
                  min="1"
                  step="1"
                  value={price}
                  onChange={(event) => setPrice(event.target.value)}
                  required
                />
              </Field>
              <Field label="Harga GBP (pence)">
                <input
                  className="input"
                  type="number"
                  min="0"
                  step="1"
                  value={supplierPriceGbp}
                  onChange={(event) => setSupplierPriceGbp(event.target.value)}
                />
              </Field>
              <Button
                type="submit"
                variant="secondary"
                loading={pendingAction === "variant"}
                loadingLabel="Menambahkan…"
              >
                Tambah format
              </Button>
            </form>
            {variantMessage ? (
              <p className="subtle" role="status">
                {variantMessage}
              </p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ConnectedAdminBookDetail({ bookId }: { bookId: Id<"books"> }) {
  const book = useQuery(api.books.getForAdmin, { bookId });
  if (book === undefined) {
    return (
      <LoadingRegion label="Memuat buku">
        <SkeletonCard />
        <SkeletonCard variant="book" />
      </LoadingRegion>
    );
  }
  if (!book) return <div className="state-panel">Buku tidak ditemukan.</div>;
  return <BookEditor book={book} />;
}

export function AdminBookDetail({ bookId }: { bookId: string }) {
  return useProduct().dataSource === "convex" ? (
    <ConnectedAdminBookDetail bookId={bookId as Id<"books">} />
  ) : (
    <div className="state-panel">Master Buku memerlukan sumber data Convex.</div>
  );
}
