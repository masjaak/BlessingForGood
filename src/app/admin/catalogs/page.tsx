"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { productErrorMessage } from "@/domain/prototype/errors";
import { BOOK_FORMATS, type BookFormat } from "@/domain/prototype/types";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

type VariantDraft = { enabled: boolean; isbn: string; price: string };
type VariantDrafts = Record<BookFormat, VariantDraft>;

const initialVariants: VariantDrafts = {
  BB: { enabled: false, isbn: "", price: "" },
  PB: { enabled: true, isbn: "", price: "" },
  HB: { enabled: false, isbn: "", price: "" },
};

function CatalogForm() {
  const { createCatalog, dataSource } = useProduct();
  const [name, setName] = useState("");
  const [accessCode, setAccessCode] = useState("");
  const [closingAt, setClosingAt] = useState("");
  const [publisher, setPublisher] = useState("");
  const [title, setTitle] = useState("");
  const [variants, setVariants] = useState<VariantDrafts>(initialVariants);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");

  function updateVariant(format: BookFormat, patch: Partial<VariantDraft>) {
    setVariants((current) => ({ ...current, [format]: { ...current[format], ...patch } }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSaved("");
    try {
      const selected = BOOK_FORMATS.filter((format) => variants[format].enabled).map((format) => ({
        format,
        isbn: variants[format].isbn,
        price: Number(variants[format].price),
      }));
      if (closingAt && Number.isNaN(new Date(closingAt).getTime())) throw new Error("closing date is invalid");
      const catalog = await createCatalog({
        name,
        accessCode,
        closingAt: closingAt ? new Date(closingAt).toISOString() : null,
        publisher,
        title,
        variants: selected,
      });
      setSaved(`${catalog.name} sudah terbuka untuk customer yang memiliki akses.`);
      setName("");
      setAccessCode("");
      setClosingAt("");
      setPublisher("");
      setTitle("");
      setVariants(initialVariants);
    } catch (reason) {
      setError(productErrorMessage(reason, "Catalog could not be created"));
    }
  }

  return (
    <Card className="form-card">
      <div>
        <span className="card-kicker">Create secret catalog</span>
        <h2>Set up one useful starting point.</h2>
        <p>
          Katalog baru langsung terbuka. Kode akses disimpan dalam bentuk hash sebelum masuk ke{" "}
          {dataSource === "convex" ? "Convex" : "local storage"}.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-grid">
          <Field label="Catalog name">
            <input
              className="input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="e.g. Autumn reading list"
              required
            />
          </Field>
          <Field label="Access code">
            <input
              className="input"
              type="password"
              value={accessCode}
              onChange={(event) => setAccessCode(event.target.value)}
              autoComplete="new-password"
              required
            />
          </Field>
          <Field label="Publisher">
            <input
              className="input"
              value={publisher}
              onChange={(event) => setPublisher(event.target.value)}
              required
            />
          </Field>
          <Field label="Book title">
            <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <Field label="Closing date" hint="Opsional. Kosongkan bila katalog tidak memiliki tanggal tutup.">
            <input
              className="input"
              type="datetime-local"
              value={closingAt}
              onChange={(event) => setClosingAt(event.target.value)}
            />
          </Field>
        </div>
        <fieldset className="form-card">
          <legend className="field-label">Book formats</legend>
          <p className="field-hint">Add only formats with real ISBN and IDR price values.</p>
          {BOOK_FORMATS.map((format) => (
            <div className="variant-draft" key={format}>
              <label className="check-row">
                <input
                  type="checkbox"
                  checked={variants[format].enabled}
                  onChange={(event) => updateVariant(format, { enabled: event.target.checked })}
                />
                <strong>{format}</strong>
              </label>
              <input
                className="input"
                aria-label={`${format} ISBN`}
                placeholder="ISBN"
                value={variants[format].isbn}
                onChange={(event) => updateVariant(format, { isbn: event.target.value })}
                disabled={!variants[format].enabled}
                required={variants[format].enabled}
              />
              <input
                className="input"
                aria-label={`${format} price`}
                type="number"
                min="0"
                step="1"
                placeholder="Price (IDR)"
                value={variants[format].price}
                onChange={(event) => updateVariant(format, { price: event.target.value })}
                disabled={!variants[format].enabled}
                required={variants[format].enabled}
              />
            </div>
          ))}
        </fieldset>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        {saved ? (
          <p className="success-banner" role="status">
            {saved}
          </p>
        ) : null}
        <Button type="submit">Create open catalog</Button>
      </form>
    </Card>
  );
}

function CatalogList() {
  const { state, closeCatalog } = useProduct();
  if (state.catalogs.length === 0)
    return (
      <EmptyState
        title="Catalog list is empty"
        description="Buat katalog saat materi dan kode akses sudah siap dibagikan."
      />
    );
  return (
    <div className="content-stack">
      {state.catalogs.map((catalog) => (
        <Card key={catalog.id}>
          <div className="split-heading">
            <div>
              <span className="card-kicker">
                {catalog.books.length} title · {catalog.books[0]?.publisher}
              </span>
              <h2>{catalog.name}</h2>
            </div>
            <StatusBadge tone={catalog.status === "open" ? "positive" : "neutral"}>
              {catalog.status === "open" ? "Open" : "Closed"}
            </StatusBadge>
          </div>
          <p>
            {catalog.closingAt
              ? `Closes ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(catalog.closingAt))}.`
              : "No closing date set."}
          </p>
          <div className="summary-line">
            <span>{catalog.books[0]?.title}</span>
            <span>{catalog.books[0]?.variants.length} format variants</span>
          </div>
          {catalog.status === "open" ? (
            <Button variant="danger" onClick={() => closeCatalog(catalog.id)}>
              Close catalog
            </Button>
          ) : (
            <span className="subtle">Closed catalogs reject new orders.</span>
          )}
        </Card>
      ))}
    </div>
  );
}

function AdminCatalogs() {
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional katalog"
        title="Kelola Secret Catalog dengan akses yang aman."
        description="Akses katalog tetap terpisah dari kata sandi akun dan hanya diberikan melalui kode serta grant yang sah."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="two-column">
            <CatalogForm />
            <div>
              <CatalogList />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminCatalogsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminCatalogs />
      </ProductAccessGuard>
    </SiteShell>
  );
}
