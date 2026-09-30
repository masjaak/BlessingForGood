"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Card, LinkButton, LoadingRegion, Money, SkeletonCard, StatusBadge } from "@/components/ui";

const timeline = [
  { key: "waiting_payment", label: "Blessy menunggu pembayaran" },
  { key: "verifying_payment", label: "Blessy memverifikasi pembayaran" },
  { key: "payment_success", label: "Pembayaran berhasil" },
  { key: "packing", label: "Paket sedang dikemas Blessy" },
  { key: "shipping", label: "Paket sedang diantar Blessy" },
  { key: "delivered", label: "Paket sampai" },
] as const;

function stageIndex(status: string) {
  return timeline.findIndex((step) => step.key === status);
}

export function CustomerReadyStockSection() {
  const purchases = useQuery(api.readyStockManual.listMine, {});

  if (purchases === undefined) {
    return (
      <LoadingRegion label="Memuat Ready Stock kamu">
        <SkeletonCard />
      </LoadingRegion>
    );
  }

  if (!purchases.length) return null;

  return (
    <section className="content-stack customer-ready-stock-section">
      <div className="split-heading">
        <div>
          <span className="card-kicker">Ready Stock</span>
          <h2>Pesanan Ready Stock kamu</h2>
        </div>
        <StatusBadge>{purchases.length}</StatusBadge>
      </div>
      <p className="subtle">
        Pantau checkout, pembayaran, pengemasan, pengiriman, sampai paket tiba.
      </p>

      {purchases.map((purchase) => {
        const currentIndex = stageIndex(purchase.operationalStatus);
        return (
          <Card className="content-stack customer-ready-stock-card" key={purchase.purchaseId}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">{purchase.format}</span>
                <h3>{purchase.title}</h3>
                <span className="subtle">{purchase.quantity} buku</span>
              </div>
              <div className="customer-ready-stock-price">
                <Money amount={purchase.subtotalAmount} />
              </div>
            </div>

            {purchase.operationalStatus === "cancelled" ? (
              <StatusBadge tone="neutral">Pesanan dibatalkan</StatusBadge>
            ) : (
              <ol className="ready-stock-timeline" aria-label={`Timeline ${purchase.title}`}>
                {timeline.map((step, index) => {
                  const done = currentIndex >= 0 && index < currentIndex;
                  const current = index === currentIndex;
                  return (
                    <li
                      className={`ready-stock-timeline-step${done ? " is-done" : ""}${current ? " is-current" : ""}`}
                      key={step.key}
                    >
                      <span className="ready-stock-timeline-dot" aria-hidden="true" />
                      <span>
                        <strong>{step.label}</strong>
                        {current ? <small>Status saat ini</small> : done ? <small>Selesai</small> : null}
                      </span>
                    </li>
                  );
                })}
              </ol>
            )}

            {purchase.invoiceId ? (
              <div className="form-actions">
                <LinkButton href={`/account/invoices/${purchase.invoiceId}`} variant="secondary">
                  Buka tagihan
                </LinkButton>
              </div>
            ) : null}
          </Card>
        );
      })}
    </section>
  );
}
