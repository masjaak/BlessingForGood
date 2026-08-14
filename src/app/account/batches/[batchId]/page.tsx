"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonCard, StatusBadge } from "@/components/ui";
import { shipmentStageLabels } from "@/domain/prototype/operations";

function BatchDetail({ batchId }: { batchId: Id<"batches"> }) {
  const batch = useQuery(api.batchTracking.getBatchMine, { batchId });
  if (batch === undefined)
    return (
      <LoadingRegion label="Memuat detail batch">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  if (!batch)
    return (
      <div className="page">
        <EmptyState
          title="Batch tidak tersedia"
          description="Batch ini tidak terkait dengan pesanan akunmu."
          action={<LinkButton href="/account/batches">Kembali ke daftar batch</LinkButton>}
        />
      </div>
    );
  return (
    <div className="page">
      <PageHeader
        eyebrow={batch.referenceCode || "Batch PO"}
        title={batch.name}
        description={batch.description || "Perjalanan konsolidasi buku BFG."}
        actions={
          <StatusBadge tone={batch.currentShipmentStage ? "positive" : "neutral"}>
            {batch.currentShipmentStage ? shipmentStageLabels[batch.currentShipmentStage] : "PO terbuka"}
          </StatusBadge>
        }
      />
      <Card>
        <span className="card-kicker">Buku milikmu</span>
        <h2>Roster customer</h2>
        {batch.items.map((item) => (
          <div className="summary-line" key={item.assignmentId}>
            <span>
              {item.title} · {item.format}
            </span>
            <strong>{item.quantity}</strong>
          </div>
        ))}
      </Card>
      <Card>
        <span className="card-kicker">Tracking</span>
        <h2>Timeline batch</h2>
        {batch.history.length ? (
          <ul className="timeline">
            {batch.history.map((event) => (
              <li key={`${event.toStage}-${event.at}`}>
                <span className="timeline-dot" aria-hidden="true" />
                <div>
                  <strong>{shipmentStageLabels[event.toStage]}</strong>
                  <time dateTime={event.at}>{new Date(event.at).toLocaleString("id-ID")}</time>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="subtle">Batch masih terbuka dan roster masih dapat disusun.</p>
        )}
      </Card>
    </div>
  );
}

export default function CustomerBatchDetailPage() {
  const { batchId } = useParams<{ batchId: string }>();
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer">
        <BatchDetail batchId={batchId as Id<"batches">} />
      </ProductAccessGuard>
    </SiteShell>
  );
}
