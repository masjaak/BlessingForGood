"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { productErrorMessage } from "@/domain/prototype/errors";
import { Button, ConfirmationDialog, Field, LinkButton } from "@/components/ui";

type AdminOrderItemCancellationProps = {
  orderItemId: string;
  orderStatus: string;
  bookTitle: string;
  format: string;
  quantity: number;
};

type ReasonCode =
  | "ALREADY_FULFILLED"
  | "ALREADY_CANCELLED"
  | "ACTIVE_EXCEPTION_EXISTS"
  | "NO_REMAINING_QUANTITY"
  | "INVALID_QUANTITY"
  | "BATCH_LOCKED"
  | "BATCH_RECONCILIATION_REQUIRED"
  | "INVOICE_RECONCILIATION_REQUIRED"
  | "PAYMENT_RECONCILIATION_REQUIRED";

function eligibilityMessage(reasonCode: ReasonCode | null): string {
  switch (reasonCode) {
    case "BATCH_LOCKED":
      return "Item sudah masuk Batch PO yang diproses. Pembatalan akan dicatat untuk tinjauan Admin dan riwayat Batch tetap dipertahankan.";
    case "BATCH_RECONCILIATION_REQUIRED":
      return "Penugasan Batch masih mencakup jumlah yang akan dibatalkan. Rekonsiliasi penugasan diperlukan sebelum penyelesaian.";
    case "INVOICE_RECONCILIATION_REQUIRED":
    case "PAYMENT_RECONCILIATION_REQUIRED":
      return "Sudah ada konsekuensi invoice atau pembayaran. Pembatalan akan masuk tinjauan dan rekonsiliasi keuangan.";
    case "ACTIVE_EXCEPTION_EXISTS":
      return "Item sudah memiliki masalah aktif yang harus diselesaikan terlebih dahulu.";
    case "ALREADY_FULFILLED":
      return "Item sudah selesai dipenuhi.";
    case "ALREADY_CANCELLED":
      return "Order atau item ini sudah dibatalkan.";
    case "NO_REMAINING_QUANTITY":
    case "INVALID_QUANTITY":
      return "Jumlah yang dapat dibatalkan sudah tidak mencukupi.";
    default:
      return "Periksa kembali jumlah dan konsekuensi pembatalan item.";
  }
}

export function AdminOrderItemCancellation({
  orderItemId,
  orderStatus,
  bookTitle,
  format,
  quantity,
}: AdminOrderItemCancellationProps) {
  const [open, setOpen] = useState(false);
  const [affectedQuantity, setAffectedQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [message, setMessage] = useState("");
  const [exceptionId, setExceptionId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const cancelItem = useMutation(api.orderExceptions.cancelItem);
  const quantityValue = Number(affectedQuantity);
  const hasValidQuantity = Number.isSafeInteger(quantityValue) && quantityValue > 0;
  const eligibility = useQuery(
    api.orderExceptions.getAdminCancellationEligibility,
    orderStatus === "submitted" && hasValidQuantity
      ? {
          orderItemId: orderItemId as Id<"orderItems">,
          affectedQuantity: quantityValue,
        }
      : "skip",
  );
  const canSubmit =
    !isSubmitting &&
    eligibility !== undefined &&
    eligibility.decision !== "not_eligible" &&
    hasValidQuantity &&
    reason.trim().length > 0;
  const maxCancellableQuantity = eligibility?.cancellableQuantity ?? quantity;

  async function submit() {
    if (!canSubmit) return;
    setIsSubmitting(true);
    setMessage("");
    try {
      const result = await cancelItem({
        orderItemId: orderItemId as Id<"orderItems">,
        affectedQuantity: quantityValue,
        reason: reason.trim(),
        customerNote: customerNote.trim() || undefined,
      });
      setExceptionId(String(result.exception.exceptionId));
      setOpen(false);
      setMessage(
        result.outcome === "resolved"
          ? "Item berhasil dibatalkan dan riwayat tetap tersimpan."
          : "Pembatalan dicatat dan menunggu tinjauan Admin.",
      );
    } catch (error) {
      setMessage(productErrorMessage(error, "Pembatalan item belum dapat disimpan."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (orderStatus !== "submitted") {
    return <span className="subtle">Pembatalan item hanya tersedia untuk pesanan aktif.</span>;
  }

  return (
    <>
      <Button
        type="button"
        variant="danger"
        size="compact"
        aria-haspopup="dialog"
        onClick={() => {
          setMessage("");
          setExceptionId(null);
          setAffectedQuantity("1");
          setReason("");
          setCustomerNote("");
          setOpen(true);
        }}
      >
        Batalkan item
      </Button>
      {message ? (
        <span className="subtle" role="status">
          {message}{" "}
          {exceptionId ? (
            <LinkButton href="/admin/exceptions" variant="tertiary" size="compact">
              Tinjau
            </LinkButton>
          ) : null}
        </span>
      ) : null}
      <ConfirmationDialog
        open={open}
        title="Batalkan item pesanan?"
        description="Riwayat pesanan tetap tersimpan. Jika ada Batch atau konsekuensi keuangan, pembatalan akan masuk tinjauan Admin."
        confirmLabel={eligibility?.decision === "requires_admin_review" ? "Kirim untuk ditinjau" : "Batalkan item"}
        danger
        disabled={!canSubmit}
        onCancel={() => {
          if (!isSubmitting) setOpen(false);
        }}
        onConfirm={() => void submit()}
      >
        <div className="content-stack">
          <div className="summary-line">
            <span>
              {bookTitle} · {format}
            </span>
            <strong>{maxCancellableQuantity} dapat dibatalkan</strong>
          </div>
          <Field label="Jumlah yang dibatalkan" hint={`Maksimum: ${maxCancellableQuantity}`}>
            <input
              className="input"
              type="number"
              min="1"
              max={maxCancellableQuantity}
              step="1"
              value={affectedQuantity}
              onChange={(event) => setAffectedQuantity(event.target.value)}
              required
            />
          </Field>
          {eligibility === undefined ? <p className="subtle">Memeriksa kelayakan pembatalan…</p> : null}
          {eligibility && eligibility.decision !== "eligible" ? (
            <p className="subtle" role="status">
              {eligibilityMessage(eligibility.reasonCode as ReasonCode | null)}
            </p>
          ) : null}
          <Field label="Alasan">
            <textarea
              className="textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="Contoh: Publisher tidak dapat menyediakan format ini."
              required
            />
          </Field>
          <Field label="Catatan untuk pelanggan (opsional)">
            <textarea
              className="textarea"
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
            />
          </Field>
        </div>
      </ConfirmationDialog>
    </>
  );
}
