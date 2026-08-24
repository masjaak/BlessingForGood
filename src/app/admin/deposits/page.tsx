"use client";

import { useMutation, useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, EmptyState, Field, LinkButton, Money, StatusBadge } from "@/components/ui";

function DepositOperations() {
  const requestedCustomerId = useSearchParams().get("customerId") || "";
  const topUps = useQuery(api.depositTopUps.listForAdmin, {});
  const customers = useQuery(api.orders.listEligibleCustomers, {});
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
      <Card>
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
      <Card>
        <span className="card-kicker">Penyesuaian manual</span>
        <h2>Koreksi saldo dengan alasan wajib</h2>
        <form
          className="form-card"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              "adjust",
              () => adjust({ customerUserId: customerId as Id<"appUsers">, direction, amount: Number(amount), note }),
              "Penyesuaian dicatat.",
            );
          }}
        >
          <div className="form-grid">
            <Field label="Pelanggan">
              <BFGSelect
                className="select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
              >
                <option value="">Pilih pelanggan</option>
                {customers?.map((customer) => (
                  <option key={customer.customerUserId} value={customer.customerUserId}>
                    {customer.displayName} · {customer.memberCode || "tanpa kode"} · {customer.email || "—"}
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
          <Button loading={pending === "adjust"} loadingLabel="Mencatat…">
            Catat penyesuaian
          </Button>
        </form>
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
