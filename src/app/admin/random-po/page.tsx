"use client";

import { useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { formatIdr } from "@/domain/prototype/logic";

type QueueFilter =
  | "all"
  | "unbilled"
  | "awaiting_payment"
  | "payment_submitted"
  | "paid_waiting_arrival"
  | "received";

const filterOptions: Array<{ value: QueueFilter; label: string }> = [
  { value: "all", label: "Semua status" },
  { value: "unbilled", label: "Belum ditagih" },
  { value: "awaiting_payment", label: "Menunggu pembayaran" },
  { value: "payment_submitted", label: "Pembayaran dikirim" },
  { value: "paid_waiting_arrival", label: "Sudah lunas · menunggu datang" },
  { value: "received", label: "Diterima" },
];

function queueStatusLabel(status: QueueFilter) {
  if (status === "unbilled") return "Belum ditagih";
  if (status === "awaiting_payment") return "Menunggu pembayaran";
  if (status === "payment_submitted") return "Pembayaran dikirim";
  if (status === "paid_waiting_arrival") return "Sudah lunas · Menunggu datang";
  if (status === "received") return "Diterima";
  return "Semua";
}

function queueStatusTone(status: QueueFilter): "neutral" | "positive" | "warning" {
  if (status === "received") return "positive";
  if (status === "paid_waiting_arrival" || status === "payment_submitted" || status === "awaiting_payment")
    return "warning";
  return "neutral";
}

function AdminRandomPoQueue() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<QueueFilter>("all");
  const [pendingEntryId, setPendingEntryId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const queue = useQuery(api.manualPoEntries.listQueueForAdmin, {
    search: search.trim() || undefined,
    status,
  });
  const issueManualPo = useMutation(api.invoices.issueManualPo);
  const setManualPoStatus = useMutation(api.manualPoEntries.setStatus);

  const customers = queue?.customers ?? [];
  const visibleEntryCount = useMemo(
    () => customers.reduce((sum, customer) => sum + customer.entries.length, 0),
    [customers],
  );

  async function issueInvoice(entryId: Id<"manualPoEntries">) {
    setMessage("");
    setError("");
    setPendingEntryId(String(entryId));
    try {
      await issueManualPo({ entryId });
      setMessage("Tagihan Random PO berhasil diterbitkan.");
    } catch {
      setError("Tagihan Random PO belum berhasil diterbitkan. Coba lagi.");
    } finally {
      setPendingEntryId(null);
    }
  }

  async function markReceived(entryId: Id<"manualPoEntries">) {
    setMessage("");
    setError("");
    setPendingEntryId(String(entryId));
    try {
      await setManualPoStatus({ entryId, status: "arrived" });
      setMessage("Random PO ditandai diterima.");
    } catch {
      setError("Status Random PO belum berhasil diperbarui. Coba lagi.");
    } finally {
      setPendingEntryId(null);
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional PO Random"
        title="Antrian Pesanan Khusus"
        description="Lihat semua pelanggan yang punya Random PO aktif, cek status penagihan, lalu eksekusi tagihan tanpa masuk satu-satu ke detail pelanggan."
        actions={
          <LinkButton href="/admin/customers" variant="secondary">
            Tambah PO Random
          </LinkButton>
        }
        loading={queue === undefined}
        skeleton={{ titleWidth: "54%", descriptionWidths: ["92%", "72%"], actionWidths: ["132px"] }}
      />

      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {queue === undefined ? (
            <LoadingRegion label="Memuat antrian PO Random">
              <div className="content-stack">
                <SkeletonCard />
                <SkeletonCard />
                <SkeletonCard />
              </div>
            </LoadingRegion>
          ) : (
            <>
              <div className="random-po-summary-grid">
                <Card frame="summary" className="random-po-summary-card">
                  <span className="card-kicker">Pelanggan aktif</span>
                  <strong className="metric-money">{queue.summary.customerCount}</strong>
                  <span className="subtle">Pelanggan dengan Random PO berjalan</span>
                </Card>
                <Card frame="summary" className="random-po-summary-card">
                  <span className="card-kicker">PO berjalan</span>
                  <strong className="metric-money">{queue.summary.itemCount}</strong>
                  <span className="subtle">{formatIdr(queue.summary.totalAmount)} nilai pesanan</span>
                </Card>
                <Card frame="summary" className="random-po-summary-card">
                  <span className="card-kicker">Belum ditagih</span>
                  <strong className="metric-money">{queue.summary.unbilledCount}</strong>
                  <span className="subtle">Perlu keputusan Admin</span>
                </Card>
                <Card frame="summary" className="random-po-summary-card">
                  <span className="card-kicker">Menunggu bayar</span>
                  <strong className="metric-money">
                    {queue.summary.awaitingPaymentCount + queue.summary.paymentSubmittedCount}
                  </strong>
                  <span className="subtle">{formatIdr(queue.summary.outstandingAmount)} outstanding</span>
                </Card>
                <Card frame="summary" className="random-po-summary-card">
                  <span className="card-kicker">Pasca pembayaran</span>
                  <strong className="metric-money">{queue.summary.paidCount + queue.summary.receivedCount}</strong>
                  <span className="subtle">
                    {queue.summary.paidCount} menunggu datang · {queue.summary.receivedCount} diterima
                  </span>
                </Card>
              </div>

              <Card className="random-po-queue-controls">
                <div className="random-po-filter-grid">
                  <Field label="Cari pelanggan / buku">
                    <input
                      className="input"
                      type="search"
                      value={search}
                      placeholder="Nama, email, kode anggota, judul, atau ETA"
                      onChange={(event) => setSearch(event.target.value)}
                    />
                  </Field>
                  <Field label="Status operasional">
                    <BFGSelect
                      aria-label="Status operasional PO Random"
                      value={status}
                      onChange={(event) => setStatus(event.target.value as QueueFilter)}
                    >
                      {filterOptions.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </BFGSelect>
                  </Field>
                  <Button
                    type="button"
                    variant="tertiary"
                    disabled={!search.trim() && status === "all"}
                    onClick={() => {
                      setSearch("");
                      setStatus("all");
                    }}
                  >
                    Reset filter
                  </Button>
                </div>
                <p className="subtle" role="status">
                  {customers.length} pelanggan · {visibleEntryCount} item tampil
                  {queue.truncated ? " · Data dibatasi ke 500 PO Random terbaru" : ""}
                </p>
              </Card>

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

              {customers.length ? (
                <div className="content-stack random-po-customer-list">
                  {customers.map((customer) => (
                    <Card className="random-po-customer-card" key={customer.customerUserId}>
                      <div className="split-heading">
                        <div>
                          <span className="card-kicker">{customer.memberCode || "Blessfriend"}</span>
                          <h2>{customer.customerName}</h2>
                          {customer.customerEmail ? <p className="subtle">{customer.customerEmail}</p> : null}
                        </div>
                        <div className="random-po-customer-heading-actions">
                          <StatusBadge>{customer.itemCount} PO aktif</StatusBadge>
                          <LinkButton
                            href={`/admin/customers/${customer.customerUserId}#manual-po`}
                            variant="secondary"
                            size="compact"
                          >
                            Buka pelanggan
                          </LinkButton>
                        </div>
                      </div>

                      <div className="random-po-customer-meta">
                        <span>{formatIdr(customer.totalAmount)} total</span>
                        <span>{customer.unbilledCount} belum ditagih</span>
                        <span>
                          {customer.awaitingPaymentCount + customer.paymentSubmittedCount} proses pembayaran
                        </span>
                        <span>{customer.paidCount} menunggu datang</span>
                        <span>{customer.receivedCount} diterima</span>
                      </div>

                      <div className="content-stack random-po-entry-list">
                        {customer.entries.map((entry) => (
                          <div className="random-po-queue-row" key={entry.entryId}>
                            <div className="random-po-queue-main">
                              <strong>{entry.title}</strong>
                              <span className="subtle">ETA: {entry.etaText}</span>
                              <span className="subtle">
                                Dibuat {new Date(entry.createdAt).toLocaleDateString("id-ID")}
                              </span>
                            </div>

                            <Money amount={entry.priceAmount} />

                            <div className="random-po-queue-status">
                              <StatusBadge tone={queueStatusTone(entry.queueStatus)}>
                                {queueStatusLabel(entry.queueStatus)}
                              </StatusBadge>
                              {entry.outstandingAmount > 0 ? (
                                <span className="subtle">Sisa {formatIdr(entry.outstandingAmount)}</span>
                              ) : null}
                            </div>

                            <div className="random-po-queue-actions">
                              {entry.invoiceId ? (
                                <LinkButton href={`/admin/invoices/${entry.invoiceId}`} variant="secondary" size="compact">
                                  Buka tagihan
                                </LinkButton>
                              ) : (
                                <Button
                                  type="button"
                                  size="compact"
                                  loading={pendingEntryId === String(entry.entryId)}
                                  loadingLabel="Menerbitkan…"
                                  disabled={pendingEntryId !== null}
                                  onClick={() => void issueInvoice(entry.entryId)}
                                >
                                  Buat tagihan
                                </Button>
                              )}
                              {entry.queueStatus === "paid_waiting_arrival" ? (
                                <Button
                                  type="button"
                                  variant="secondary"
                                  size="compact"
                                  loading={pendingEntryId === String(entry.entryId)}
                                  loadingLabel="Menyimpan…"
                                  disabled={pendingEntryId !== null}
                                  onClick={() => void markReceived(entry.entryId)}
                                >
                                  Tandai diterima
                                </Button>
                              ) : null}
                              <LinkButton
                                href={`/admin/customers/${customer.customerUserId}#manual-po`}
                                variant="tertiary"
                                size="compact"
                              >
                                Detail PO
                              </LinkButton>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <Card>
                  <EmptyState
                    title="Tidak ada PO Random yang cocok"
                    description={
                      search.trim() || status !== "all"
                        ? "Coba reset filter atau gunakan kata kunci lain."
                        : "Pelanggan yang punya Random PO aktif akan otomatis masuk ke antrian ini."
                    }
                    action={
                      search.trim() || status !== "all" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setSearch("");
                            setStatus("all");
                          }}
                        >
                          Reset filter
                        </Button>
                      ) : (
                        <LinkButton href="/admin/customers" variant="secondary">
                          Buka pelanggan
                        </LinkButton>
                      )
                    }
                  />
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AdminRandomPoPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminRandomPoQueue />
      </ProductAccessGuard>
    </SiteShell>
  );
}
