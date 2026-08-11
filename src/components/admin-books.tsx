"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { Button, Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";

type PublicationStatus = "draft" | "published" | "special" | "archived";
type Availability = "in_stock" | "out_of_stock" | "not_listed";

function ConnectedAdminBooks() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<PublicationStatus | "">("");
  const [availability, setAvailability] = useState<Availability | "">("");
  const [publisherName, setPublisherName] = useState("");
  const [publisherId, setPublisherId] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [message, setMessage] = useState("");
  const publishers = useQuery(api.publishers.list, { paginationOpts: { numItems: 100, cursor: null } });
  const books = useQuery(api.books.listForAdmin, {
    search: search || undefined,
    publicationStatus: status || undefined,
    availability: availability || undefined,
  });
  const createPublisher = useMutation(api.publishers.create);
  const createBook = useMutation(api.books.create);

  async function addPublisher(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const id = await createPublisher({ name: publisherName });
      setPublisherName("");
      setPublisherId(id);
      setMessage("Penerbit dibuat.");
    } catch {
      setMessage("Penerbit tidak dapat dibuat.");
    }
  }

  async function addBook(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const bookId = await createBook({
        publisherId: publisherId as Id<"publishers">,
        title,
        author: author || undefined,
      });
      router.push(`/admin/books/${bookId}`);
    } catch {
      setMessage("Buku tidak dapat dibuat. Periksa judul dan slug uniknya.");
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Book Master"
        title="Kelola buku dan Ready Stock"
        description="Metadata buku dipakai ulang; katalog rahasia dan Ready Stock hanya mengatur konteksnya."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card className="admin-book-create">
            <form className="form-actions" onSubmit={addPublisher}>
              <Field label="Penerbit baru">
                <input
                  className="input"
                  value={publisherName}
                  onChange={(event) => setPublisherName(event.target.value)}
                  required
                />
              </Field>
              <Button type="submit" variant="secondary">
                Tambah penerbit
              </Button>
            </form>
            <form className="form-actions" onSubmit={addBook}>
              <Field label="Penerbit">
                <select
                  className="select"
                  value={publisherId}
                  onChange={(event) => setPublisherId(event.target.value)}
                  required
                >
                  <option value="">Pilih penerbit</option>
                  {publishers?.page.map((publisher) => (
                    <option value={publisher._id} key={publisher._id}>
                      {publisher.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Judul">
                <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
              </Field>
              <Field label="Penulis">
                <input className="input" value={author} onChange={(event) => setAuthor(event.target.value)} />
              </Field>
              <Button type="submit">Buat draft buku</Button>
            </form>
            {message ? (
              <p className="subtle" role="status">
                {message}
              </p>
            ) : null}
          </Card>
          <Card className="admin-book-filters">
            <Field label="Cari">
              <input
                className="input"
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Judul, penulis, penerbit, ISBN"
              />
            </Field>
            <Field label="Publikasi">
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as PublicationStatus | "")}
              >
                <option value="">Semua</option>
                <option value="draft">Draft</option>
                <option value="published">Published</option>
                <option value="special">Special/private</option>
                <option value="archived">Archived</option>
              </select>
            </Field>
            <Field label="Ready Stock">
              <select
                className="select"
                value={availability}
                onChange={(event) => setAvailability(event.target.value as Availability | "")}
              >
                <option value="">Semua</option>
                <option value="in_stock">Ada stok</option>
                <option value="out_of_stock">Stok kosong</option>
                <option value="not_listed">Belum dicatat</option>
              </select>
            </Field>
          </Card>
          {books === undefined ? <div className="state-panel">Memuat Book Master…</div> : null}
          {books?.length ? (
            <div className="table-wrap">
              <table className="data-table admin-books-table">
                <thead>
                  <tr>
                    <th>Buku</th>
                    <th>Penerbit</th>
                    <th>Format</th>
                    <th>Publikasi</th>
                    <th>Stok</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {books.map((book) => (
                    <tr key={book._id}>
                      <td>
                        <strong>{book.title}</strong>
                        <span className="subtle table-secondary">{book.author || book.slug}</span>
                      </td>
                      <td>{book.publisherName}</td>
                      <td>{book.variants.map((variant) => variant.format).join(" · ") || "—"}</td>
                      <td>
                        <StatusBadge tone={book.publicationStatus === "published" ? "positive" : "neutral"}>
                          {book.publicationStatus}
                        </StatusBadge>
                      </td>
                      <td>{book.isListed ? book.stockQuantity : "Belum dicatat"}</td>
                      <td>
                        <Link className="button button-secondary" href={`/admin/books/${book._id}`}>
                          Edit
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : books ? (
            <EmptyState title="Book Master kosong" description="Buat penerbit dan buku pertama tanpa data dummy." />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function AdminBooks() {
  return useProduct().dataSource === "convex" ? (
    <ConnectedAdminBooks />
  ) : (
    <div className="state-panel">Book Master memerlukan sumber data Convex.</div>
  );
}
