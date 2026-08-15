"use client";

import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useState } from "react";
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
import { BookCover } from "@/components/book-cover";

type AdminBook = NonNullable<FunctionReturnType<typeof api.books.getForAdmin>>;
type Variant = AdminBook["variants"][number];
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
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"book" | "variant" | "cover" | null>(null);
  const coverPreviewUrl = useMemo(() => (coverFile ? URL.createObjectURL(coverFile) : null), [coverFile]);

  useEffect(() => {
    if (coverPreviewUrl) return () => URL.revokeObjectURL(coverPreviewUrl);
  }, [coverPreviewUrl]);

  async function saveBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
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
      setMessage("Master Buku tersimpan.");
    } catch {
      setMessage("Master Buku tidak dapat disimpan.");
    } finally {
      setPendingAction(null);
    }
  }

  async function uploadCover() {
    if (!coverFile) return;
    setMessage("");
    setPendingAction("cover");
    try {
      if (!["image/jpeg", "image/png", "image/webp"].includes(coverFile.type) || coverFile.size > 5_000_000) {
        throw new Error("invalid cover");
      }
      const uploadUrl = await generateCoverUploadUrl({});
      const response = await fetch(uploadUrl, {
        method: "POST",
        headers: { "Content-Type": coverFile.type },
        body: coverFile,
      });
      if (!response.ok) throw new Error("unggah gagal");
      const { storageId } = (await response.json()) as { storageId: Id<"_storage"> };
      await attachCover({ bookId: book._id, storageId });
      setCoverFile(null);
      setMessage("Cover tersimpan.");
    } catch {
      setMessage("Cover harus berupa JPG, PNG, atau WebP maksimal 5 MB.");
    } finally {
      setPendingAction(null);
    }
  }

  async function addVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setPendingAction("variant");
    try {
      await createVariant({ bookId: book._id, format, isbn, priceAmount: Number(price) });
      setIsbn("");
      setPrice("");
      setMessage("Format ditambahkan.");
    } catch {
      setMessage("Format ditolak. Periksa ISBN, harga, dan format unik.");
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
          <StatusBadge tone={book.publicationStatus === "published" ? "positive" : "neutral"}>
            {publicationLabels[book.publicationStatus]}
          </StatusBadge>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card>
            <form className="form-card" onSubmit={saveBook}>
              <div className="form-grid">
                <Field label="Judul">
                  <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
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
                  <input className="input" value={categories} onChange={(event) => setCategories(event.target.value)} />
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
              <div className="admin-cover-editor">
                <BookCover
                  title={book.title}
                  publisher={book.publisher?.name || "BFG"}
                  src={coverPreviewUrl || book.coverUrl || undefined}
                />
                <Field label="Unggah cover" hint="JPG, PNG, atau WebP. Maksimal 5 MB.">
                  <input
                    className="input"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={(event) => setCoverFile(event.target.files?.[0] || null)}
                  />
                </Field>
                <Button
                  type="button"
                  variant="secondary"
                  disabled={!coverFile}
                  pending={pendingAction === "cover"}
                  pendingLabel="Mengunggah…"
                  onClick={() => void uploadCover()}
                >
                  Simpan cover
                </Button>
              </div>
              {coverFile ? (
                <p className="subtle" role="status">
                  Preview siap disimpan: {coverFile.name}
                </p>
              ) : null}
              <Field label="Deskripsi">
                <textarea
                  className="textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Button type="submit" pending={pendingAction === "book"} pendingLabel="Menyimpan…">
                Simpan Master Buku
              </Button>
            </form>
          </Card>
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Format dan Ready Stock</span>
                <h2>ISBN, harga, dan jumlah per format</h2>
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
            {message ? (
              <p className="subtle" role="status">
                {message}
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
