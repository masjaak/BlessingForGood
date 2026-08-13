"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
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
import { useProduct } from "@/domain/prototype/store";

type AdminException = Awaited<FunctionReturnType<typeof api.orderExceptions.listForAdmin>>[number];
type AdminOrdersPage = NonNullable<FunctionReturnType<typeof api.orders.listForAdmin>>;
type AdminOrder = AdminOrdersPage["page"][number];
type Resolution = "remove_item" | "deposit_release" | "refund_required" | "replacement" | "no_action";

const typeLabels = {
  out_of_stock: "Stok tidak tersedia",
  defect: "Defect",
  customer_cancellation: "Pembatalan customer",
  admin_cancellation: "Pembatalan admin",
} as const;

const statusLabels = {
  opened: "Dibuka",
  under_review: "Sedang ditinjau",
  resolution_selected: "Resolusi dipilih",
  resolved: "Selesai",
  rejected: "Ditolak",
} as const;

const resolutionLabels: Record<Resolution, string> = {
  remove_item: "Hapus jumlah terdampak",
  deposit_release: "Lepaskan alokasi deposit",
  refund_required: "Catat kewajiban refund",
  replacement: "Atur penggantian",
  no_action: "Tanpa tindakan",
};

function tone(status: AdminException["status"]): "neutral" | "positive" | "warning" {
  if (status === "resolved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function OpenExceptionForm({ orders }: { orders: AdminOrder[] }) {
  const open = useMutation(api.orderExceptions.open);
  const [orderId, setOrderId] = useState("");
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<"out_of_stock" | "defect" | "admin_cancellation">("out_of_stock");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedOrder = orders.find((order) => order.orderId === orderId);
  const selectedItem = selectedOrder?.items.find((item) => item._id === itemId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      await open({
        orderItemId: itemId as Id<"orderItems">,
        type,
        affectedQuantity: Number(quantity),
        reason,
        customerNote: customerNote || undefined,
        internalNote: internalNote || undefined,
      });
      setOrderId("");
      setItemId("");
      setReason("");
      setCustomerNote("");
      setInternalNote("");
      setMessage("Masalah berhasil dibuka.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Masalah belum dapat dibuka.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <details className="admin-operations-disclosure">
      <summary className="button button-primary">Catat exception</summary>
      <Card>
        <span className="card-kicker">Operasi admin</span>
        <h2>Buka masalah pesanan</h2>
        <p className="subtle">Server memvalidasi jumlah, kepemilikan, dan konflik masalah aktif.</p>
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <Field label="Jenis">
              <select className="select" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
                <option value="out_of_stock">Stok tidak tersedia</option>
                <option value="defect">Defect</option>
                <option value="admin_cancellation">Pembatalan admin</option>
              </select>
            </Field>
            <Field label="Pesanan">
              <select
                className="select"
                value={orderId}
                onChange={(event) => {
                  setOrderId(event.target.value);
                  setItemId("");
                }}
                required
              >
                <option value="">Pilih pesanan…</option>
                {orders.map((order) => (
                  <option value={order.orderId} key={order.orderId}>
                    {order.customerName} · {order.orderId}
                  </option>
                ))}
              </select>
            </Field>
          </div>
          <div className="form-grid">
            <Field label="Item">
              <select className="select" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
                <option value="">Pilih item…</option>
                {selectedOrder?.items.map((item) => (
                  <option value={item._id} key={item._id}>
                    {item.quantity} × {item.bookTitleSnapshot} · {item.formatSnapshot}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Jumlah terdampak" hint={selectedItem ? `Maksimum: ${selectedItem.quantity}` : undefined}>
              <input
                className="input"
                type="number"
                min="1"
                max={selectedItem?.quantity}
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </Field>
          </div>
          <Field label="Alasan">
            <textarea
              className="textarea"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              required
            />
          </Field>
          <div className="form-grid">
            <Field label="Catatan untuk customer (opsional)">
              <textarea
                className="textarea"
                value={customerNote}
                onChange={(event) => setCustomerNote(event.target.value)}
              />
            </Field>
            <Field label="Catatan internal (opsional)">
              <textarea
                className="textarea"
                value={internalNote}
                onChange={(event) => setInternalNote(event.target.value)}
              />
            </Field>
          </div>
          <div className="form-actions">
            <Button type="submit" pending={isSubmitting} pendingLabel="Membuka…">
              Buka masalah
            </Button>
            {message ? (
              <span className="subtle" role="status">
                {message}
              </span>
            ) : null}
          </div>
        </form>
      </Card>
    </details>
  );
}

function ExceptionCard({ exception }: { exception: AdminException }) {
  const startReview = useMutation(api.orderExceptions.startReview);
  const selectResolution = useMutation(api.orderExceptions.selectResolution);
  const resolve = useMutation(api.orderExceptions.resolve);
  const reject = useMutation(api.orderExceptions.reject);
  const [resolution, setResolution] = useState<Resolution>("remove_item");
  const [recoverableRefundAmount, setRecoverableRefundAmount] = useState("");
  const [replacementReference, setReplacementReference] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    setPendingAction(success);
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Operasi masalah gagal.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">
            {typeLabels[exception.type]} · {exception.exceptionId}
          </span>
          <h2>{exception.item?.bookTitle || "Item pesanan"}</h2>
          <p className="subtle">
            {exception.order?.customerName || "Customer tidak dikenal"} · {exception.orderId}
          </p>
        </div>
        <StatusBadge tone={tone(exception.status)}>{statusLabels[exception.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>Jumlah terdampak</span>
        <strong>{exception.affectedQuantity}</strong>
      </div>
      <div className="summary-line">
        <span>Alasan</span>
        <span>{exception.reason}</span>
      </div>
      {exception.reasonCode ? (
        <div className="summary-line">
          <span>Kode kelayakan</span>
          <span>{exception.reasonCode}</span>
        </div>
      ) : null}
      {exception.batchContext.length ? (
        <div className="summary-line">
          <span>Batch</span>
          <span>
            {exception.batchContext
              .map((batch) => `${batch.batchName} · ${batch.shipmentStage || "unlocked"}`)
              .join(", ")}
          </span>
        </div>
      ) : null}
      {exception.invoice ? (
        <div className="summary-line">
          <span>Dampak invoice</span>
          <span>
            {exception.invoice.invoiceNumber} · {exception.invoice.adjustedTotalAmount.toLocaleString("id-ID")} IDR
            current
          </span>
        </div>
      ) : null}
      {exception.financialImpact ? (
        <div className="summary-line">
          <span>Konsekuensi finansial</span>
          <span>
            <Money
              amount={
                exception.financialImpact.invoiceAdjustmentAmount < 0
                  ? -exception.financialImpact.invoiceAdjustmentAmount
                  : exception.financialImpact.invoiceAdjustmentAmount
              }
            />{" "}
            adjustment · {exception.financialImpact.refundObligationStatus}
          </span>
        </div>
      ) : null}
      {exception.customerNote ? <p className="subtle">Catatan customer: {exception.customerNote}</p> : null}
      {exception.internalNote ? <p className="subtle">Catatan internal: {exception.internalNote}</p> : null}
      {exception.status === "opened" ? (
        <div className="form-actions">
          <Button
            type="button"
            pending={pendingAction === "Tinjauan dimulai."}
            pendingLabel="Memulai…"
            onClick={() => void run(() => startReview({ exceptionId: exception.exceptionId }), "Tinjauan dimulai.")}
          >
            Mulai tinjauan
          </Button>
        </div>
      ) : null}
      {exception.status === "under_review" ? (
        <div className="content-stack">
          <div className="form-actions">
            <select
              className="select"
              value={resolution}
              onChange={(event) => setResolution(event.target.value as Resolution)}
            >
              {Object.entries(resolutionLabels).map(([value, label]) => (
                <option value={value} key={value}>
                  {label}
                </option>
              ))}
            </select>
            {exception.type === "customer_cancellation" ? (
              <input
                className="input"
                type="number"
                min="0"
                step="1"
                value={recoverableRefundAmount}
                onChange={(event) => setRecoverableRefundAmount(event.target.value)}
                placeholder="Nilai dapat dikembalikan (IDR)"
                aria-label="Nilai dapat dikembalikan"
              />
            ) : null}
            {exception.type === "defect" && resolution === "replacement" ? (
              <input
                className="input"
                value={replacementReference}
                onChange={(event) => setReplacementReference(event.target.value)}
                placeholder="Referensi penggantian"
                aria-label="Referensi penggantian"
              />
            ) : null}
          </div>
          <Button
            type="button"
            pending={pendingAction === "Resolusi dipilih."}
            pendingLabel="Menyimpan…"
            onClick={() =>
              void run(
                () =>
                  selectResolution({
                    exceptionId: exception.exceptionId,
                    resolution,
                    recoverableRefundAmount:
                      exception.type === "customer_cancellation" && recoverableRefundAmount !== ""
                        ? Number(recoverableRefundAmount)
                        : undefined,
                    replacementReference:
                      exception.type === "defect" && resolution === "replacement" ? replacementReference : undefined,
                  }),
                "Resolusi dipilih.",
              )
            }
          >
            Pilih resolusi
          </Button>
        </div>
      ) : null}
      {exception.status === "resolution_selected" ? (
        <div className="form-actions">
          <span className="subtle">
            Dipilih: {exception.resolution ? resolutionLabels[exception.resolution] : "Tidak diketahui"}
          </span>
          <Button
            type="button"
            pending={pendingAction === "Masalah diselesaikan."}
            pendingLabel="Menyelesaikan…"
            onClick={() => {
              if (!window.confirm("Selesaikan masalah ini dan terapkan konsekuensi finansialnya?")) return;
              void run(() => resolve({ exceptionId: exception.exceptionId }), "Masalah diselesaikan.");
            }}
          >
            Selesaikan
          </Button>
        </div>
      ) : null}
      {exception.status === "opened" || exception.status === "under_review" ? (
        <div className="form-actions">
          <input
            className="input"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Alasan penolakan"
            aria-label="Alasan penolakan"
          />
          <Button
            type="button"
            variant="danger"
            pending={pendingAction === "Masalah ditolak."}
            pendingLabel="Menolak…"
            onClick={() =>
              window.confirm("Tolak masalah ini?")
                ? void run(() => reject({ exceptionId: exception.exceptionId, rejectionReason }), "Masalah ditolak.")
                : undefined
            }
          >
            Tolak
          </Button>
        </div>
      ) : null}
      <div className="form-actions">
        <LinkButton href={`/admin/orders/${exception.orderId}`} variant="secondary">
          Buka pesanan
        </LinkButton>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </div>
      <ul className="timeline">
        {exception.history.map((event) => (
          <li key={`${event.eventType}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{event.eventType}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("id-ID")}</time>
              {event.note ? <span className="subtle">{event.note}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AdminExceptions() {
  const { dataSource } = useProduct();
  const orders = useQuery(
    api.orders.listForAdmin,
    dataSource === "convex" ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const exceptions = useQuery(api.orderExceptions.listForAdmin, dataSource === "convex" ? {} : "skip");
  if (dataSource !== "convex") return <div className="state-panel">Antrian masalah belum tersedia.</div>;
  if (!orders || !exceptions) {
    return (
      <LoadingRegion label="Memuat operasi masalah">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  return (
    <div className="page admin-page admin-operational-page">
      <PageHeader
        eyebrow="Operasi masalah pesanan"
        title="Selesaikan masalah tanpa menghapus riwayat."
        description="OOS, defect, pembatalan, pelepasan deposit, dan kewajiban refund tetap tercatat per item."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content admin-operational-content">
          {exceptions.length ? (
            <div className="content-stack">
              {exceptions.map((exception) => (
                <ExceptionCard key={exception.exceptionId} exception={exception} />
              ))}
            </div>
          ) : (
            <EmptyState
              title="Tidak ada masalah aktif"
              description="Antrian OOS, defect, dan pembatalan sedang kosong."
            />
          )}
          <OpenExceptionForm orders={orders.page} />
        </div>
      </div>
    </div>
  );
}
