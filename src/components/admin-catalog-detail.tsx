"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import {
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { catalogStatusLabels } from "@/domain/prototype/logic";
import { productErrorMessage } from "@/domain/prototype/errors";
import { matchesAdminCatalogRecord } from "@/lib/catalog-discovery";
import { calendarDateInputValue, calendarDateToEndTimestamp } from "@/lib/calendar-date";

export function AdminCatalogDetail({ catalogId }: { catalogId: string }) {
  const id = catalogId as Id<"secretCatalogs">;
  const router = useRouter();
  const catalog = useQuery(api.secretCatalogs.getForAdmin, { catalogId: id });
  const items = useQuery(api.catalogItems.listForCatalog, { catalogId: id });
  const assignable = useQuery(api.catalogItems.listAssignable, { catalogId: id });
  const update = useMutation(api.secretCatalogs.update);
  const open = useMutation(api.secretCatalogs.open);
  const close = useMutation(api.secretCatalogs.close);
  const reopen = useMutation(api.secretCatalogs.reopen);
  const archive = useMutation(api.secretCatalogs.archive);
  const restore = useMutation(api.secretCatalogs.restore);
  const removeCatalog = useMutation(api.secretCatalogs.remove);
  const add = useMutation(api.catalogItems.add);
  const remove = useMutation(api.catalogItems.remove);
  const [name, setName] = useState<string | null>(null);
  const [description, setDescription] = useState<string | null>(null);
  const [closesAt, setClosesAt] = useState<string | null>(null);
  const [estimatedArrivalMonth, setEstimatedArrivalMonth] = useState<string | null>(null);
  const [variantId, setVariantId] = useState("");
  const [assignableSearch, setAssignableSearch] = useState("");
  const [catalogSearch, setCatalogSearch] = useState("");
  const [catalogPublisher, setCatalogPublisher] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState("");
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    danger?: boolean;
    action: () => void;
  } | null>(null);

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
  const effectiveClosesAt = closesAt ?? calendarDateInputValue(catalog.closesAt);
  const effectiveEstimatedArrivalMonth = estimatedArrivalMonth ?? catalog.estimatedArrivalMonth ?? "";
  const filteredAssignable = assignable.filter((item) => matchesAdminCatalogRecord(item, assignableSearch));
  const catalogPublishers = Array.from(
    new Set(items.map((item) => item.publisherName).filter((publisher): publisher is string => Boolean(publisher))),
  ).sort((left, right) => left.localeCompare(right));
  const filteredCatalogItems = items.filter(
    (item) =>
      matchesAdminCatalogRecord(item, catalogSearch) && (!catalogPublisher || item.publisherName === catalogPublisher),
  );
  const catalogTitleCount = (records: typeof items) =>
    new Set(records.map((item) => String(item.bookId || item.title))).size;
  const hasCatalogFilters = Boolean(catalogSearch.trim() || catalogPublisher);

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setMessage("");
    setMessageIsError(false);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessageIsError(true);
      setMessage(productErrorMessage(reason, "Perubahan katalog ditolak. Periksa status dan nilai yang dimasukkan."));
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
                  closesAt: effectiveClosesAt ? calendarDateToEndTimestamp(effectiveClosesAt) : undefined,
                  estimatedArrivalMonth: effectiveEstimatedArrivalMonth || undefined,
                }),
              "Katalog tersimpan.",
            );
          }}
        >
          <div className="form-grid form-grid-wide catalog-settings-grid">
            <Field label="Nama">
              <input
                className="input"
                value={effectiveName}
                onChange={(event) => setName(event.target.value)}
                required
              />
            </Field>
            <Field label="Batas pemesanan" hint="Customer dapat melakukan preorder sampai tanggal ini.">
              <input
                className="input"
                type="date"
                value={effectiveClosesAt}
                onChange={(event) => setClosesAt(event.target.value)}
              />
            </Field>
            <Field label="Estimasi kedatangan" hint="Bulan dan tahun perkiraan tiba untuk Customer.">
              <input
                className="input"
                type="month"
                value={effectiveEstimatedArrivalMonth}
                onChange={(event) => setEstimatedArrivalMonth(event.target.value)}
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
            <Button loading={pending === "save"} loadingLabel="Menyimpan…">
              Simpan
            </Button>
            {catalog.status === "draft" ? (
              <Button
                type="button"
                variant="secondary"
                loading={pending === "open"}
                onClick={() => void run("open", () => open({ catalogId: id }), "Katalog dibuka.")}
              >
                Buka katalog
              </Button>
            ) : null}
            {catalog.status === "open" ? (
              <Button
                type="button"
                variant="danger"
                loading={pending === "close"}
                onClick={() =>
                  setConfirmAction({
                    title: "Tutup katalog ini?",
                    description: "Customer tidak dapat membuat preorder baru setelah katalog ditutup.",
                    confirmLabel: "Tutup katalog",
                    danger: true,
                    action: () => void run("close", () => close({ catalogId: id }), "Katalog ditutup."),
                  })
                }
              >
                Tutup katalog
              </Button>
            ) : null}
            {catalog.status === "closed" ? (
              <Button
                type="button"
                variant="secondary"
                loading={pending === "reopen"}
                onClick={() =>
                  setConfirmAction({
                    title: "Buka kembali katalog ini?",
                    description: "Katalog hanya dapat dibuka kembali bila belum masuk procurement yang dikunci.",
                    confirmLabel: "Buka kembali",
                    action: () => void run("reopen", () => reopen({ catalogId: id }), "Katalog dibuka kembali."),
                  })
                }
              >
                Buka kembali
              </Button>
            ) : null}
            {catalog.status === "archived" ? (
              <Button
                type="button"
                variant="secondary"
                loading={pending === "restore"}
                onClick={() =>
                  setConfirmAction({
                    title: "Pulihkan katalog ini?",
                    description: "Katalog akan kembali sebagai Draf. Produk dan riwayat katalog tetap dipertahankan.",
                    confirmLabel: "Pulihkan katalog",
                    action: () =>
                      void run("restore", () => restore({ catalogId: id }), "Katalog dipulihkan sebagai draf."),
                  })
                }
              >
                Pulihkan katalog
              </Button>
            ) : null}
            {catalog.status !== "archived" ? (
              <Button
                type="button"
                variant="danger"
                loading={pending === "archive"}
                onClick={() =>
                  setConfirmAction({
                    title: "Arsipkan katalog ini?",
                    description: "Katalog berhenti beroperasi, tetapi order dan riwayatnya tetap disimpan.",
                    confirmLabel: "Arsipkan katalog",
                    action: () => void run("archive", () => archive({ catalogId: id }), "Katalog diarsipkan."),
                  })
                }
              >
                Arsipkan katalog
              </Button>
            ) : null}
            {catalog.status === "draft" ? (
              <Button
                type="button"
                variant="danger"
                loading={pending === "delete"}
                onClick={() =>
                  setConfirmAction({
                    title: "Hapus katalog ini?",
                    description: "Hanya katalog draf yang belum dipakai yang dapat dihapus.",
                    confirmLabel: "Hapus katalog",
                    danger: true,
                    action: () =>
                      void run(
                        "delete",
                        async () => {
                          await removeCatalog({ catalogId: id });
                          router.push("/admin/catalogs");
                        },
                        "Katalog dihapus.",
                      ),
                  })
                }
              >
                Hapus katalog
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
          className="catalog-discovery-controls admin-catalog-picker-controls"
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
          <Field label="Cari buku yang dapat ditambahkan">
            <input
              className="input"
              type="search"
              placeholder="Cari judul, publisher, ISBN, atau penulis"
              value={assignableSearch}
              onChange={(event) => {
                setAssignableSearch(event.target.value);
                setVariantId("");
              }}
            />
          </Field>
          <Field label="Produk yang dapat ditambahkan">
            <BFGSelect
              aria-label="Produk yang dapat ditambahkan"
              value={variantId}
              onChange={(event) => setVariantId(event.target.value)}
              required
            >
              <option value="">Pilih buku / format</option>
              {filteredAssignable.length ? (
                filteredAssignable.map((item) => (
                  <option key={item.variantId} value={item.variantId}>
                    {item.title} · {item.format} · {item.isbn}
                  </option>
                ))
              ) : (
                <option value="" disabled>
                  Tidak ada buku yang cocok
                </option>
              )}
            </BFGSelect>
          </Field>
          <Button loading={pending === "add"} loadingLabel="Menambahkan…">
            Tambah produk
          </Button>
        </form>
        <p className="catalog-result-count" role="status" aria-live="polite">
          {assignableSearch.trim()
            ? `${filteredAssignable.length} buku/format ditemukan`
            : `${assignable.length} buku/format tersedia`}
        </p>
        <section className="catalog-tracking" aria-label="Cari buku dalam katalog">
          <div className="catalog-discovery-controls admin-catalog-tracking-controls">
            <Field label="Cari buku dalam Catalog">
              <input
                className="input"
                type="search"
                placeholder="Cari judul, publisher, ISBN, atau penulis"
                value={catalogSearch}
                onChange={(event) => setCatalogSearch(event.target.value)}
              />
            </Field>
            <Field label="Publisher">
              <BFGSelect
                aria-label="Publisher dalam Catalog"
                value={catalogPublisher}
                onChange={(event) => setCatalogPublisher(event.target.value)}
              >
                <option value="">Semua Publisher</option>
                {catalogPublishers.map((publisher) => (
                  <option key={publisher} value={publisher}>
                    {publisher}
                  </option>
                ))}
              </BFGSelect>
            </Field>
            {hasCatalogFilters ? (
              <Button
                type="button"
                variant="tertiary"
                onClick={() => {
                  setCatalogSearch("");
                  setCatalogPublisher("");
                }}
              >
                Reset pencarian
              </Button>
            ) : null}
          </div>
          <p className="catalog-result-count" role="status" aria-live="polite">
            {hasCatalogFilters
              ? `${catalogTitleCount(filteredCatalogItems)} judul ditemukan`
              : `${catalogTitleCount(items)} judul di Catalog`}
          </p>
        </section>
        {items.length && filteredCatalogItems.length ? (
          <div className="content-stack">
            {filteredCatalogItems.map((item) => (
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
                  loading={pending === `remove-${item._id}`}
                  onClick={() =>
                    setConfirmAction({
                      title: "Hapus produk dari katalog?",
                      description: "Order yang sudah tercatat tetap aman; produk hanya dilepas dari kurasi katalog.",
                      confirmLabel: "Hapus dari katalog",
                      danger: true,
                      action: () =>
                        void run(
                          `remove-${item._id}`,
                          () => remove({ catalogItemId: item._id }),
                          "Produk dihapus dari katalog.",
                        ),
                    })
                  }
                >
                  Hapus produk dari katalog
                </Button>
              </div>
            ))}
          </div>
        ) : items.length ? (
          <EmptyState
            title="Tidak ada buku yang cocok."
            description="Coba kata kunci lain atau hapus filter Publisher."
            mascotVariant={false}
            action={
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setCatalogSearch("");
                  setCatalogPublisher("");
                }}
              >
                Reset pencarian
              </Button>
            }
          />
        ) : (
          <EmptyState
            title="Belum ada produk"
            description="Tambahkan produk berstatus Terbit atau Khusus dari Master Buku."
            mascotVariant={false}
          />
        )}
      </Card>
      {message ? (
        <p className={messageIsError ? "error-text" : "success-banner"} role={messageIsError ? "alert" : "status"}>
          {message}
        </p>
      ) : null}
      <ConfirmationDialog
        open={confirmAction !== null}
        title={confirmAction?.title || "Konfirmasi katalog"}
        description={confirmAction?.description || "Periksa kembali perubahan katalog ini."}
        confirmLabel={confirmAction?.confirmLabel || "Konfirmasi"}
        danger={confirmAction?.danger}
        onCancel={() => setConfirmAction(null)}
        onConfirm={() => {
          const action = confirmAction?.action;
          setConfirmAction(null);
          action?.();
        }}
      />
    </AdminOperationalPage>
  );
}
