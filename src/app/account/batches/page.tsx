"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonCard, StatusBadge } from "@/components/ui";
import { formatCargoEta, shipmentStageLabels } from "@/domain/prototype/operations";

function CustomerBatches() {
  const batches = useQuery(api.batchTracking.listMine, {});
  return (
    <div className="page">
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
        <div className="content-stack">
          {batches.map((batch) => (
            <Card key={batch.batchId}>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">{batch.referenceCode || "Batch BFG"}</span>
                  <h2>{batch.name}</h2>
                </div>
                <StatusBadge tone={batch.currentShipmentStage ? "positive" : "neutral"}>
                  {batch.currentShipmentStage ? shipmentStageLabels[batch.currentShipmentStage] : "PO terbuka"}
                </StatusBadge>
              </div>
              <p>
                {batch.items.length
                  ? `${batch.items.reduce((total, item) => total + item.quantity, 0)} buku di pesananmu.`
                  : `${batch.availableItems.length} item tersedia melalui akses katalog.`}
              </p>
              {batch.poDeadlineAt ? (
                <p className="subtle">Deadline PO: {new Date(batch.poDeadlineAt).toLocaleString("id-ID")}</p>
              ) : null}
              <p className="subtle">Estimasi tiba: {formatCargoEta(batch.etaCargoMonth)}</p>
              <LinkButton href={`/account/batches/${batch.batchId}`} variant="secondary">
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
