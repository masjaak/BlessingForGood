"use client";

import { useParams } from "next/navigation";
import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../../convex/_generated/api";
import type { Id } from "../../../../../convex/_generated/dataModel";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { BookCover } from "@/components/book-cover";
import {
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
import { formatCargoEta, shipmentStageLabels } from "@/domain/prototype/operations";
import { orderStatusLabels } from "@/domain/prototype/logic";

function BatchDetail({ batchId }: { batchId: Id<"batches"> }) {
  const [search, setSearch] = useState("");
  const batch = useQuery(api.batchTracking.getBatchMine, { batchId, search: search.trim() || undefined });
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
        <span className="card-kicker">Estimasi cargo</span>
        <h2>Estimasi tiba</h2>
        <p className="subtle">{formatCargoEta(batch.etaCargoMonth)} · Bukan tanggal kedatangan yang dijamin.</p>
      </Card>
      <Card>
        <span className="card-kicker">Buku milikmu</span>
        <h2>Roster pelanggan</h2>
        <Field label="Cari buku">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Cari berdasarkan judul…"
          />
        </Field>
        {batch.items.length ? (
          batch.items.map((item) => (
            <div className="book-row" key={item.assignmentId}>
              <BookCover
                title={item.title}
                publisher={item.publisher}
                format={item.format}
                src={item.coverUrl || undefined}
              />
              <div className="content-stack">
                <strong>{item.title}</strong>
                <span className="subtle">
                  {item.publisher} · {item.format} · ISBN {item.isbn}
                </span>
                <span>
                  {item.quantity} × <Money amount={item.unitPriceAmount} />
                </span>
              </div>
              <StatusBadge tone={item.batchStatus ? "positive" : "neutral"}>
                {item.batchStatus ? shipmentStageLabels[item.batchStatus] : orderStatusLabels[item.orderStatus]}
              </StatusBadge>
            </div>
          ))
        ) : (
          <p className="subtle">Tidak ada buku yang cocok dengan pencarian ini.</p>
        )}
      </Card>
      {batch.availableItems.length ? (
        <Card>
          <span className="card-kicker">Buku dalam Batch</span>
          <h2>Item yang dapat dipesan</h2>
          {batch.availableItems.map((item) => (
            <div className="summary-line" key={`${item.catalogId}-${item.bookId}`}>
              <span>
                <strong>{item.title}</strong>
                <br />
                <span className="subtle">
                  {item.publisher} · {item.catalogName} · {item.variants.map((variant) => variant.format).join(", ")}
                </span>
              </span>
              <span className="subtle">Tersedia melalui katalog</span>
            </div>
          ))}
        </Card>
      ) : null}
      <Card>
        <span className="card-kicker">Pelacakan</span>
        <h2>Linimasa batch</h2>
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
