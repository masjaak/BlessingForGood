"use client";

import { useQuery } from "convex/react";
import { useParams } from "next/navigation";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { fulfillmentStageLabels, fulfillmentStages, shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminOrderDetail() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params.orderId);
  const { dataSource, state } = useProduct();
  const adminExceptions = useQuery(
    api.orderExceptions.listForOrderAdmin,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  const {
    batchList,
    currentAdminOrderTracking,
    currentAdminFulfillment,
    adminInvoiceList,
    assignOrderItem,
    updateFulfillmentStage,
  } = useOperations();
  const [message, setMessage] = useState("");
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (dataSource !== "convex") return <div className="state-panel">Data pesanan belum tersedia.</div>;
  if (!order)
    return (
      <EmptyState
        title="Order not found"
        description="The admin session cannot access that order."
        action={<LinkButton href="/admin/orders">Back to orders</LinkButton>}
      />
    );
  if (!currentAdminOrderTracking || !currentAdminFulfillment || !batchList)
    return <div className="state-panel">Loading order operations…</div>;
  const eligibleBatches = batchList.page.filter(
    (batch) =>
      !batch.isArchived && !batch.rosterLocked && batch.catalogLinks.some((link) => link.catalogId === order.catalogId),
  );
  const invoice = adminInvoiceList?.page.find((candidate) => candidate.orderId === orderId);
  const currentIndex = currentAdminFulfillment.currentStage
    ? fulfillmentStages.indexOf(currentAdminFulfillment.currentStage)
    : -1;
  const nextStage = fulfillmentStages[currentIndex + 1];

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operation failed");
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Order operations"
        title={order.customerName}
        description={order.id}
        actions={
          <LinkButton href="/admin/orders" variant="secondary">
            Back to orders
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
                <span className="card-kicker">Order snapshot</span>
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
              <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="secondary">
                Open {invoice.invoiceNumber}
              </LinkButton>
            ) : (
              <p className="subtle">No invoice exists for this order.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Exceptions</span>
                <h2>Operational history</h2>
              </div>
              <LinkButton href="/admin/exceptions" variant="secondary">
                Open queue
              </LinkButton>
            </div>
            {adminExceptions?.length ? (
              adminExceptions.map((exception) => (
                <div className="summary-line" key={exception.exceptionId}>
                  <span>
                    {exception.type} · {exception.affectedQuantity} affected
                    <br />
                    <span className="subtle">
                      {exception.status} · {exception.resolution || "no resolution selected"}
                    </span>
                  </span>
                  <span>
                    {exception.financialImpact ? (
                      <Money amount={Math.abs(exception.financialImpact.invoiceAdjustmentAmount)} />
                    ) : (
                      "No financial adjustment"
                    )}
                  </span>
                </div>
              ))
            ) : (
              <p className="subtle">No exception recorded for this order.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Batch assignments</span>
                <h2>Assign quantities safely</h2>
              </div>
            </div>
            {currentAdminOrderTracking.items.map((item) => (
              <div className="content-stack" key={item.orderItemId}>
                <div className="summary-line">
                  <strong>
                    {item.bookTitle} · {item.format}
                  </strong>
                  <span>{item.orderedQuantity} ordered</span>
                </div>
                {item.assignments.map((assignment) => (
                  <div className="summary-line" key={assignment.assignmentId}>
                    <span>
                      {assignment.assignedQuantity} × {assignment.batchName}
                    </span>
                    <span className="subtle">
                      {assignment.currentShipmentStage
                        ? shipmentStageLabels[assignment.currentShipmentStage]
                        : "No shipment stage"}
                    </span>
                  </div>
                ))}
                <AssignForm
                  orderItemId={item.orderItemId}
                  batches={eligibleBatches}
                  assignOrderItem={assignOrderItem}
                  onDone={() => setMessage("Assignment saved.")}
                />
              </div>
            ))}
            {!eligibleBatches.length ? (
              <p className="subtle">Link a catalog-compatible batch before assigning an item.</p>
            ) : null}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Fulfillment</span>
                <h2>
                  {currentAdminFulfillment.currentStage
                    ? fulfillmentStageLabels[currentAdminFulfillment.currentStage]
                    : "Not started"}
                </h2>
              </div>
            </div>
            <div className="form-actions">
              <Button
                type="button"
                onClick={() =>
                  nextStage && void run(() => updateFulfillmentStage(orderId, nextStage), "Fulfillment stage updated.")
                }
                disabled={!nextStage}
              >
                Advance to {nextStage ? fulfillmentStageLabels[nextStage] : "complete"}
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
              <p className="subtle">No fulfillment stage has been recorded.</p>
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
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await assignOrderItem(orderItemId, batchId, Number(quantity));
      onDone();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Assignment failed");
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <select
        aria-label="Assignment batch"
        className="select"
        value={batchId}
        onChange={(event) => setBatchId(event.target.value)}
        required
      >
        <option value="">Choose linked batch…</option>
        {batches.map((batch) => (
          <option value={batch.batchId} key={batch.batchId}>
            {batch.name}
          </option>
        ))}
      </select>
      <input
        aria-label="Assignment quantity"
        className="input"
        type="number"
        min="1"
        step="1"
        value={quantity}
        onChange={(event) => setQuantity(event.target.value)}
        required
      />
      <Button type="submit">Assign</Button>
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
