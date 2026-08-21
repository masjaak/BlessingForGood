"use client";

import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import {
  Button,
  Card,
  Field,
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
      <InlineBooleanField checked={enabled} label="Aktif" onChange={setEnabled} />
      <Button type="submit" variant="secondary" pending={isSaving} pendingLabel="Menyimpan…">
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
  const generateCoverUploadUrl = useMutation(api.books.generateCoverUploadUrl);
  const attachCover = useMutation(api.books.attachCover);
  const updateCoverPresentation = useMutation(api.books.updateCoverPresentation);
  const generateGalleryUploadUrl = useMutation(api.books.generateGalleryUploadUrl);
  const attachGalleryImage = useMutation(api.books.attachGalleryImage);
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
  const [bookMessage, setBookMessage] = useState("");
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
  const [pendingAction, setPendingAction] = useState<"book" | "variant" | "cover" | "gallery" | "preview" | null>(null);

  async function saveBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBookMessage("");
    setPendingAction("book");
    try {
      await updateBook({
        bookId: book._id,
        publisherId,
        title,
        slug,
        author,
        description,
        categories: categories.split(","),
        publicationStatus,
      });
      setBookMessage("Master Buku tersimpan.");
    } catch {
      setBookMessage("Master Buku tidak dapat disimpan.");
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
        const uploadUrl = await generateCoverUploadUrl({});
        const response = await fetch(uploadUrl, {
          method: "POST",
          headers: { "Content-Type": coverFile.type },
          body: coverFile,
        });
        if (!response.ok) throw new Error("unggah gagal");
        const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
        await attachCover({ bookId: book._id, storageId, presentation });
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
      const uploadUrl = await generateGalleryUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": galleryFile.type },
        body: galleryFile,
      });
      if (!response.ok) throw new Error("unggah gagal");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await attachGalleryImage({ bookId: book._id, storageId, altText: galleryAltText });
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
      await createVariant({ bookId: book._id, format, isbn, priceAmount: Number(price) });
      setIsbn("");
      setPrice("");
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
                      <option value="draft">Draf</option>
                      <option value="published">Terbit</option>
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
                pending={pendingAction === "cover"}
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
                        <Button
                          aria-label={`Naikkan gambar ${index + 1}`}
                          disabled={index === 0 || galleryPendingMediaId === media.mediaId}
                          onClick={() => void moveGallery(media, "up")}
                          size="compact"
                          type="button"
                          variant="quiet"
                        >
                          ↑
                        </Button>
                        <Button
                          aria-label={`Turunkan gambar ${index + 1}`}
                          disabled={index === book.gallery.length - 1 || galleryPendingMediaId === media.mediaId}
                          onClick={() => void moveGallery(media, "down")}
                          size="compact"
                          type="button"
                          variant="quiet"
                        >
                          ↓
                        </Button>
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
                <div className="form-grid">
                  <Field label="Alt text gambar" hint="Maksimal 160 karakter.">
                    <input
                      className="input"
                      maxLength={160}
                      value={galleryAltText}
                      onChange={(event) => setGalleryAltText(event.target.value)}
                    />
                  </Field>
                  <Field label="Pilih gambar" hint="JPG, PNG, atau WebP. Maksimal 5 MB.">
                    <input
                      accept="image/jpeg,image/png,image/webp"
                      className="input"
                      onChange={(event) => handleGalleryFileChange(event.target.files?.[0] || null)}
                      type="file"
                    />
                  </Field>
                </div>
                <div className="form-actions">
                  <Button
                    disabled={!galleryFile || book.gallery.length >= 8}
                    onClick={() => void uploadGalleryImage()}
                    pending={pendingAction === "gallery"}
                    pendingLabel="Mengunggah…"
                    type="button"
                    variant="secondary"
                  >
                    Simpan gambar
                  </Button>
                  <span className="subtle">{galleryFile?.name || "Belum ada file dipilih"}</span>
                </div>
                {galleryError ? <p className="error-text">{galleryError}</p> : null}
                {galleryMessage ? (
                  <p className="subtle" role="status">
                    {galleryMessage}
                  </p>
                ) : null}
              </section>
              <section className="admin-book-detail-section">
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">PRATINJAU EKSTERNAL</span>
                    <h2>Tambahkan tautan aman</h2>
                  </div>
                </div>
                <div className="form-grid">
                  <Field label="Label tautan">
                    <input
                      className="input"
                      maxLength={120}
                      placeholder="Mis. Preview Amazon"
                      value={previewLabel}
                      onChange={(event) => setPreviewLabel(event.target.value)}
                    />
                  </Field>
                  <Field label="URL HTTPS" hint="BFG tidak mengambil, menyematkan, atau meng-hotlink isi tautan.">
                    <input
                      className="input"
                      inputMode="url"
                      placeholder="https://..."
                      type="url"
                      value={previewUrl}
                      onChange={(event) => setPreviewUrl(event.target.value)}
                    />
                  </Field>
                </div>
                <div className="form-actions">
                  <Button
                    onClick={() => void saveExternalPreview()}
                    pending={pendingAction === "preview"}
                    pendingLabel="Menyimpan…"
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
                {previewError ? <p className="error-text">{previewError}</p> : null}
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
              <Button type="submit" pending={pendingAction === "book"} pendingLabel="Menyimpan…">
                Simpan Master Buku
              </Button>
              {bookMessage ? (
                <p className="subtle" role="status">
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
              <Button
                type="submit"
                variant="secondary"
                pending={pendingAction === "variant"}
                pendingLabel="Menambahkan…"
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
  return <BookEditor book={book} key={book.updatedAt} />;
}

export function AdminBookDetail({ bookId }: { bookId: string }) {
  return useProduct().dataSource === "convex" ? (
    <ConnectedAdminBookDetail bookId={bookId as Id<"books">} />
  ) : (
    <div className="state-panel">Master Buku memerlukan sumber data Convex.</div>
  );
}
