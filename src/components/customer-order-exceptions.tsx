"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Card, Field, LoadingRegion, Money, SkeletonText, StatusBadge } from "@/components/ui";
import { useProduct } from "@/domain/prototype/store";

type CustomerException = Awaited<FunctionReturnType<typeof api.orderExceptions.listMineForOrder>>[number];
type CustomerRefund = Awaited<FunctionReturnType<typeof api.refunds.listMine>>[number];
type Item = { id: string; title: string; format: string; quantity: number; subtotal: number };

const typeLabels: Record<CustomerException["type"], string> = {
  out_of_stock: "Item tidak tersedia",
  defect: "Masalah barang",
  customer_cancellation: "Pembatalan diminta",
  admin_cancellation: "Pembatalan oleh admin",
};

const statusLabels: Record<CustomerException["status"], string> = {
  opened: "Masalah dilaporkan",
  under_review: "Sedang ditinjau",
  resolution_selected: "Penyelesaian dipilih",
  resolved: "Selesai",
  rejected: "Permintaan ditolak",
};

function statusTone(status: CustomerException["status"]): "neutral" | "positive" | "warning" {
  if (status === "resolved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function CancellationAction({ item, enabled }: { item: Item; enabled: boolean }) {
  const eligibility = useQuery(
    api.orderExceptions.getCancellationEligibility,
    enabled ? { orderItemId: item.id as Id<"orderItems"> } : "skip",
  );
  const request = useMutation(api.orderExceptions.requestCancellation);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!eligibility || eligibility.decision === "not_eligible") return null;
  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {eligibility.decision === "eligible" ? "Ajukan pembatalan" : "Minta tinjauan admin"}
      </Button>
    );
  }
  return (
    <form
      className="form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage("");
        setIsSubmitting(true);
        try {
          await request({ orderItemId: item.id as Id<"orderItems">, reason });
          setMessage("Permintaan pembatalan sudah dikirim untuk ditinjau.");
          setReason("");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Permintaan belum dapat dikirim.");
        } finally {
          setIsSubmitting(false);
        }
      }}
    >
      <Field label={`Alasan untuk ${item.title}`}>
        <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} required />
      </Field>
      <div className="form-actions">
        <Button type="submit" pending={isSubmitting} pendingLabel="Mengirim…">
          Kirim permintaan
        </Button>
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
          Tutup
        </Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function ExceptionCard({ exception }: { exception: CustomerException }) {
  return (
    <div className="content-stack">
      <div className="split-heading">
        <div>
          <span className="card-kicker">{typeLabels[exception.type]}</span>
          <h3>{exception.item?.bookTitle || "Item pesanan"}</h3>
        </div>
        <StatusBadge tone={statusTone(exception.status)}>{statusLabels[exception.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>Jumlah terdampak</span>
        <strong>{exception.affectedQuantity}</strong>
      </div>
      {exception.customerNote ? <p className="subtle">{exception.customerNote}</p> : null}
      {exception.financialImpact ? (
        <div className="summary-line">
          <span>Status keuangan</span>
          <span>
            {exception.financialImpact.refundObligationStatus === "refund_due"
              ? "Kredit atau refund menunggu penyelesaian"
              : "Tercatat"}
          </span>
        </div>
      ) : null}
      <ul className="timeline">
        {exception.history.map((event) => (
          <li key={`${event.eventType}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{statusLabels[event.toStatus || exception.status] || event.eventType}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function refundLabel(refund: CustomerRefund): string {
  if (refund.status === "paid") return "Refund telah dikirim";
  if (refund.payouts.some((payout) => payout.status === "processing")) return "Refund sedang diproses";
  return "Refund perlu diproses";
}

export function CustomerOrderExceptions({ orderId, items }: { orderId: string; items: Item[] }) {
  const { dataSource } = useProduct();
  const exceptions = useQuery(
    api.orderExceptions.listMineForOrder,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const refunds = useQuery(api.refunds.listMine, dataSource === "convex" ? {} : "skip");
  if (dataSource !== "convex") return null;
  if (exceptions === undefined) {
    return (
      <Card>
        <LoadingRegion label="Memuat masalah pesanan">
          <SkeletonText width="42%" />
          <SkeletonText width="82%" />
          <SkeletonText width="64%" />
        </LoadingRegion>
      </Card>
    );
  }
  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">Masalah pesanan</span>
          <h2>Penanganan dan permintaan</h2>
        </div>
        <StatusBadge>{exceptions.length ? `${exceptions.length} tercatat` : "Tidak ada masalah"}</StatusBadge>
      </div>
      {exceptions.length ? (
        <div className="content-stack">
          {exceptions.map((exception) => (
            <ExceptionCard key={exception.exceptionId} exception={exception} />
          ))}
        </div>
      ) : (
        <p className="subtle">Tidak ada masalah yang tercatat untuk pesanan ini.</p>
      )}
      {refunds
        ?.filter((refund) => refund.orderId === orderId)
        .map((refund) => (
          <div className="summary-line" key={refund.obligationId}>
            <span>Refund</span>
            <span>
              <StatusBadge tone={refund.status === "paid" ? "positive" : "neutral"}>{refundLabel(refund)}</StatusBadge>
            </span>
          </div>
        ))}
      <div className="content-stack">
        {items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.title} · {item.format}
              <br />
              <span className="subtle">Nilai awal item</span>
            </span>
            <span>
              <Money amount={item.subtotal} />
              <br />
              <CancellationAction item={item} enabled={dataSource === "convex"} />
            </span>
          </div>
        ))}
      </div>
      <p className="subtle">
        Permintaan pembatalan ditinjau oleh admin BFG. Pengembalian dana tidak dijalankan otomatis.
      </p>
    </Card>
  );
}
