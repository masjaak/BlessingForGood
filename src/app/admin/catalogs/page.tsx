"use client";

import { useState } from "react";
import { useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { productErrorMessage } from "@/domain/prototype/errors";
import { catalogStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function CatalogForm() {
  const createCatalog = useMutation(api.secretCatalogs.create);
  const router = useRouter();
  const [name, setName] = useState("");
  const [closingAt, setClosingAt] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      if (closingAt && Number.isNaN(new Date(closingAt).getTime())) throw new Error("closing date is invalid");
      const catalogId = await createCatalog({
        name,
        description: description || undefined,
        closesAt: closingAt ? new Date(closingAt).getTime() : undefined,
      });
      router.push(`/admin/catalogs/${catalogId}`);
    } catch (reason) {
      setError(productErrorMessage(reason, "Catalog could not be created"));
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Card frame="form" className="form-card" id="create-catalog">
      <div>
        <span className="card-kicker">Create secret catalog</span>
        <h2>Buat ruang katalog, lalu isi dengan produk yang sudah siap.</h2>
        <p>Katalog dimulai sebagai Draft. Produk, status Open, dan akses dikelola dari halaman detail.</p>
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
          <Field label="Closing date" hint="Opsional. Kosongkan bila katalog tidak memiliki tanggal tutup.">
            <input
              className="input"
              type="datetime-local"
              value={closingAt}
              onChange={(event) => setClosingAt(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Description" hint="Opsional">
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit" pending={isSubmitting} pendingLabel="Creating…">
          Create draft catalog
        </Button>
      </form>
    </Card>
  );
}

function CatalogList() {
  const { state, closeCatalog, catalogsLoading } = useProduct();
  const [pendingAction, setPendingAction] = useState("");
  const [error, setError] = useState("");

  async function close(catalogId: string) {
    setError("");
    setPendingAction(catalogId);
    try {
      await closeCatalog(catalogId);
    } catch (reason) {
      setError(productErrorMessage(reason, "Katalog belum dapat ditutup."));
    } finally {
      setPendingAction("");
    }
  }
  if (catalogsLoading) {
    return (
      <LoadingRegion label="Memuat katalog">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (state.catalogs.length === 0)
    return (
      <EmptyState
        title="Catalog list is empty"
        description="Buat katalog terlebih dahulu. Setelah disimpan, buka detail untuk menambahkan produk dan mengelola Access Management."
        primaryAction={<LinkButton href="#create-catalog">Buat katalog</LinkButton>}
      />
    );
  return (
    <div className="content-stack">
      {state.catalogs.map((catalog) => {
        const firstBook = catalog.books[0];
        const statusTone = catalog.status === "open" ? "positive" : catalog.status === "draft" ? "warning" : "neutral";
        return (
          <Card frame="list" key={catalog.id}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">
                  {catalog.books.length} {catalog.books.length === 1 ? "title" : "titles"}
                  {firstBook?.publisher ? ` · ${firstBook.publisher}` : ""}
                </span>
                <h2>{catalog.name}</h2>
              </div>
              <StatusBadge tone={statusTone}>{catalogStatusLabels[catalog.status]}</StatusBadge>
            </div>
            <p>
              {catalog.closingAt
                ? `Closes ${new Intl.DateTimeFormat("en-GB", { dateStyle: "medium", timeStyle: "short" }).format(new Date(catalog.closingAt))}.`
                : "No closing date set."}
            </p>
            <div className="summary-line">
              <span>{firstBook?.title || "Belum ada produk yang ditambahkan"}</span>
              <span>{firstBook ? `${firstBook.variants.length} format variants` : "Buka detail untuk kurasi"}</span>
            </div>
            {error ? <p className="error-text">{error}</p> : null}
            <div className="actions">
              <LinkButton href={`/admin/catalogs/${catalog.id}`}>Kelola katalog</LinkButton>
            </div>
            {catalog.status === "open" ? (
              <Button
                variant="danger"
                pending={pendingAction === catalog.id}
                pendingLabel="Closing…"
                onClick={() => void close(catalog.id)}
              >
                Close catalog
              </Button>
            ) : catalog.status === "draft" ? (
              <span className="subtle">Draft — buka detail untuk kurasi produk dan mengelola akses.</span>
            ) : catalog.status === "closed" ? (
              <span className="subtle">Closed catalogs reject new orders.</span>
            ) : (
              <span className="subtle">Archived catalogs are no longer operational.</span>
            )}
          </Card>
        );
      })}
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
