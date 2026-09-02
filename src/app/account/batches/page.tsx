"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonCard, StatusBadge } from "@/components/ui";
import { formatCargoEta, shipmentStageLabels } from "@/domain/prototype/operations";
import { formatBfgCalendarDate } from "@/lib/calendar-date";

function CustomerBatches() {
  const batches = useQuery(api.batchTracking.listMine, {});
  return (
    <div className="page customer-batch-list-page">
      <PageHeader
        eyebrow="Batch PO"
        title="Perjalanan batch bukumu"
        description="Satu status batch diperbarui untuk semua pelanggan yang memiliki buku di roster tersebut."
      />
      {batches === undefined ? (
        <LoadingRegion label="Memuat batch">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : batches.length ? (
        <div className="content-stack customer-batch-list">
          {batches.map((batch) => (
            <Card className="customer-batch-list-card" key={batch.batchId}>
              <div className="split-heading customer-batch-list-heading">
                <div>
                  <span className="card-kicker">{batch.referenceCode || "Batch BFG"}</span>
                  <h2>{batch.name}</h2>
                </div>
                <StatusBadge tone={batch.currentShipmentStage ? "positive" : "neutral"}>
                  {batch.currentShipmentStage ? shipmentStageLabels[batch.currentShipmentStage] : "PO terbuka"}
                </StatusBadge>
              </div>
              <div className="customer-batch-list-meta">
                <p>
                  {batch.items.length
                    ? `${batch.items.reduce((total, item) => total + item.quantity, 0)} buku di pesananmu.`
                    : `${batch.availableItems.length} item tersedia melalui akses katalog.`}
                </p>
                {batch.poDeadlineAt ? (
                  <p className="subtle">
                    <span className="customer-batch-meta-label">Deadline PO</span>
                    <span>{formatBfgCalendarDate(batch.poDeadlineAt)}</span>
                  </p>
                ) : null}
                <p className="subtle">
                  <span className="customer-batch-meta-label">Estimasi tiba</span>
                  <span>{formatCargoEta(batch.etaCargoMonth)}</span>
                </p>
              </div>
              <LinkButton
                href={`/account/batches/${batch.batchId}`}
                variant="secondary"
                className="customer-batch-list-cta"
              >
                Lihat detail batch
              </LinkButton>
            </Card>
          ))}
        </div>
      ) : (
        <EmptyState
          title="Belum ada batch"
          description="Batch akan tampil setelah Admin memasukkan buku pesananmu ke roster."
        />
      )}
    </div>
  );
}

export default function CustomerBatchesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer">
        <CustomerBatches />
      </ProductAccessGuard>
    </SiteShell>
  );
}
