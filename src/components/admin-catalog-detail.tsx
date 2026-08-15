"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, SkeletonCard, StatusBadge } from "@/components/ui";
import { catalogStatusLabels } from "@/domain/prototype/logic";

export function AdminCatalogDetail({ catalogId }: { catalogId: string }) {
  const id = catalogId as Id<"secretCatalogs">;
  const catalog = useQuery(api.secretCatalogs.getForAdmin, { catalogId: id });
  const items = useQuery(api.catalogItems.listForCatalog, { catalogId: id });
  const assignable = useQuery(api.catalogItems.listAssignable, { catalogId: id });
  const update = useMutation(api.secretCatalogs.update);
  const open = useMutation(api.secretCatalogs.open);
  const close = useMutation(api.secretCatalogs.close);
  const add = useMutation(api.catalogItems.add);
  const remove = useMutation(api.catalogItems.remove);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [variantId, setVariantId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  if (catalog === undefined || items === undefined || assignable === undefined) {
    return (
      <LoadingRegion label="Memuat katalog">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!catalog) return <div className="state-panel">Katalog tidak ditemukan.</div>;
  const effectiveName = name ?? catalog.name;
  const effectiveDescription = description ?? catalog.description ?? "";
  const effectiveClosesAt = closesAt ?? (catalog.closesAt ? new Date(catalog.closesAt).toISOString().slice(0, 16) : "");

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("Perubahan katalog ditolak. Periksa status dan nilai yang dimasukkan.");
    } finally {
      setPending("");
    }
  }

  return (
    <AdminOperationalPage
      eyebrow="Secret Catalog"
      title={catalog.name}
      description="Atur metadata, produk, status, dan akses dari satu alur yang mudah ditemukan."
      actions={<LinkButton href={`/admin/catalogs/${catalogId}/access`}>Kelola akses</LinkButton>}
    >
      <Card frame="form">
        <div className="split-heading">
          <h2>Pengaturan katalog</h2>
          <StatusBadge
            tone={catalog.status === "open" ? "positive" : catalog.status === "draft" ? "warning" : "neutral"}
          >
            {catalogStatusLabels[catalog.status]}
          </StatusBadge>
        </div>
        <form
          className="form-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              "save",
              () =>
                update({
                  catalogId: id,
                  name: effectiveName,
                  description: effectiveDescription || undefined,
                  closesAt: effectiveClosesAt ? Date.parse(effectiveClosesAt) : undefined,
                }),
              "Katalog tersimpan.",
            );
          }}
        >
          <div className="form-grid">
            <Field label="Nama">
              <input
                className="input"
                value={effectiveName}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label="Tutup pada">
              <input
                className="input"
                type="datetime-local"
                value={effectiveClosesAt}
                onChange={(event) => setClosesAt(event.target.value)}
              />
            </Field>
          </div>
          <Field label="Deskripsi">
            <textarea
              className="textarea"
              value={effectiveDescription}
              onChange={(event) => setDescription(event.target.value)}
            />
          </Field>
          <div className="form-actions">
            <Button pending={pending === "save"} pendingLabel="Menyimpan…">
              Simpan
            </Button>
            {catalog.status === "draft" ? (
              <Button
                type="button"
                variant="secondary"
                pending={pending === "open"}
                onClick={() => void run("open", () => open({ catalogId: id }), "Katalog dibuka.")}
              >
                Buka katalog
              </Button>
            ) : null}
            {catalog.status === "open" ? (
              <Button
                type="button"
                variant="danger"
                pending={pending === "close"}
                onClick={() => void run("close", () => close({ catalogId: id }), "Katalog ditutup.")}
              >
                Tutup katalog
              </Button>
            ) : null}
          </div>
        </form>
      </Card>
      <Card frame="list">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Kurasi produk</span>
            <h2>Buku dalam katalog</h2>
          </div>
        </div>
        <form
          className="form-actions"
          onSubmit={(event) => {
            event.preventDefault();
            if (variantId)
              void run(
                "add",
                () => add({ catalogId: id, bookVariantId: variantId as Id<"bookVariants"> }),
                "Produk ditambahkan.",
              ).then(() => setVariantId(""));
          }}
        >
          <Field label="Produk yang dapat ditambahkan">
            <select
              className="select"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              required
            >
              <option value="">Pilih buku / format</option>
              {assignable.map((item) => (
                <option key={item.variantId} value={item.variantId}>
                  {item.title} · {item.format} · {item.isbn}
                </option>
              ))}
            </select>
          </Field>
          <Button pending={pending === "add"} pendingLabel="Menambahkan…">
            Tambah produk
          </Button>
        </form>
        {items.length ? (
          <div className="content-stack">
            {items.map((item) => (
              <div className="summary-line" key={item._id}>
                <span>
                  <strong>{item.title}</strong>
                  <br />
                  <small>
                    {item.format} · {item.isbn}
                  </small>
                </span>
                <Button
                  type="button"
                  variant="danger"
                  pending={pending === `remove-${item._id}`}
                  onClick={() =>
                    void run(
                      `remove-${item._id}`,
                      () => remove({ catalogItemId: item._id }),
                      "Produk dihapus dari katalog.",
                    )
                  }
                >
                  Hapus
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan produk berstatus Terbit atau Khusus dari Master Buku."
            mascotVariant={false}
          />
        )}
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}
