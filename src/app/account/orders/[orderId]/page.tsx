"use client";

import { useParams } from "next/navigation";
import { CustomerOrderExceptions } from "@/components/customer-order-exceptions";
import {
  Card,
  EmptyState,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { fulfillmentStageLabels, shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { formatIdr, orderStatusLabels } from "@/domain/prototype/logic";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { BackButton } from "@/components/back-button";
import { orderReference } from "@/domain/prototype/order-reference";

function Timeline({
  history,
  labels,
}: {
  history: Array<{ toStage: string; at: string }>;
  labels: Record<string, string>;
}) {
  if (!history.length) return <p className="subtle">Belum ada tahap yang tercatat.</p>;
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
  const { dataSource, ordersLoading, state } = useProduct();
  const { currentCustomerTracking, currentCustomerFulfillment, customerInvoiceList } = useOperations();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (dataSource !== "convex") {
    return <div className="state-panel">Pelacakan belum tersedia saat ini.</div>;
  }
  if (ordersLoading || currentCustomerTracking === undefined || currentCustomerFulfillment === undefined) {
    return (
      <LoadingRegion label="Memuat pelacakan pesanan">
        <SkeletonCard variant="order" />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!order) {
    return (
      <EmptyState
        title="Pesanan tidak ditemukan"
        description="Pesanan ini tidak tersedia untuk akunmu."
        action={<LinkButton href="/account/orders">Kembali ke pesanan</LinkButton>}
      />
    );
  }
  const invoice = customerInvoiceList?.page.find((candidate) => candidate.orderId === orderId);
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Pelacakan pesanan"
        title={order.items[0]?.bookTitle || "Detail pesanan"}
        description={`${order.customerName} · ${orderReference(order)}`}
        actions={
          <LinkButton href="/account/orders" variant="secondary">
            Kembali ke pesanan
          </LinkButton>
        }
      />
      <div className="content-stack">
        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Status pesanan</span>
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
              Lihat {invoice.invoiceNumber}
            </LinkButton>
          ) : (
            <p className="subtle">Invoice belum diterbitkan.</p>
          )}
        </Card>

        <CustomerOrderExceptions
          orderId={orderId}
          items={order.items.map((item) => ({
            id: item.id,
            title: item.bookTitle,
            format: item.format,
            quantity: item.quantity,
            subtotal: item.subtotal,
          }))}
        />

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Perjalanan batch</span>
              <h2>
                {currentCustomerTracking.batches.length ? "Perjalanan buku dari luar negeri" : "Belum masuk batch"}
              </h2>
            </div>
          </div>
          {currentCustomerTracking.batches.length ? (
            currentCustomerTracking.batches.map((batch) => (
              <div className="content-stack" key={batch.batchId}>
                <div>
                  <strong>{batch.name}</strong>
                  <span className="subtle">{batch.referenceCode || "Tanpa referensi"}</span>
                </div>
                {batch.assignments.map((assignment, index) => (
                  <div className="summary-line" key={`${batch.batchId}-${index}`}>
                    <span>
                      {assignment.quantity} × {assignment.bookTitle} · {assignment.format}
                    </span>
                    <StatusBadge>{assignment.quantity ? "Masuk roster" : "Belum ditetapkan"}</StatusBadge>
                  </div>
                ))}
                <p className="subtle">
                  Tahap saat ini:{" "}
                  {batch.currentShipmentStage ? shipmentStageLabels[batch.currentShipmentStage] : "Belum dimulai"}
                </p>
                <Timeline history={batch.history} labels={shipmentStageLabels} />
              </div>
            ))
          ) : (
            <p className="subtle">Item pesanan ini belum dimasukkan ke batch.</p>
          )}
        </Card>

        <Card>
          <div className="split-heading">
            <div>
              <span className="card-kicker">Pemenuhan pesanan</span>
              <h2>
                {currentCustomerFulfillment.currentStage
                  ? fulfillmentStageLabels[currentCustomerFulfillment.currentStage]
                  : "Belum dimulai"}
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
      <div className="route-with-back">
        <BackButton fallback="/account/orders" />
        <ProductAccessGuard requiredRole="customer">
          <CustomerOrderDetail />
        </ProductAccessGuard>
      </div>
    </SiteShell>
  );
}
