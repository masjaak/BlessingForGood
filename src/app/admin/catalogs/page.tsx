"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
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
  const { createCatalog } = useProduct();
  const [name, setName] = useState("");
  const [accessCodeExpiresAt, setAccessCodeExpiresAt] = useState("");
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
      const result = await createCatalog({
        name,
        accessCodeExpiresAt: accessCodeExpiresAt || null,
        closingAt: closingAt ? new Date(closingAt).toISOString() : null,
        publisher,
        title,
        variants: selected,
      });
      setSaved(`${result.catalog.name} sudah terbuka untuk customer yang memiliki akses.`);
      setGeneratedCode(result.accessCode);
      setName("");
      setAccessCodeExpiresAt("");
      setClosingAt("");
      setPublisher("");
      setTitle("");
      setVariants(initialVariants);
    } catch (reason) {
      setError(productErrorMessage(reason, "Catalog could not be created"));
    }
  }

  const [generatedCode, setGeneratedCode] = useState<string | null>(null);

  return (
    <Card className="form-card">
      <div>
        <span className="card-kicker">Create secret catalog</span>
        <h2>Set up one useful starting point.</h2>
        <p>Katalog baru langsung terbuka. Kode akses disimpan secara aman sebelum dibagikan kepada customer.</p>
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
          <Field label="Kode berakhir" hint="Opsional. Kode baru hanya ditampilkan sekali setelah dibuat.">
            <input
              className="input"
              type="datetime-local"
              value={accessCodeExpiresAt}
              onChange={(event) => setAccessCodeExpiresAt(event.target.value)}
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
        {generatedCode ? (
          <div className="catalog-code-result" role="status">
            <strong>Kode akses baru</strong>
            <code>{generatedCode}</code>
            <p>Simpan atau bagikan sekarang. Kode mentah tidak dapat dilihat lagi setelah panel ini ditutup.</p>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void navigator.clipboard?.writeText(generatedCode)}
            >
              Salin kode
            </Button>
          </div>
        ) : null}
        <Button type="submit">Create open catalog</Button>
      </form>
    </Card>
  );
}

function CatalogList() {
  const { state, closeCatalog } = useProduct();
  const generateCode = useMutation(api.catalogAccess.generateCode);
  const revokeCode = useMutation(api.catalogAccess.revokeCode);
  const [generatedCodes, setGeneratedCodes] = useState<Record<string, string>>({});
  const [codeExpiresAt, setCodeExpiresAt] = useState<Record<string, string>>({});
  const [codeError, setCodeError] = useState("");
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
          {generatedCodes[catalog.id] ? (
            <div className="catalog-code-result">
              <strong>Kode akses baru</strong>
              <code>{generatedCodes[catalog.id]}</code>
              <Button
                type="button"
                variant="secondary"
                onClick={() => void navigator.clipboard?.writeText(generatedCodes[catalog.id])}
              >
                Salin kode
              </Button>
            </div>
          ) : null}
          {codeError ? <p className="error-text">{codeError}</p> : null}
          <div className="actions">
            <Field label="New code expiry" hint="Opsional">
              <input
                className="input"
                type="datetime-local"
                value={codeExpiresAt[catalog.id] || ""}
                onChange={(event) => setCodeExpiresAt((current) => ({ ...current, [catalog.id]: event.target.value }))}
              />
            </Field>
            <Button
              type="button"
              variant="secondary"
              onClick={async () => {
                setCodeError("");
                try {
                  const expiresAt = codeExpiresAt[catalog.id] ? Date.parse(codeExpiresAt[catalog.id]) : undefined;
                  if (expiresAt !== undefined && Number.isNaN(expiresAt)) throw new Error("expiry is invalid");
                  const result = await generateCode({ catalogId: catalog.id as never, expiresAt });
                  setGeneratedCodes((current) => ({ ...current, [catalog.id]: result.code }));
                } catch (reason) {
                  setCodeError(productErrorMessage(reason, "Kode belum dapat dibuat."));
                }
              }}
            >
              Generate access code
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={async () => {
                setCodeError("");
                try {
                  await revokeCode({ catalogId: catalog.id as never });
                  setGeneratedCodes((current) => {
                    const next = { ...current };
                    delete next[catalog.id];
                    return next;
                  });
                } catch (reason) {
                  setCodeError(productErrorMessage(reason, "Kode belum dapat dicabut."));
                }
              }}
            >
              Revoke access code
            </Button>
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
