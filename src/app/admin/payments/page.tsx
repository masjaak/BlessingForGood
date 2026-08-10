"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, Field, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { paymentConfirmationStatusLabel } from "@/domain/prototype/operations";
import { useOperations, type AdminPaymentQueue } from "@/domain/prototype/operations-context";
import { formatIdr } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
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
  const invoice = confirmation.invoice;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Payment review failed");
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{invoice?.invoiceNumber || confirmation.invoiceId}</span>
          <h2>{invoice ? invoice.customerName : "Invoice unavailable"}</h2>
          {invoice?.customerEmail ? <p className="subtle">{invoice.customerEmail}</p> : null}
        </div>
        <StatusBadge tone={statusTone(confirmation.status)}>
          {paymentConfirmationStatusLabel(confirmation.status)}
        </StatusBadge>
      </div>
      <div className="summary-line">
        <span>Submitted amount</span>
        <strong>{formatIdr(confirmation.amount)}</strong>
      </div>
      <div className="summary-line">
        <span>Invoice outstanding now</span>
        <strong>{formatIdr(invoice?.outstandingAmount || 0)}</strong>
      </div>
      <div className="summary-line">
        <span>Method · paid date</span>
        <span>
          {confirmation.paymentMethod} · {new Date(confirmation.paidAt).toLocaleDateString("en-GB")}
        </span>
      </div>
      {confirmation.transferReference ? (
        <div className="summary-line">
          <span>Transfer reference</span>
          <span>{confirmation.transferReference}</span>
        </div>
      ) : null}
      {confirmation.proofReference ? (
        <div className="summary-line">
          <span>Proof reference</span>
          <span>{confirmation.proofReference}</span>
        </div>
      ) : null}
      {confirmation.customerNote ? <p className="subtle">Customer note: {confirmation.customerNote}</p> : null}
      <p className="subtle">Submitted {new Date(confirmation.submittedAt).toLocaleString("en-GB")}</p>
      {confirmation.status === "submitted" ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void run(() => startPaymentReview(confirmation.confirmationId), "Marked under review.")}
        >
          Start review
        </Button>
      ) : null}
      {confirmation.status === "under_review" ? (
        <div className="content-stack">
          <Field label="Review note (optional)">
            <textarea className="textarea" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </Field>
          <div className="form-actions">
            <Button
              type="button"
              onClick={() =>
                void run(
                  () => approvePaymentConfirmation(confirmation.confirmationId, reviewNote || undefined),
                  "Payment approved.",
                )
              }
            >
              Approve payment
            </Button>
            <Button
              type="button"
              variant="danger"
              onClick={() =>
                void run(
                  () =>
                    rejectPaymentConfirmation(confirmation.confirmationId, rejectionReason, reviewNote || undefined),
                  "Payment rejected.",
                )
              }
            >
              Reject payment
            </Button>
          </div>
          <Field label="Rejection reason (required to reject)">
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
  const { dataSource } = usePrototype();
  const { adminPaymentQueue, adminPaymentHistory } = useOperations();
  if (dataSource !== "convex")
    return <div className="state-panel">Payment review requires the Convex data source.</div>;
  if (adminPaymentQueue === undefined) return <div className="state-panel">Loading payment confirmations…</div>;
  const resolvedHistory =
    adminPaymentHistory?.page.filter(
      (confirmation) => confirmation.status === "approved" || confirmation.status === "rejected",
    ) || [];

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Payment operations"
        title="Review payment confirmations."
        description="Approve only after the manual payment evidence matches the customer submission. Approved amounts settle the invoice once."
        actions={
          <LinkButton href="/admin/invoices" variant="secondary">
            Invoice operations
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
              title="No payment confirmations waiting"
              description="Customer-submitted payment confirmations will appear here. The queue does not seed business data."
            />
          )}
          {resolvedHistory.length ? (
            <Card>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">Review history</span>
                  <h2>Recently resolved confirmations</h2>
                </div>
              </div>
              {resolvedHistory.map((confirmation) => (
                <div className="summary-line" key={confirmation.confirmationId}>
                  <span>
                    {confirmation.invoice?.invoiceNumber || confirmation.invoiceId} ·{" "}
                    {confirmation.invoice?.customerName || "Unknown customer"}
                    <br />
                    {paymentConfirmationStatusLabel(confirmation.status)} ·{" "}
                    {confirmation.reviewedAt
                      ? new Date(confirmation.reviewedAt).toLocaleString("en-GB")
                      : "Not reviewed"}
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
      <PrototypeModeGuard requiredRole="admin">
        <AdminPayments />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
