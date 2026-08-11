"use client";

import type { FunctionReturnType } from "convex/server";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { Button, Card, Field, PageHeader, StatusBadge } from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";

type AdminBook = NonNullable<FunctionReturnType<typeof api.books.getForAdmin>>;
type Variant = AdminBook["variants"][number];
type BookFormat = "BB" | "PB" | "HB";
type PublicationStatus = "draft" | "published" | "special" | "archived";

function VariantRow({ variant }: { variant: Variant }) {
  const updateVariant = useMutation(api.bookVariants.update);
  const setQuantity = useMutation(api.readyStock.setQuantity);
  const [isbn, setIsbn] = useState(variant.isbn);
  const [price, setPrice] = useState(String(variant.priceAmount));
  const [quantity, setStock] = useState(String(variant.stockQuantity));
  const [enabled, setEnabled] = useState(variant.isAvailable);
  const [message, setMessage] = useState("");

  async function save(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
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
      <label className="check-row">
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} />
        Aktif
      </label>
      <Button type="submit" variant="secondary">
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
  const [publisherId, setPublisherId] = useState(book.publisherId);
  const [title, setTitle] = useState(book.title);
  const [slug, setSlug] = useState(book.slug);
  const [author, setAuthor] = useState(book.author || "");
  const [description, setDescription] = useState(book.description || "");
  const [categories, setCategories] = useState(book.categories.join(", "));
  const [coverImageUrl, setCoverImageUrl] = useState(book.coverImageUrl || "");
  const [publicationStatus, setPublicationStatus] = useState<PublicationStatus>(book.publicationStatus);
  const [format, setFormat] = useState<BookFormat>("PB");
  const [isbn, setIsbn] = useState("");
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");

  async function saveBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await updateBook({
        bookId: book._id,
        publisherId,
        title,
        slug,
        author,
        description,
        categories: categories.split(","),
        coverImageUrl,
        publicationStatus,
      });
      setMessage("Book Master tersimpan.");
    } catch {
      setMessage("Book Master tidak dapat disimpan.");
    }
  }

  async function addVariant(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createVariant({ bookId: book._id, format, isbn, priceAmount: Number(price) });
      setIsbn("");
      setPrice("");
      setMessage("Format ditambahkan.");
    } catch {
      setMessage("Format ditolak. Periksa ISBN, harga, dan format unik.");
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Book Master"
        title={book.title}
        actions={
          <StatusBadge tone={book.publicationStatus === "published" ? "positive" : "neutral"}>
            {book.publicationStatus}
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
                  <select
                    className="select"
                    value={publisherId}
                    onChange={(event) => setPublisherId(event.target.value as Id<"publishers">)}
                  >
                    {publishers?.page.map((publisher) => (
                      <option value={publisher._id} key={publisher._id}>
                        {publisher.name}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Penulis">
                  <input className="input" value={author} onChange={(event) => setAuthor(event.target.value)} />
                </Field>
                <Field label="Kategori" hint="Pisahkan dengan koma.">
                  <input className="input" value={categories} onChange={(event) => setCategories(event.target.value)} />
                </Field>
                <Field label="Status publikasi">
                  <select
                    className="select"
                    value={publicationStatus}
                    onChange={(event) => setPublicationStatus(event.target.value as PublicationStatus)}
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                    <option value="special">Special/private</option>
                    <option value="archived">Archived</option>
                  </select>
                </Field>
              </div>
              <Field
                label="Referensi cover"
                hint="Gunakan referensi gambar yang sudah dikelola; upload belum tersedia."
              >
                <input
                  className="input"
                  value={coverImageUrl}
                  onChange={(event) => setCoverImageUrl(event.target.value)}
                />
              </Field>
              <Field label="Deskripsi">
                <textarea
                  className="textarea"
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                />
              </Field>
              <Button type="submit">Simpan Book Master</Button>
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
                <select
                  className="select"
                  value={format}
                  onChange={(event) => setFormat(event.target.value as BookFormat)}
                >
                  <option value="BB">BB</option>
                  <option value="PB">PB</option>
                  <option value="HB">HB</option>
                </select>
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
              <Button type="submit" variant="secondary">
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
  if (book === undefined) return <div className="state-panel">Memuat buku…</div>;
  if (!book) return <div className="state-panel">Buku tidak ditemukan.</div>;
  return <BookEditor book={book} key={book.updatedAt} />;
}

export function AdminBookDetail({ bookId }: { bookId: string }) {
  return useProduct().dataSource === "convex" ? (
    <ConnectedAdminBookDetail bookId={bookId as Id<"books">} />
  ) : (
    <div className="state-panel">Book Master memerlukan sumber data Convex.</div>
  );
}
