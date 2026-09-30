"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, LinkButton, LoadingRegion, Money, SkeletonCard, StatusBadge } from "@/components/ui";

type StepState = "complete" | "current" | "upcoming";

export function CustomerReadyStockOrdersSection() {
  const result = useQuery(api.readyStockOrders.listMine, {
    paginationOpts: { numItems: 50, cursor: null },
  });

  if (result === undefined) {
    return (
      <LoadingRegion label="Memuat Ready Stock">
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!result.page.length) return null;

  return (
    <section className="content-stack customer-ready-stock-orders" aria-labelledby="customer-ready-stock-heading">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Ready Stock</span>
          <h2 id="customer-ready-stock-heading">Pesanan Ready Stock kamu</h2>
          <p className="subtle">Pantau pembayaran, proses packing, pengiriman, sampai paket tiba.</p>
        </div>
        <StatusBadge>{result.page.length}</StatusBadge>
      </div>

      {result.page.map((order) => (
        <Card className="customer-ready-stock-order-card" key={order.orderId}>
          <div className="split-heading">
            <div>
              <span className="card-kicker">{order.invoiceNumber || "Ready Stock"}</span>
              <h3>{order.title}</h3>
              <p className="subtle">
                {order.format} · {order.quantity} buku
              </p>
            </div>
            <div className="customer-ready-stock-order-total">
              <Money amount={order.totalAmount} />
              {order.invoiceId ? (
                <LinkButton href={`/account/invoices/${order.invoiceId}`} variant="secondary" size="compact">
                  Lihat tagihan
                </LinkButton>
              ) : null}
            </div>
          </div>

          {order.operationalStatus === "cancelled" ? (
            <StatusBadge>Dibatalkan</StatusBadge>
          ) : (
            <ol className="ready-stock-timeline" aria-label={`Timeline ${order.title}`}>
              {order.timeline.map((step) => (
                <li
                  className={`ready-stock-timeline-step is-${step.state as StepState}`}
                  key={step.key}
                  aria-current={step.state === "current" ? "step" : undefined}
                >
                  <span className="ready-stock-timeline-marker" aria-hidden="true" />
                  <div>
                    <strong>{step.label}</strong>
                    <span className="subtle">
                      {step.state === "complete" ? "Selesai" : step.state === "current" ? "Sekarang" : "Berikutnya"}
                    </span>
                  </div>
                </li>
              ))}
            </ol>
          )}

          <div className="customer-ready-stock-shipping">
            <span className="subtle">Dikirim ke</span>
            <strong>{order.shippingAddress.recipientName}</strong>
            <span className="subtle">
              {order.shippingAddress.addressLine1}
              {order.shippingAddress.addressLine2 ? `, ${order.shippingAddress.addressLine2}` : ""},{" "}
              {order.shippingAddress.city}, {order.shippingAddress.province} {order.shippingAddress.postalCode}
            </span>
          </div>
        </Card>
      ))}
    </section>
  );
}
