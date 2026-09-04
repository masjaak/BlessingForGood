"use client";

import { useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { Fragment, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
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

type CatalogDragState = {
  itemId: Id<"catalogItems">;
  targetIndex: number;
};

type CatalogPointerState = {
  itemId: Id<"catalogItems">;
  pointerId: number;
  startY: number;
  active: boolean;
};

function CatalogDragIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <path d="M8 5h.01M8 12h.01M8 19h.01M16 5h.01M16 12h.01M16 19h.01" />
    </svg>
  );
}

function releaseCatalogPointerCapture(target: HTMLButtonElement, pointerId: number) {
  if (target.hasPointerCapture?.(pointerId)) target.releasePointerCapture(pointerId);
}

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
  const move = useMutation(api.catalogItems.move);
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
  const catalogItemRefs = useRef(new Map<string, HTMLDivElement>());
  const catalogPointerRef = useRef<CatalogPointerState | null>(null);
  const [catalogDragState, setCatalogDragState] = useState<CatalogDragState | null>(null);
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    description: string;
    confirmLabel: string;
    confirmationPhrase?: string;
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
  const catalogItems = items;
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
  const catalogItemPositions = new Map(items.map((item, index) => [item._id, index]));
  const canReorderCatalog = !hasCatalogFilters && items.length > 1 && !pending;

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

  function getCatalogDropIndex(clientY: number, draggedItemId: Id<"catalogItems">) {
    const remainingItems = catalogItems.filter((item) => item._id !== draggedItemId);
    const targetIndex = remainingItems.findIndex((item) => {
      const row = catalogItemRefs.current.get(String(item._id));
      if (!row) return false;
      const bounds = row.getBoundingClientRect();
      return clientY < bounds.top + bounds.height / 2;
    });
    return targetIndex === -1 ? remainingItems.length : targetIndex;
  }

  function handleCatalogPointerDown(event: ReactPointerEvent<HTMLButtonElement>, itemId: Id<"catalogItems">) {
    if (!canReorderCatalog) return;
    event.currentTarget.setPointerCapture?.(event.pointerId);
    catalogPointerRef.current = { itemId, pointerId: event.pointerId, startY: event.clientY, active: false };
  }

  function handleCatalogPointerMove(event: ReactPointerEvent<HTMLButtonElement>) {
    const pointer = catalogPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    if (!pointer.active && Math.abs(event.clientY - pointer.startY) < 8) return;
    pointer.active = true;
    event.preventDefault();
    setCatalogDragState({
      itemId: pointer.itemId,
      targetIndex: getCatalogDropIndex(event.clientY, pointer.itemId),
    });
  }

  function handleCatalogPointerUp(event: ReactPointerEvent<HTMLButtonElement>) {
    const pointer = catalogPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    const wasDragging = pointer.active;
    const targetIndex = wasDragging ? getCatalogDropIndex(event.clientY, pointer.itemId) : null;
    catalogPointerRef.current = null;
    setCatalogDragState(null);
    releaseCatalogPointerCapture(event.currentTarget, event.pointerId);
    if (!wasDragging || targetIndex === null) return;
    event.preventDefault();
    const currentIndex = catalogItems.findIndex((item) => item._id === pointer.itemId);
    if (currentIndex < 0 || currentIndex === targetIndex) return;
    void run(
      `move-drag-${pointer.itemId}`,
      () => move({ catalogItemId: pointer.itemId, targetPosition: targetIndex }),
      "Urutan buku diperbarui.",
    );
  }

  function handleCatalogPointerCancel(event: ReactPointerEvent<HTMLButtonElement>) {
    const pointer = catalogPointerRef.current;
    if (!pointer || pointer.pointerId !== event.pointerId) return;
    catalogPointerRef.current = null;
    setCatalogDragState(null);
    releaseCatalogPointerCapture(event.currentTarget, event.pointerId);
  }

  const draggedCatalogItem = catalogDragState ? items.find((item) => item._id === catalogDragState.itemId) : null;
  const remainingCatalogItems = catalogDragState ? items.filter((item) => item._id !== catalogDragState.itemId) : [];
  const catalogDropBeforeItemId =
    catalogDragState && catalogDragState.targetIndex < remainingCatalogItems.length
      ? remainingCatalogItems[catalogDragState.targetIndex]?._id
      : null;

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
          className="form-card admin-catalog-detail-form"
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
                    title: "Hapus katalog secara permanen?",
                    description:
                      "Tindakan ini tidak dapat dibatalkan. Hanya katalog draf yang belum memiliki produk, akses, batch, atau order yang dapat dihapus.",
                    confirmLabel: "Hapus permanen",
                    confirmationPhrase: "HAPUS KATALOG",
                    danger: true,
                    action: () =>
                      void run(
                        "delete",
                        async () => {
                          await removeCatalog({ catalogId: id });
                          router.push("/admin/catalogs");
                        },
                        "Katalog dihapus permanen.",
                      ),
                  })
                }
              >
                Hapus permanen
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
            <p className="subtle catalog-ordering-hint">
              Geser pegangan di setiap buku untuk mengatur urutan. Tombol Naik dan Turun tetap tersedia sebagai
              fallback.
            </p>
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
          {hasCatalogFilters ? (
            <p className="subtle catalog-ordering-filter-hint">
              Reset pencarian atau Publisher untuk mengatur ulang urutan.
            </p>
          ) : null}
        </section>
        {items.length && filteredCatalogItems.length ? (
          <div className="content-stack catalog-item-list">
            {catalogDragState ? (
              <p className="sr-only" role="status" aria-live="polite">
                {draggedCatalogItem?.title} akan ditempatkan pada urutan {catalogDragState.targetIndex + 1}.
              </p>
            ) : null}
            {filteredCatalogItems.map((item) => (
              <Fragment key={item._id}>
                {!hasCatalogFilters && catalogDropBeforeItemId === item._id ? (
                  <div className="catalog-item-drop-indicator" aria-hidden="true">
                    <span />
                    Lepas di sini
                  </div>
                ) : null}
                <div
                  className={`catalog-item-row${catalogDragState?.itemId === item._id ? " is-dragging" : ""}`}
                  data-catalog-item-id={item._id}
                  ref={(node) => {
                    if (node) catalogItemRefs.current.set(String(item._id), node);
                    else catalogItemRefs.current.delete(String(item._id));
                  }}
                >
                  <div className="catalog-item-copy">
                    <strong>{item.title}</strong>
                    <small>
                      {item.format} · {item.isbn}
                    </small>
                  </div>
                  <div className="catalog-item-actions">
                    <Button
                      type="button"
                      variant="tertiary"
                      size="compact"
                      className="catalog-item-drag-handle"
                      data-drag-handle="true"
                      aria-label={`Atur urutan ${item.title}`}
                      title="Geser untuk mengatur urutan"
                      disabled={!canReorderCatalog}
                      onPointerDown={(event) => handleCatalogPointerDown(event, item._id)}
                      onPointerMove={handleCatalogPointerMove}
                      onPointerUp={handleCatalogPointerUp}
                      onPointerCancel={handleCatalogPointerCancel}
                    >
                      <CatalogDragIcon />
                    </Button>
                    <span className="catalog-item-position">
                      Urutan {(catalogItemPositions.get(item._id) ?? 0) + 1}
                    </span>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="compact"
                      aria-label={`Naikkan ${item.title}`}
                      disabled={!canReorderCatalog || (catalogItemPositions.get(item._id) ?? 0) === 0}
                      loading={pending === `move-up-${item._id}`}
                      loadingLabel="Memindahkan…"
                      onClick={() =>
                        void run(
                          `move-up-${item._id}`,
                          () => move({ catalogItemId: item._id, direction: "up" }),
                          "Urutan buku diperbarui.",
                        )
                      }
                    >
                      Naik
                    </Button>
                    <Button
                      type="button"
                      variant="tertiary"
                      size="compact"
                      aria-label={`Turunkan ${item.title}`}
                      disabled={!canReorderCatalog || (catalogItemPositions.get(item._id) ?? 0) === items.length - 1}
                      loading={pending === `move-down-${item._id}`}
                      loadingLabel="Memindahkan…"
                      onClick={() =>
                        void run(
                          `move-down-${item._id}`,
                          () => move({ catalogItemId: item._id, direction: "down" }),
                          "Urutan buku diperbarui.",
                        )
                      }
                    >
                      Turun
                    </Button>
                    <Button
                      type="button"
                      variant="danger"
                      loading={pending === `remove-${item._id}`}
                      onClick={() =>
                        setConfirmAction({
                          title: "Hapus produk dari katalog?",
                          description:
                            "Order yang sudah tercatat tetap aman; produk hanya dilepas dari kurasi katalog.",
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
                </div>
              </Fragment>
            ))}
            {!hasCatalogFilters && catalogDragState && !catalogDropBeforeItemId ? (
              <div className="catalog-item-drop-indicator" aria-hidden="true">
                <span />
                Lepas di sini
              </div>
            ) : null}
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
        confirmationPhrase={confirmAction?.confirmationPhrase}
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
