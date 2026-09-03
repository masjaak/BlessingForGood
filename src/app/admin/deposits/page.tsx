"use client";

import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { ActionGroup, Button, Card, EmptyState, Field, LinkButton, Money, StatusBadge } from "@/components/ui";
import { formatIdr } from "@/domain/prototype/logic";
import { useAdminCursorPagination } from "@/domain/prototype/pagination";

function customerOptionLabel(customer: { displayName: string; memberCode: string | null }) {
  return `${customer.displayName} · ${customer.memberCode || "tanpa kode"}`;
}

function historyDate(value: string) {
  return new Date(value).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short" });
}

function DepositOperations() {
  const requestedCustomerId = useSearchParams().get("customerId") || "";
  const topUps = useQuery(api.depositTopUps.listForAdmin, {});
  const customers = useQuery(api.orders.listEligibleCustomers, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const historyPagination = useAdminCursorPagination();
  const startReview = useMutation(api.depositTopUps.startReview);
  const approve = useMutation(api.depositTopUps.approve);
  const reject = useMutation(api.depositTopUps.reject);
  const adjust = useMutation(api.depositTransactions.adjust);
  const [customerId, setCustomerId] = useState(requestedCustomerId);
  const [direction, setDirection] = useState<"credit" | "debit">("credit");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");
  const [historyCustomerId, setHistoryCustomerId] = useState(requestedCustomerId);
  const [historyDirection, setHistoryDirection] = useState<"" | "in" | "out">("");
  const history = useQuery(api.depositTransactions.listForAdmin, {
    paginationOpts: { numItems: historyPagination.pageSize, cursor: historyPagination.cursor },
    customerUserId: historyCustomerId ? (historyCustomerId as Id<"appUsers">) : undefined,
    direction: historyDirection || undefined,
  });
  const historyRows = history?.page || [];
  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch {
      setMessage("Aksi deposit ditolak oleh aturan status atau otorisasi.");
    } finally {
      setPending("");
    }
  }
  return (
    <AdminOperationalPage
      eyebrow="Keuangan"
      title="Deposit & top-up"
      description="Verifikasi bukti top-up, lihat status, dan catat penyesuaian manual yang selalu masuk activity log."
    >
      <Card className="deposit-topup-card">
        <span className="card-kicker">Antrian top-up</span>
        <h2>Bukti menunggu verifikasi</h2>
        {topUps?.length ? (
          topUps.map((row) => (
            <div className="summary-line" key={row.topUpId}>
              <span>
                <strong>{row.customerName}</strong>
                <br />
                <Money amount={row.amount} /> · {row.bankReference || "tanpa referensi"}
              </span>
              <span className="form-actions">
                <LinkButton variant="secondary" href={row.proofUrl || "#"} target="_blank" rel="noreferrer">
                  Lihat bukti
                </LinkButton>
                <StatusBadge>{row.status}</StatusBadge>
                {row.status === "submitted" ? (
                  <Button
                    loading={pending === `start-${row.topUpId}`}
                    onClick={() =>
                      void run(`start-${row.topUpId}`, () => startReview({ topUpId: row.topUpId }), "Tinjauan dimulai.")
                    }
                  >
                    Tinjau
                  </Button>
                ) : null}
                {row.status === "under_review" ? (
                  <>
                    <Button
                      loading={pending === `approve-${row.topUpId}`}
                      onClick={() =>
                        void run(
                          `approve-${row.topUpId}`,
                          () => approve({ topUpId: row.topUpId }),
                          "Top-up disetujui dan saldo dikreditkan.",
                        )
                      }
                    >
                      Setujui
                    </Button>
                    <Button
                      variant="danger"
                      loading={pending === `reject-${row.topUpId}`}
                      onClick={() =>
                        void run(
                          `reject-${row.topUpId}`,
                          () => reject({ topUpId: row.topUpId, reason: "Bukti transfer tidak dapat diverifikasi" }),
                          "Top-up ditolak.",
                        )
                      }
                    >
                      Tolak
                    </Button>
                  </>
                ) : null}
              </span>
            </div>
          ))
        ) : (
          <EmptyState title="Tidak ada top-up" description="Permintaan pelanggan akan tampil di sini." />
        )}
      </Card>
      <Card className="deposit-adjustment-card">
        <span className="card-kicker">Penyesuaian manual</span>
        <h2>Koreksi saldo dengan alasan wajib</h2>
        <form
          className="form-card deposit-adjustment-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              "adjust",
              () => adjust({ customerUserId: customerId as Id<"appUsers">, direction, amount: Number(amount), note }),
              "Penyesuaian dicatat.",
            );
          }}
        >
          <div className="form-grid deposit-adjustment-fields">
            <Field label="Pelanggan">
              <BFGSelect
                className="select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
              >
                <option value="">Pilih pelanggan</option>
                {customers?.page.map((customer) => (
                  <option key={customer.customerUserId} value={customer.customerUserId}>
                    {customerOptionLabel(customer)} · {customer.email || "—"}
                  </option>
                ))}
              </BFGSelect>
            </Field>
            <Field label="Arah">
              <BFGSelect
                className="select"
                value={direction}
                onChange={(event) => setDirection(event.target.value as "credit" | "debit")}
              >
                <option value="credit">Kredit</option>
                <option value="debit">Debit</option>
              </BFGSelect>
            </Field>
            <Field label="Jumlah IDR">
              <input
                className="input"
                type="number"
                min="1"
                step="1"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Alasan">
            <textarea className="textarea" value={note} onChange={(event) => setNote(event.target.value)} required />
          </Field>
          <ActionGroup className="deposit-adjustment-actions">
            <Button type="submit" loading={pending === "adjust"} loadingLabel="Mencatat…">
              Catat penyesuaian
            </Button>
          </ActionGroup>
        </form>
      </Card>
      <Card className="deposit-history-card">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Riwayat deposit</span>
            <h2>Mutasi masuk & keluar</h2>
          </div>
        </div>
        <p className="subtle">
          Riwayat perubahan saldo Customer dari top-up, alokasi, penyesuaian, dan transaksi terkait.
        </p>
        <div className="deposit-history-filters">
          <Field label="Pelanggan">
            <BFGSelect
              aria-label="Pelanggan riwayat deposit"
              className="select"
              value={historyCustomerId}
              onChange={(event) => {
                setHistoryCustomerId(event.target.value);
                historyPagination.reset();
              }}
            >
              <option value="">Semua pelanggan</option>
              {customers?.page.map((customer) => (
                <option key={customer.customerUserId} value={customer.customerUserId}>
                  {customerOptionLabel(customer)}
                </option>
              ))}
            </BFGSelect>
          </Field>
          <Field label="Arah">
            <BFGSelect
              aria-label="Arah riwayat deposit"
              className="select"
              value={historyDirection}
              onChange={(event) => {
                setHistoryDirection(event.target.value as "" | "in" | "out");
                historyPagination.reset();
              }}
            >
              <option value="">Semua</option>
              <option value="in">Masuk</option>
              <option value="out">Keluar</option>
            </BFGSelect>
          </Field>
        </div>
        {history === undefined ? <p className="subtle">Memuat riwayat deposit…</p> : null}
        {historyRows.length ? (
          <div className="deposit-history-list">
            <div className="deposit-history-heading" aria-hidden="true">
              <span>Tanggal / Customer</span>
              <span>Arah / Jumlah</span>
              <span>Sumber / Keterangan</span>
              <span>Konteks / Aktor</span>
            </div>
            {historyRows.map((row) => (
              <div className="deposit-history-row" key={row.transactionId}>
                <div className="deposit-history-primary">
                  <time dateTime={row.createdAt}>{historyDate(row.createdAt)}</time>
                  <strong>{row.customerName || "Pelanggan tidak dikenal"}</strong>
                  <span className="subtle">{row.customerMemberCode || "tanpa kode"}</span>
                </div>
                <div className="deposit-history-amount">
                  <span className={`deposit-direction deposit-direction-${row.direction}`}>
                    {row.direction === "in" ? "Masuk" : "Keluar"}
                  </span>
                  <strong>
                    {row.direction === "in" ? "+" : "−"} {formatIdr(row.amount)}
                  </strong>
                </div>
                <div className="deposit-history-description">
                  <strong>{row.source}</strong>
                  <span>{row.description || "—"}</span>
                </div>
                <div className="deposit-history-context">
                  <span>Top-up: {row.topUpReference || "—"}</span>
                  <span>Invoice: {row.invoiceNumber || "—"}</span>
                  <span>Pesanan: {row.orderCode || "—"}</span>
                  <span>Batch / Cargo: {row.batchName || "—"}</span>
                  <span>Admin: {row.actorName || "—"}</span>
                </div>
              </div>
            ))}
          </div>
        ) : history ? (
          <EmptyState title="Belum ada riwayat deposit" description="Mutasi saldo Customer akan tampil di sini." />
        ) : null}
        <AdminPagination
          {...historyPagination}
          rowCount={historyRows.length}
          isDone={history?.isDone ?? true}
          continueCursor={history?.continueCursor ?? ""}
        />
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}

export default function AdminDepositsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <DepositOperations />
      </ProductAccessGuard>
    </SiteShell>
  );
}
