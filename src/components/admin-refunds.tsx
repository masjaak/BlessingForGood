"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Button, Card, EmptyState, Field, LoadingRegion, Money, SkeletonCard, StatusBadge } from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";

type Refund = Awaited<FunctionReturnType<typeof api.refunds.listForAdmin>>[number];

const statusLabels = {
  pending: "Perlu diproses",
  partially_paid: "Sebagian terkirim",
  paid: "Selesai",
  processing: "Sedang diproses",
  failed: "Gagal",
} as const;

function RefundCard({ refund }: { refund: Refund }) {
  const createPayout = useMutation(api.refunds.createPayout);
  const startPayout = useMutation(api.refunds.startPayout);
  const recordPayout = useMutation(api.refunds.recordPayout);
  const [amount, setAmount] = useState(String(refund.availablePayoutAmount));
  const [paymentMethod, setPaymentMethod] = useState("Bank transfer");
  const [referenceNote, setReferenceNote] = useState("");
  const [failureReason, setFailureReason] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<unknown>, success: string) {
    setPending(true);
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Refund belum dapat diproses.");
    } finally {
      setPending(false);
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">
            {refund.reason} · {refund.obligationId}
          </span>
          <h2>
            <Money amount={refund.remainingAmount} /> tersisa
          </h2>
          <p className="subtle">
            Pelanggan {refund.customerUserId} · total kewajiban <Money amount={refund.amount} />
          </p>
        </div>
        <StatusBadge tone={refund.status === "paid" ? "positive" : "neutral"}>
          {statusLabels[refund.status]}
        </StatusBadge>
      </div>
      {refund.status !== "paid" ? (
        <div className="form-grid">
          <Field label="Jumlah payout IDR">
            <input
              className="input"
              type="number"
              min="1"
              max={refund.availablePayoutAmount}
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
          </Field>
          <Field label="Channel">
            <input className="input" value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} />
          </Field>
          <Field label="Referensi/catatan">
            <input className="input" value={referenceNote} onChange={(event) => setReferenceNote(event.target.value)} />
          </Field>
          <div className="form-actions">
            <Button
              type="button"
              pending={pending}
              pendingLabel="Membuat payout…"
              disabled={refund.availablePayoutAmount < 1}
              onClick={() => {
                if (!window.confirm(`Buat payout ${amount} IDR untuk kewajiban ini?`)) return;
                void run(
                  () =>
                    createPayout({
                      obligationId: refund.obligationId,
                      amount: Number(amount),
                      paymentMethod,
                      referenceNote: referenceNote || undefined,
                    }),
                  "Payout dibuat.",
                );
              }}
            >
              Buat payout
            </Button>
          </div>
        </div>
      ) : null}
      {refund.payouts.map((payout) => (
        <div className="summary-line" key={payout.payoutId}>
          <span>
            <Money amount={payout.amount} /> · {statusLabels[payout.status]}
          </span>
          <span className="form-actions">
            {payout.status === "pending" ? (
              <Button
                type="button"
                pending={pending}
                pendingLabel="Memulai…"
                onClick={() => {
                  if (!window.confirm("Mulai proses payout ini?")) return;
                  void run(
                    () =>
                      startPayout({
                        payoutId: payout.payoutId as Id<"refundPayouts">,
                        paymentMethod,
                        referenceNote: referenceNote || undefined,
                      }),
                    "Payout sedang diproses.",
                  );
                }}
              >
                Mulai payout
              </Button>
            ) : null}
            {payout.status === "processing" ? (
              <>
                <Button
                  type="button"
                  pending={pending}
                  pendingLabel="Mencatat…"
                  onClick={() => {
                    if (!window.confirm("Catat payout ini sebagai sudah terkirim?")) return;
                    void run(
                      () =>
                        recordPayout({
                          payoutId: payout.payoutId as Id<"refundPayouts">,
                          status: "paid",
                          paymentMethod,
                          referenceNote: referenceNote || undefined,
                        }),
                      "Payout ditandai terkirim.",
                    );
                  }}
                >
                  Catat terkirim
                </Button>
                <input
                  className="input"
                  value={failureReason}
                  onChange={(event) => setFailureReason(event.target.value)}
                  placeholder="Alasan gagal"
                  aria-label="Alasan gagal payout"
                />
                <Button
                  type="button"
                  variant="danger"
                  pending={pending}
                  pendingLabel="Mencatat…"
                  onClick={() => {
                    if (!window.confirm("Catat payout ini sebagai gagal?")) return;
                    void run(
                      () =>
                        recordPayout({
                          payoutId: payout.payoutId as Id<"refundPayouts">,
                          status: "failed",
                          failureReason,
                        }),
                      "Payout ditandai gagal.",
                    );
                  }}
                >
                  Catat gagal
                </Button>
              </>
            ) : null}
          </span>
        </div>
      ))}
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
    </Card>
  );
}

function RefundQueueContent({ refunds }: { refunds: Refund[] }) {
  const statusSummary = (Object.keys(statusLabels) as Array<keyof typeof statusLabels>).map((status) => ({
    status,
    count: refunds.filter((refund) => refund.status === status).length,
  }));
  return (
    <>
      <Card className="admin-status-summary">
        {statusSummary.map(({ status, count }) => (
          <div key={status}>
            <span className="card-kicker">{statusLabels[status]}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </Card>
      {refunds.length ? (
        refunds.map((refund) => <RefundCard key={refund.obligationId} refund={refund} />)
      ) : (
        <EmptyState title="Tidak ada kewajiban refund" description="Refund yang disetujui akan muncul di sini." />
      )}
    </>
  );
}

export function AdminRefunds() {
  const { dataSource } = useProduct();
  const refunds = useQuery(api.refunds.listForAdmin, dataSource === "convex" ? {} : "skip");
  if (dataSource !== "convex") return <div className="state-panel">Antrian refund belum tersedia.</div>;
  return (
    <AdminOperationalPage
      eyebrow="Antrian refund"
      title="Kewajiban refund dan payout."
      description="Catat transfer tanpa menghapus invoice atau pembayaran historis."
    >
      {refunds === undefined ? (
        <LoadingRegion label="Memuat antrian refund">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : (
        <RefundQueueContent refunds={refunds} />
      )}
    </AdminOperationalPage>
  );
}
