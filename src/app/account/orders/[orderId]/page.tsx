"use client";

import { useParams } from "next/navigation";
import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { fulfillmentStageLabels, shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr, orderStatusLabels } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function Timeline({
  history,
  labels,
}: {
  history: Array<{ toStage: string; at: string }>;
  labels: Record<string, string>;
}) {
  if (!history.length) return <p className="subtle">No stage has been recorded yet.</p>;
  return (
    <ul className="timeline">
      {history.map((event) => (
        <li key={`${event.toStage}-${event.at}`}>
          <span className="timeline-dot" aria-hidden="true" />
          <div>
            <strong>{labels[event.toStage] || event.toStage}</strong>
            <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
          </div>
        </li>
      ))}
    </ul>
  );
}

function CustomerOrderDetail() {
  const params = useParams<{ orderId: string }>();
  const orderId = String(params.orderId);
  const { dataSource, state } = usePrototype();
  const { currentCustomerTracking, currentCustomerFulfillment, customerInvoiceList } = useOperations();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (dataSource !== "convex") {
    return <div className="state-panel">Persistent tracking is available in Convex Preview.</div>;
  }
  if (!order) {
    return (
      <EmptyState
        title="Order not found"
        description="This customer session cannot access that order, or it has not been created in Preview."
        action={<LinkButton href="/account/orders">Back to orders</LinkButton>}
      />
    );
  }
  if (!currentCustomerTracking || !currentCustomerFulfillment)
    return <div className="state-panel">Loading tracking…</div>;
  const invoice = customerInvoiceList?.page.find((candidate) => candidate.orderId === orderId);
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Order tracking"
        title={order.items[0]?.bookTitle || "Order detail"}
        description={`${order.customerName} · ${order.id}`}
        actions={
          <LinkButton href="/account/orders" variant="secondary">
            Back to orders
          </LinkButton>
        }
      />
      <div className="content-stack">
        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Order status</span>
              <h2>{formatIdr(order.total)}</h2>
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
            <LinkButton href={`/account/invoices/${invoice.invoiceId}`} variant="secondary">
              View {invoice.invoiceNumber}
            </LinkButton>
          ) : (
            <p className="subtle">No invoice has been issued yet.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Shipment</span>
              <h2>{currentCustomerTracking.batches.length ? "Imported goods movement" : "No batch assigned"}</h2>
            </div>
          </div>
          {currentCustomerTracking.batches.length ? (
            currentCustomerTracking.batches.map((batch) => (
              <div className="content-stack" key={batch.batchId}>
                <div>
                  <strong>{batch.name}</strong>
                  <span className="subtle">{batch.referenceCode || "No reference"}</span>
                </div>
                {batch.assignments.map((assignment, index) => (
                  <div className="summary-line" key={`${batch.batchId}-${index}`}>
                    <span>
                      {assignment.quantity} × {assignment.bookTitle} · {assignment.format}
                    </span>
                    <StatusBadge>{assignment.quantity ? "Assigned" : "Unassigned"}</StatusBadge>
                  </div>
                ))}
                <p className="subtle">
                  Current stage:{" "}
                  {batch.currentShipmentStage ? shipmentStageLabels[batch.currentShipmentStage] : "Not set"}
                </p>
                <Timeline history={batch.history} labels={shipmentStageLabels} />
              </div>
            ))
          ) : (
            <p className="subtle">The admin has not assigned this order item to a batch.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Fulfillment</span>
              <h2>
                {currentCustomerFulfillment.currentStage
                  ? fulfillmentStageLabels[currentCustomerFulfillment.currentStage]
                  : "Not started"}
              </h2>
            </div>
          </div>
          <Timeline history={currentCustomerFulfillment.history} labels={fulfillmentStageLabels} />
        </Card>
      </div>
    </div>
  );
}

export default function CustomerOrderDetailPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="customer">
        <CustomerOrderDetail />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
