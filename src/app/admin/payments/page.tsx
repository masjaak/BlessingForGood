"use client";

import { useState } from "react";
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
import { paymentConfirmationStatusLabel } from "@/domain/prototype/operations";
import { useOperations, type AdminPaymentQueue } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function statusTone(status: AdminPaymentQueue[number]["status"]): "neutral" | "positive" | "warning" {
  if (status === "approved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function PaymentReviewCard({ confirmation }: { confirmation: AdminPaymentQueue[number] }) {
  const { startPaymentReview, approvePaymentConfirmation, rejectPaymentConfirmation } = useOperations();
  const [rejectionReason, setRejectionReason] = useState("");
  const [reviewNote, setReviewNote] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const invoice = confirmation.invoice;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    setError("");
    setPendingAction(success);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Tinjauan pembayaran gagal");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{invoice?.invoiceNumber || confirmation.invoiceId}</span>
          <h2>{invoice ? invoice.customerName : "Invoice tidak tersedia"}</h2>
          {invoice?.customerEmail ? <p className="subtle">{invoice.customerEmail}</p> : null}
        </div>
        <StatusBadge tone={statusTone(confirmation.status)}>
          {paymentConfirmationStatusLabel(confirmation.status)}
        </StatusBadge>
      </div>
      <div className="summary-line">
        <span>Jumlah yang dikirim</span>
        <strong>{formatIdr(confirmation.amount)}</strong>
      </div>
      <div className="summary-line">
        <span>Sisa invoice saat ini</span>
        <strong>{formatIdr(invoice?.outstandingAmount || 0)}</strong>
      </div>
      <div className="summary-line">
        <span>Metode · tanggal bayar</span>
        <span>
          {confirmation.paymentMethod} · {new Date(confirmation.paidAt).toLocaleDateString("id-ID")}
        </span>
      </div>
      {confirmation.transferReference ? (
        <div className="summary-line">
          <span>Referensi transfer</span>
          <span>{confirmation.transferReference}</span>
        </div>
      ) : null}
      {confirmation.proofReference ? (
        <div className="summary-line">
          <span>Referensi bukti</span>
          <span>{confirmation.proofReference}</span>
        </div>
      ) : null}
      {confirmation.proofUrl ? (
        <a className="button button-secondary" href={confirmation.proofUrl} target="_blank" rel="noreferrer">
          Lihat bukti transfer
        </a>
      ) : null}
      {confirmation.customerNote ? <p className="subtle">Catatan customer: {confirmation.customerNote}</p> : null}
      <p className="subtle">Dikirim {new Date(confirmation.submittedAt).toLocaleString("id-ID")}</p>
      {confirmation.status === "submitted" ? (
        <Button
          type="button"
          variant="secondary"
          pending={pendingAction === "Masuk tahap tinjauan."}
          pendingLabel="Memulai…"
          onClick={() => void run(() => startPaymentReview(confirmation.confirmationId), "Masuk tahap tinjauan.")}
        >
          Mulai tinjauan
        </Button>
      ) : null}
      {confirmation.status === "under_review" ? (
        <div className="content-stack">
          <Field label="Catatan tinjauan (opsional)">
            <textarea className="textarea" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </Field>
          <div className="form-actions">
            <Button
              type="button"
              pending={pendingAction === "Pembayaran disetujui."}
              pendingLabel="Menyetujui…"
              onClick={() =>
                void run(
                  () => approvePaymentConfirmation(confirmation.confirmationId, reviewNote || undefined),
                  "Pembayaran disetujui.",
                )
              }
            >
              Setujui pembayaran
            </Button>
            <Button
              type="button"
              variant="danger"
              pending={pendingAction === "Pembayaran ditolak."}
              pendingLabel="Menolak…"
              onClick={() =>
                void run(
                  () =>
                    rejectPaymentConfirmation(confirmation.confirmationId, rejectionReason, reviewNote || undefined),
                  "Pembayaran ditolak.",
                )
              }
            >
              Tolak pembayaran
            </Button>
          </div>
          <Field label="Alasan penolakan (wajib untuk menolak)">
            <textarea
              className="textarea"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
            />
          </Field>
        </div>
      ) : null}
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
    </Card>
  );
}

function AdminPayments() {
  const { dataSource } = useProduct();
  const { adminPaymentQueue, adminPaymentHistory } = useOperations();
  if (dataSource !== "convex") return <div className="state-panel">Antrian pembayaran belum tersedia.</div>;
  if (adminPaymentQueue === undefined) {
    return (
      <LoadingRegion label="Memuat konfirmasi pembayaran">
        <SkeletonCard variant="invoice" />
        <SkeletonCard variant="invoice" />
      </LoadingRegion>
    );
  }
  const resolvedHistory =
    adminPaymentHistory?.page.filter(
      (confirmation) => confirmation.status === "approved" || confirmation.status === "rejected",
    ) || [];

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi pembayaran"
        title="Tinjau konfirmasi pembayaran."
        description="Setujui hanya setelah bukti pembayaran cocok dengan kiriman customer. Jumlah yang disetujui dihitung satu kali terhadap invoice."
        actions={
          <LinkButton href="/admin/invoices" variant="secondary">
            Operasi invoice
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {adminPaymentQueue.length ? (
            <div className="content-stack">
              {adminPaymentQueue.map((confirmation) => (
                <PaymentReviewCard key={confirmation.confirmationId} confirmation={confirmation} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tidak ada konfirmasi yang menunggu"
              description="Konfirmasi pembayaran dari customer akan tampil di sini untuk ditinjau."
            />
          )}
          {resolvedHistory.length ? (
            <Card>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">Riwayat tinjauan</span>
                  <h2>Konfirmasi yang baru diselesaikan</h2>
                </div>
              </div>
              {resolvedHistory.map((confirmation) => (
                <div className="summary-line" key={confirmation.confirmationId}>
                  <span>
                    {confirmation.invoice?.invoiceNumber || confirmation.invoiceId} ·{" "}
                    {confirmation.invoice?.customerName || "Customer tidak dikenal"}
                    <br />
                    {paymentConfirmationStatusLabel(confirmation.status)} ·{" "}
                    {confirmation.reviewedAt
                      ? new Date(confirmation.reviewedAt).toLocaleString("id-ID")
                      : "Belum ditinjau"}
                  </span>
                  <strong>{formatIdr(confirmation.amount)}</strong>
                </div>
              ))}
            </Card>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminPaymentsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminPayments />
      </ProductAccessGuard>
    </SiteShell>
  );
}
