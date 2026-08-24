"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  ActionGroup,
  Button,
  Card,
  EmptyState,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { fulfillmentStageLabels, fulfillmentStages, shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoiceReference } from "@/domain/prototype/invoice-reference";
import { invoiceStatusLabel } from "@/domain/prototype/operations";

function AdminOrderDetail() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params.orderId);
  const { dataSource, ordersLoading, state } = useProduct();
  const adminExceptions = useQuery(
    api.orderExceptions.listForOrderAdmin,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const { batchList, currentAdminOrderTracking, currentAdminFulfillment, assignOrderItem, updateFulfillmentStage } =
    useOperations();
  const adminOrderInvoice = useQuery(
    api.invoices.getForOrderAdmin,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (dataSource !== "convex") return <div className="state-panel">Data pesanan belum tersedia.</div>;
  if (
    ordersLoading ||
    adminExceptions === undefined ||
    currentAdminOrderTracking === undefined ||
    currentAdminFulfillment === undefined ||
    batchList === undefined ||
    adminOrderInvoice === undefined
  ) {
    return (
      <LoadingRegion label="Memuat operasi pesanan">
        <SkeletonCard variant="order" />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!order)
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        description="Sesi Admin tidak dapat mengakses pesanan tersebut."
        action={<LinkButton href="/admin/orders">Kembali ke pesanan</LinkButton>}
      />
    );
  const eligibleBatches = batchList.page.filter(
    (batch) =>
      !batch.isArchived && !batch.rosterLocked && batch.catalogLinks.some((link) => link.catalogId === order.catalogId),
  );
  const invoice = adminOrderInvoice;
  const currentIndex = currentAdminFulfillment.currentStage
    ? fulfillmentStages.indexOf(currentAdminFulfillment.currentStage)
    : -1;
  const nextStage = fulfillmentStages[currentIndex + 1];

  async function run(action: () => Promise<unknown>, success: string, actionId: string) {
    setMessage("");
    setPendingAction(actionId);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operasi gagal.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi pesanan"
        title={order.customerName}
        description={orderReference(order)}
        actions={
          <LinkButton href="/admin/orders" variant="secondary">
            Kembali ke pesanan
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {message ? (
            <p className="success-banner" role="status">
              {message}
            </p>
          ) : null}
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Snapshot pesanan</span>
                <h2>
                  <Money amount={order.total} />
                </h2>
              </div>
              <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
            </div>
            {order.items.map((item) => (
              <div className="summary-line" key={item.id}>
                <span>
                  {item.quantity} × {item.bookTitle} · {item.format}
                </span>
                <Money amount={item.subtotal} />
              </div>
            ))}
            {invoice ? (
              <>
                <div className="summary-line">
                  <span>Status invoice</span>
                  <strong>{invoiceStatusLabel(invoice.status)}</strong>
                </div>
                <div className="summary-line">
                  <span>Sisa tagihan</span>
                  <Money amount={invoice.outstandingAmount} />
                </div>
                <ActionGroup>
                  <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="secondary">
                    Buka {invoiceReference(invoice.invoiceNumber)}
                  </LinkButton>
                </ActionGroup>
              </>
            ) : (
              <div className="action-region">
                <p className="subtle">Belum ada invoice untuk pesanan ini.</p>
                <ActionGroup>
                  <LinkButton href={`/admin/invoices?orderId=${orderId}`} variant="primary">
                    Terbitkan invoice
                  </LinkButton>
                </ActionGroup>
              </div>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Masalah pesanan</span>
                <h2>Riwayat operasional</h2>
              </div>
              <LinkButton href="/admin/exceptions" variant="secondary">
                Buka antrian
              </LinkButton>
            </div>
            {adminExceptions?.length ? (
              adminExceptions.map((exception) => (
                <div className="summary-line" key={exception.exceptionId}>
                  <span>
                    {exception.type} · {exception.affectedQuantity} terdampak
                    <br />
                    <span className="subtle">
                      {exception.status} · {exception.resolution || "belum ada penyelesaian"}
                    </span>
                  </span>
                  <span>
                    {exception.financialImpact ? (
                      <Money amount={Math.abs(exception.financialImpact.invoiceAdjustmentAmount)} />
                    ) : (
                      "Tidak ada penyesuaian keuangan"
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada masalah yang tercatat untuk pesanan ini.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Penugasan batch</span>
                <h2>Bagikan jumlah dengan aman</h2>
              </div>
            </div>
            {currentAdminOrderTracking.items.map((item) => (
              <div className="content-stack" key={item.orderItemId}>
                <div className="summary-line">
                  <strong>
                    {item.bookTitle} · {item.format}
                  </strong>
                  <span>{item.orderedQuantity} dipesan</span>
                </div>
                {item.assignments.map((assignment) => (
                  <div className="summary-line" key={assignment.assignmentId}>
                    <span>
                      {assignment.assignedQuantity} × {assignment.batchName}
                    </span>
                    <span className="subtle">
                      {assignment.currentShipmentStage
                        ? shipmentStageLabels[assignment.currentShipmentStage]
                        : "Belum ada tahap pengiriman"}
                    </span>
                  </div>
                ))}
                <AssignForm
                  orderItemId={item.orderItemId}
                  batches={eligibleBatches}
                  assignOrderItem={assignOrderItem}
                  onDone={() => setMessage("Penugasan tersimpan.")}
                />
              </div>
            ))}
            {!eligibleBatches.length ? (
              <p className="subtle">Hubungkan batch yang kompatibel dengan katalog sebelum menugaskan item.</p>
            ) : null}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Fulfillment</span>
                <h2>
                  {currentAdminFulfillment.currentStage
                    ? fulfillmentStageLabels[currentAdminFulfillment.currentStage]
                    : "Belum dimulai"}
                </h2>
              </div>
            </div>
            <div className="form-actions">
              <Button
                type="button"
                pending={pendingAction === "fulfillment"}
                pendingLabel="Memperbarui…"
                onClick={() =>
                  nextStage &&
                  void run(
                    () => updateFulfillmentStage(orderId, nextStage),
                    "Tahap pemenuhan diperbarui.",
                    "fulfillment",
                  )
                }
                disabled={!nextStage || pendingAction !== null}
              >
                Lanjut ke {nextStage ? fulfillmentStageLabels[nextStage] : "selesai"}
              </Button>
            </div>
            <ul className="timeline">
              {currentAdminFulfillment.history.map((event) => (
                <li key={`${event.toStage}-${event.at}`}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{fulfillmentStageLabels[event.toStage]}</strong>
                    <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
                    {event.note ? <span className="subtle">{event.note}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
            {!currentAdminFulfillment.history.length ? (
              <p className="subtle">Belum ada tahap pemenuhan yang tercatat.</p>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function AssignForm({
  orderItemId,
  batches,
  assignOrderItem,
  onDone,
}: {
  orderItemId: string;
  batches: Array<{ batchId: string; name: string }>;
  assignOrderItem: (orderItemId: string, batchId: string, assignedQuantity: number) => Promise<unknown>;
  onDone: () => void;
}) {
  const [batchId, setBatchId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      await assignOrderItem(orderItemId, batchId, Number(quantity));
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Penugasan gagal.");
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <BFGSelect
        aria-label="Batch penugasan"
        className="select"
        value={batchId}
        onChange={(event) => setBatchId(event.target.value)}
        required
      >
        <option value="">Pilih batch terhubung…</option>
        {batches.map((batch) => (
          <option value={batch.batchId} key={batch.batchId}>
            {batch.name}
          </option>
        ))}
      </BFGSelect>
      <input
        aria-label="Jumlah penugasan"
        className="input"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        required
      />
      <Button type="submit" pending={isSubmitting} pendingLabel="Menugaskan…">
        Tugaskan
      </Button>
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

export default function AdminOrderDetailPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminOrderDetail />
      </ProductAccessGuard>
    </SiteShell>
  );
}
