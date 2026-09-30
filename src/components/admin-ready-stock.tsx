"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, LoadingRegion, Money, SkeletonCard, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { BOOK_FORMATS, type BookFormat } from "@/domain/prototype/types";

import { ReadyStockListingEditor } from "@/features/ready-stock/admin-listing-editor";
import { ReadyStockOrdersPanel } from "@/features/ready-stock/admin-orders-panel";

type ListingStatus = "draft" | "published" | "archived";
type ReadyStage = "waiting_payment" | "verifying_payment" | "paid" | "packing" | "shipping" | "delivered" | "cancelled";

const listingStatusLabel: Record<ListingStatus, string> = {
  draft: "Draf",
  published: "Terbit",
  archived: "Diarsipkan",
};

function ReadyStockContent() {
  const [search, setSearch] = useState("");
  const [listingStatus, setListingStatus] = useState<ListingStatus | "">("");
  const [orderSearch, setOrderSearch] = useState("");
  const [orderStatus, setOrderStatus] = useState<ReadyStage | "">("");
  const [selectedListingId, setSelectedListingId] = useState<Id<"readyStockListings"> | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [newFormat, setNewFormat] = useState<BookFormat>("PB");
  const [newQuantity, setNewQuantity] = useState("1");
  const [pending, setPending] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const rows = useQuery(api.readyStockListings.listForAdmin, {
    search: search.trim() || undefined,
    status: listingStatus || undefined,
  });
  const orders = useQuery(api.readyStockOrders.listForAdmin, {
    search: orderSearch.trim() || undefined,
    status: orderStatus || undefined,
  });
  const createListing = useMutation(api.readyStockListings.create);

  const summary = useMemo(() => {
    const listingRows = rows ?? [];
    const orderRows = orders ?? [];
    return {
      published: listingRows.filter((row) => row.status === "published").length,
      available: listingRows.reduce((sum, row) => sum + row.availableQuantity, 0),
      waiting: orderRows.filter((order) =>
        ["waiting_payment", "verifying_payment", "paid", "packing", "shipping"].includes(order.operationalStatus),
      ).length,
      delivered: orderRows.filter((order) => order.operationalStatus === "delivered").length,
    };
  }, [orders, rows]);

  async function create() {
    setPending("create");
    setMessage("");
    setError("");
    try {
      const result = await createListing({
        title: newTitle,
        priceAmount: Number(newPrice),
        format: newFormat,
        quantity: Number(newQuantity),
      });
      setSelectedListingId(result.listingId);
      setNewTitle("");
      setNewPrice("");
      setNewQuantity("1");
      setCreateOpen(false);
      setMessage("Ready Stock dibuat sebagai draf. Upload cover lalu terbitkan saat siap.");
    } catch {
      setError("Ready Stock belum berhasil dibuat. Periksa judul, harga, format, dan qty.");
    } finally {
      setPending(null);
    }
  }

  return (
    <AdminOperationalPage
      eyebrow="Ready Stock"
      title="Etalase real stock & pesanan."
      description="Kelola Ready Stock secara manual dari foto asli sampai checkout, tagihan, pembayaran, dan pengiriman."
      className="admin-ready-stock-page"
      loading={rows === undefined || orders === undefined}
    >
      <div className="admin-ready-stock-summary-grid">
        <Card frame="summary">
          <span className="card-kicker">Etalase terbit</span>
          <strong className="metric-money">{summary.published}</strong>
          <span className="subtle">Produk real Ready Stock</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Qty tersedia</span>
          <strong className="metric-money">{summary.available}</strong>
          <span className="subtle">Stok yang belum direservasi</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Sedang diproses</span>
          <strong className="metric-money">{summary.waiting}</strong>
          <span className="subtle">Dari pembayaran sampai pengiriman</span>
        </Card>
        <Card frame="summary">
          <span className="card-kicker">Paket sampai</span>
          <strong className="metric-money">{summary.delivered}</strong>
          <span className="subtle">Order Ready Stock selesai</span>
        </Card>
      </div>

      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}

      <Card className="admin-ready-stock-toolbar">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Etalase manual</span>
            <h2>Ready Stock</h2>
            <p className="subtle">Judul, harga, format, qty, dan foto tidak lagi ditarik dari Master Buku.</p>
          </div>
          <Button type="button" onClick={() => setCreateOpen((current) => !current)}>
            {createOpen ? "Tutup form" : "Tambah Ready Stock"}
          </Button>
        </div>
        <div className="admin-ready-stock-filter-grid">
          <Field label="Cari Ready Stock">
            <input
              className="input"
              type="search"
              placeholder="Cari judul"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </Field>
          <Field label="Status etalase">
            <BFGSelect
              value={listingStatus}
              onChange={(event) => setListingStatus(event.target.value as ListingStatus | "")}
            >
              <option value="">Semua status</option>
              <option value="draft">Draf</option>
              <option value="published">Terbit</option>
              <option value="archived">Diarsipkan</option>
            </BFGSelect>
          </Field>
        </div>
      </Card>

      {createOpen ? (
        <Card className="admin-ready-stock-create-card">
          <div className="split-heading">
            <div>
              <span className="card-kicker">Produk baru</span>
              <h2>Tambah ke etalase Ready Stock</h2>
            </div>
            <StatusBadge>Draf</StatusBadge>
          </div>
          <div className="form-grid admin-ready-stock-create-grid">
            <Field label="Judul">
              <input className="input" value={newTitle} onChange={(event) => setNewTitle(event.target.value)} />
            </Field>
            <Field label="Harga">
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={newPrice}
                onChange={(event) => setNewPrice(event.target.value)}
              />
            </Field>
            <Field label="Format">
              <BFGSelect value={newFormat} onChange={(event) => setNewFormat(event.target.value as BookFormat)}>
                {BOOK_FORMATS.map((value) => (
                  <option value={value} key={value}>
                    {value}
                  </option>
                ))}
              </BFGSelect>
            </Field>
            <Field label="Qty tersedia">
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={newQuantity}
                onChange={(event) => setNewQuantity(event.target.value)}
              />
            </Field>
          </div>
          <Button
            type="button"
            loading={pending === "create"}
            loadingLabel="Membuat…"
            disabled={pending !== null}
            onClick={() => void create()}
          >
            Buat draf Ready Stock
          </Button>
        </Card>
      ) : null}

      {selectedListingId ? (
        <ReadyStockListingEditor listingId={selectedListingId} onClose={() => setSelectedListingId(null)} />
      ) : null}

      {rows === undefined ? (
        <LoadingRegion label="Memuat etalase Ready Stock">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : rows.length ? (
        <div className="table-wrap">
          <table className="data-table admin-ready-stock-table">
            <caption className="sr-only">Etalase Ready Stock manual</caption>
            <thead>
              <tr>
                <th>Judul</th>
                <th>Format</th>
                <th>Harga</th>
                <th>Qty</th>
                <th>Reservasi</th>
                <th>Tersedia</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.listingId}>
                  <td>
                    <div className="admin-ready-stock-listing-title">
                      {row.coverImageUrl ? (
                        // Signed storage images use the existing native image boundary.
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={row.coverImageUrl} alt={`Cover ${row.title}`} />
                      ) : null}
                      <div>
                        <strong>{row.title}</strong>
                        <span className="subtle table-secondary">{row.slug}</span>
                      </div>
                    </div>
                  </td>
                  <td>{row.format}</td>
                  <td className="numeric-cell">
                    <Money amount={row.priceAmount} />
                  </td>
                  <td className="numeric-cell">{row.quantity}</td>
                  <td className="numeric-cell">{row.reservedQuantity}</td>
                  <td className="numeric-cell">
                    <strong>{row.availableQuantity}</strong>
                  </td>
                  <td>
                    <StatusBadge tone={row.status === "published" ? "positive" : "neutral"}>
                      {listingStatusLabel[row.status as ListingStatus]}
                    </StatusBadge>
                  </td>
                  <td>
                    <Button
                      type="button"
                      variant="secondary"
                      size="compact"
                      onClick={() => setSelectedListingId(row.listingId)}
                    >
                      Kelola
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Belum ada Ready Stock manual"
          description="Tambahkan produk Ready Stock untuk mulai membangun etalase foto asli."
          action={<Button onClick={() => setCreateOpen(true)}>Tambah Ready Stock</Button>}
        />
      )}

      <ReadyStockOrdersPanel
        orders={orders}
        orderSearch={orderSearch}
        setOrderSearch={setOrderSearch}
        orderStatus={orderStatus}
        setOrderStatus={setOrderStatus}
      />
    </AdminOperationalPage>
  );
}

export function AdminReadyStock() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ReadyStockContent />
      </ProductAccessGuard>
    </SiteShell>
  );
}
