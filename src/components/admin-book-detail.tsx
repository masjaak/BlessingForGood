"use client";

import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import {
  ActionGroup,
  Button,
  Card,
  ConfirmationDialog,
  Field,
  InlineBooleanField,
  LinkButton,
  LoadingRegion,
  PageHeader,
  Skeleton,
  SkeletonText,
  StatusBadge,
} from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";
import { productErrorMessage } from "@/domain/prototype/errors";
import { AdminBookMedia } from "@/features/admin-books/media/admin-book-media";
import { formatGbpMinor, normalizeGbpInput, parseGbpMinor } from "@/lib/gbp";
import { BOOK_CATEGORIES, BOOK_FORMATS, type BookCategory, type BookFormat } from "@/domain/prototype/types";

type AdminBook = NonNullable<FunctionReturnType<typeof api.books.getForAdmin>>;
type Variant = AdminBook["variants"][number];
type PublicationStatus = "draft" | "published" | "special" | "archived";

const publicationLabels: Record<PublicationStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  special: "Khusus / privat",
  archived: "Diarsipkan",
};

function BookDetailSkeleton() {
  return (
    <>
      <Card className="admin-book-detail-card workspace-skeleton-book-detail" aria-hidden="true">
        <SkeletonText width="38%" />
        <SkeletonText className="skeleton-list-title" width="58%" />
        <div className="workspace-skeleton-form-grid">
          {Array.from({ length: 6 }, (_, index) => (
            <Skeleton className="skeleton-field" key={index} />
          ))}
        </div>
        <Skeleton className="workspace-skeleton-book-media" />
        <SkeletonText width="32%" />
        <SkeletonText className="skeleton-list-title" width="64%" />
        <div className="workspace-skeleton-form-grid">
          <Skeleton className="skeleton-field" />
          <Skeleton className="skeleton-field" />
        </div>
        <Skeleton className="skeleton-field workspace-skeleton-book-description" />
        <Skeleton className="skeleton-cta" />
      </Card>
      <Card aria-hidden="true">
        <SkeletonText width="48%" />
        <SkeletonText className="skeleton-list-title" width="62%" />
        {Array.from({ length: 3 }, (_, index) => (
          <div className="summary-line" key={index}>
            <SkeletonText width={index % 2 ? "68%" : "82%"} />
            <Skeleton className="skeleton-status" />
          </div>
        ))}
        <div className="workspace-skeleton-form-grid">
          {Array.from({ length: 4 }, (_, index) => (
            <Skeleton className="skeleton-field" key={index} />
          ))}
        </div>
        <Skeleton className="skeleton-cta" />
      </Card>
    </>
  );
}

function VariantRow({ variant }: { variant: Variant }) {
  const updateVariant = useMutation(api.bookVariants.update);
  const removeVariant = useMutation(api.bookVariants.remove);
  const setQuantity = useMutation(api.readyStock.setQuantity);
  const [isbn, setIsbn] = useState(variant.isbn);
  const [price, setPrice] = useState(String(variant.priceAmount));
  const [supplierPriceGbp, setSupplierPriceGbp] = useState(
    variant.supplierPriceGbpMinor === undefined ? "" : formatGbpMinor(variant.supplierPriceGbpMinor),
  );
  const [quantity, setStock] = useState(String(variant.stockQuantity));
  const [enabled, setEnabled] = useState(variant.isAvailable);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      await updateVariant({
        bookVariantId: variant._id,
        isbn,
        priceAmount: Number(price),
        supplierPriceGbpMinor: parseGbpMinor(supplierPriceGbp),
        isAvailable: enabled,
      });
      await setQuantity({ bookVariantId: variant._id, quantity: Number(quantity) });
      setMessage("Tersimpan.");
    } catch (reason) {
      setMessage(
        reason instanceof Error && reason.message.startsWith("Harga GBP")
          ? reason.message
          : "Perubahan format atau stok ditolak.",
      );
    } finally {
      setIsSaving(false);
    }
  }

  async function remove() {
    setIsDeleting(true);
    setMessage("");
    try {
      await removeVariant({ bookVariantId: variant._id });
      setMessage("Format dihapus.");
    } catch (reason) {
      setMessage(productErrorMessage(reason, "Format belum dapat dihapus."));
    } finally {
      setIsDeleting(false);
      setConfirmDelete(false);
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
      <Field label="Harga GBP (£)" hint="Harga pemasok; gunakan titik, contoh 19.99. Kosong bila belum tersedia">
        <input
          className="input"
          type="text"
          inputMode="decimal"
          value={supplierPriceGbp}
          onChange={(event) => setSupplierPriceGbp(normalizeGbpInput(event.target.value))}
        />
      </Field>
      <InlineBooleanField checked={enabled} label="Aktif" onChange={setEnabled} />
      <Button type="submit" variant="secondary" loading={isSaving} loadingLabel="Menyimpan…">
        Simpan
      </Button>
      <Button
        type="button"
        variant="danger"
        size="compact"
        loading={isDeleting}
        loadingLabel="Menghapus…"
        disabled={isSaving}
        onClick={() => setConfirmDelete(true)}
      >
        Hapus format
      </Button>
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
      <ConfirmationDialog
        open={confirmDelete}
        title="Hapus format ini?"
        description="Format hanya dapat dihapus bila belum dipakai katalog, pesanan, atau riwayat stok."
        confirmLabel="Hapus format"
        danger
        onCancel={() => setConfirmDelete(false)}
        onConfirm={() => void remove()}
      />
    </form>
  );
}

function BookEditor({ book }: { book: AdminBook }) {
  const router = useRouter();
  const publishers = useQuery(api.publishers.list, { paginationOpts: { numItems: 100, cursor: null } });
  const updateBook = useMutation(api.books.update);
  const removeBook = useMutation(api.books.remove);
  const createVariant = useMutation(api.bookVariants.create);
  const updateExternalPreview = useMutation(api.books.updateExternalPreview);
  const [publisherId, setPublisherId] = useState(book.publisherId);
  const [title, setTitle] = useState(book.title);
  const [slug, setSlug] = useState(book.slug);
  const [author, setAuthor] = useState(book.author || "");
  const [description, setDescription] = useState(book.description || "");
  const [categories, setCategories] = useState(
    book.categories.filter((category) => !BOOK_CATEGORIES.includes(category as BookCategory)).join(", "),
  );
  const [bookCategory, setBookCategory] = useState<BookCategory | "">(
    BOOK_CATEGORIES.find((category) => book.categories.includes(category)) || "",
  );
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(book.publicationStatus);
  const [format, setFormat] = useState<BookFormat>("PB");
  const [isbn, setIsbn] = useState("");
  const [price, setPrice] = useState("");
  const [supplierPriceGbp, setSupplierPriceGbp] = useState("");
  const [bookMessage, setBookMessage] = useState("");
  const [bookError, setBookError] = useState("");
  const [variantMessage, setVariantMessage] = useState("");
  const [confirmDeleteBook, setConfirmDeleteBook] = useState(false);
  const [previewLabel, setPreviewLabel] = useState(book.externalPreviewLabel || "");
  const [previewUrl, setPreviewUrl] = useState(book.externalPreviewUrl || "");
  const [previewMessage, setPreviewMessage] = useState("");
  const [previewError, setPreviewError] = useState("");
  const [pendingAction, setPendingAction] = useState<
    "book" | "publish" | "variant" | "cover" | "gallery" | "preview" | "delete" | "archive" | null
  >(null);

  function bookInput(nextPublicationStatus?: PublicationStatus) {
    const extraCategories = categories
      .split(",")
      .filter((category) => category.trim() && !BOOK_CATEGORIES.includes(category.trim() as BookCategory));
    return {
      bookId: book._id,
      publisherId,
      title,
      slug,
      author,
      description,
      categories: bookCategory ? [bookCategory, ...extraCategories] : extraCategories,
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

  async function deleteBook() {
    setBookMessage("");
    setBookError("");
    setPendingAction("delete");
    try {
      await removeBook({ bookId: book._id });
      router.push("/admin/books");
    } catch (reason) {
      setBookError(productErrorMessage(reason, "Buku belum dapat dihapus."));
    } finally {
      setPendingAction(null);
      setConfirmDeleteBook(false);
    }
  }

  async function archiveBook() {
    setBookMessage("");
    setBookError("");
    setPendingAction("archive");
    try {
      await updateBook(bookInput("archived"));
      setPublicationStatus("archived");
      setBookMessage("Buku diarsipkan.");
    } catch {
      setBookError("Buku belum dapat diarsipkan. Silakan coba lagi.");
    } finally {
      setPendingAction(null);
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
        supplierPriceGbpMinor: parseGbpMinor(supplierPriceGbp),
      });
      setIsbn("");
      setPrice("");
      setSupplierPriceGbp("");
      setVariantMessage("Format ditambahkan.");
    } catch (reason) {
      setVariantMessage(
        reason instanceof Error && reason.message.startsWith("Harga GBP")
          ? reason.message
          : "Format ditolak. Periksa ISBN, harga, dan format unik.",
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Master Buku"
        title={book.title}
        actions={
          <>
            <LinkButton href="#book-editor" variant="secondary">
              Edit
            </LinkButton>
            <Button
              type="button"
              variant="danger"
              loading={pendingAction === "delete"}
              disabled={pendingAction !== null}
              loadingLabel="Menghapus…"
              onClick={() => setConfirmDeleteBook(true)}
            >
              Hapus buku
            </Button>
            {book.publicationStatus !== "draft" && book.publicationStatus !== "archived" ? (
              <Button
                type="button"
                variant="secondary"
                loading={pendingAction === "archive"}
                loadingLabel="Mengarsipkan…"
                disabled={pendingAction !== null}
                onClick={() => void archiveBook()}
              >
                Arsipkan buku
              </Button>
            ) : null}
            <StatusBadge tone={book.publicationStatus === "published" ? "positive" : "neutral"}>
              {publicationLabels[book.publicationStatus]}
            </StatusBadge>
          </>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card className="admin-book-detail-card">
            <form className="form-card" id="book-editor" onSubmit={saveBook}>
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
                  <Field label="Kategori buku">
                    <BFGSelect
                      className="select"
                      value={bookCategory}
                      onChange={(event) => setBookCategory(event.target.value as BookCategory | "")}
                    >
                      <option value="">Belum dikategorikan</option>
                      {BOOK_CATEGORIES.map((category) => (
                        <option value={category} key={category}>
                          {category}
                        </option>
                      ))}
                    </BFGSelect>
                  </Field>
                  <Field label="Kategori tambahan" hint="Opsional; pisahkan dengan koma.">
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
              <AdminBookMedia
                book={book}
                pendingAction={pendingAction === "cover" || pendingAction === "gallery" ? pendingAction : null}
                onPendingActionChange={(nextAction) => setPendingAction(nextAction)}
              />
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
                  {BOOK_FORMATS.map((value) => (
                    <option value={value} key={value}>
                      {value}
                    </option>
                  ))}
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
              <Field label="Harga GBP (£)" hint="Harga pemasok; gunakan titik, contoh 19.99">
                <input
                  className="input"
                  type="text"
                  inputMode="decimal"
                  value={supplierPriceGbp}
                  onChange={(event) => setSupplierPriceGbp(normalizeGbpInput(event.target.value))}
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
          <ConfirmationDialog
            open={confirmDeleteBook}
            title="Hapus buku secara permanen?"
            description={`Book Master ${book.title} (${book.publisher?.name || "penerbit tidak diketahui"}; ISBN ${book.variants.map((variant) => variant.isbn).join(", ") || "tidak tersedia"}) akan dihapus. Riwayat Order, Invoice, Payment, Batch, dan Audit tetap disimpan.`}
            confirmLabel="Hapus buku"
            danger
            onCancel={() => setConfirmDeleteBook(false)}
            onConfirm={() => void deleteBook()}
          />
        </div>
      </div>
    </div>
  );
}

function ConnectedAdminBookDetail({ bookId }: { bookId: Id<"books"> }) {
  const book = useQuery(api.books.getForAdmin, { bookId });
  if (book === undefined) {
    return (
      <div className="page admin-page">
        <PageHeader
          eyebrow="Master Buku"
          title="Detail buku"
          loading
          skeleton={{ titleWidth: "52%", actionWidths: ["74px", "112px", "132px"] }}
        />
        <div className="admin-workspace">
          <AdminNav />
          <div className="admin-content">
            <LoadingRegion label="Memuat buku">
              <BookDetailSkeleton />
            </LoadingRegion>
          </div>
        </div>
      </div>
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
