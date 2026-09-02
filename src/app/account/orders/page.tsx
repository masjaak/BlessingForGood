"use client";

import { useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
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
import {
  calendarDateKey,
  calendarDateToEndTimestamp,
  calendarDateToStartTimestamp,
  formatBfgCalendarDate,
} from "@/lib/calendar-date";

function defaultRange() {
  const start = new Date();
  start.setFullYear(start.getFullYear() - 1);
  return { start: calendarDateKey(start), end: calendarDateKey(Date.now()) };
}

function CustomerBooks() {
  const initialRange = defaultRange();
  const [startDate, setStartDate] = useState(initialRange.start);
  const [endDate, setEndDate] = useState(initialRange.end);
  const validRange = Boolean(startDate && endDate && startDate <= endDate);
  const overview = useQuery(
    api.batchTracking.getBookOverview,
    validRange
      ? { startAt: calendarDateToStartTimestamp(startDate), endAt: calendarDateToEndTimestamp(endDate) }
      : "skip",
  );

  return (
    <div className="page my-books-page">
      <PageHeader
        eyebrow="Buku Saya"
        title="Buku yang sudah kamu fix"
        description="Lihat total tagihan, sisa pembayaran, deposit, dan perjalanan setiap Batch dalam satu tempat."
        actions={
          <LinkButton href="/catalog" variant="secondary">
            Kembali ke katalog
          </LinkButton>
        }
      />
      <Card className="my-books-date-range-card">
        <div className="my-books-date-range-heading">
          <span className="card-kicker">Rentang waktu</span>
          {validRange ? (
            <span className="subtle my-books-date-range-display">
              {formatBfgCalendarDate(calendarDateToStartTimestamp(startDate))} –{" "}
              {formatBfgCalendarDate(calendarDateToEndTimestamp(endDate))}
            </span>
          ) : null}
        </div>
        <div className="form-grid my-books-date-range-fields">
          <Field label="Dari">
            <input
              className="input"
              type="date"
              value={startDate}
              onChange={(event) => setStartDate(event.target.value)}
            />
          </Field>
          <Field label="Sampai">
            <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
        {!validRange ? (
          <p className="error-text" role="alert">
            Pilih rentang tanggal yang valid.
          </p>
        ) : null}
      </Card>
      {overview === undefined ? (
        <LoadingRegion label="Memuat Buku Saya">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : overview ? (
        <>
          <div className="account-metrics my-books-summary-grid">
            <Card frame="summary" className="my-books-summary-card">
              <span className="card-kicker my-books-summary-label">TOTAL SPENDING</span>
              <strong className="metric-money my-books-summary-value">
                <Money amount={overview.totalSpending} />
              </strong>
              <span className="subtle my-books-summary-help">Total tagihan buku yang sudah di-fix</span>
            </Card>
            <Card frame="summary" className="my-books-summary-card">
              <span className="card-kicker my-books-summary-label">PENDING PAYMENT</span>
              <strong className="metric-money my-books-summary-value">
                <Money amount={overview.pendingPayment} />
              </strong>
              <span className="subtle my-books-summary-help">Sisa tagihan keseluruhan dari invoice terbit</span>
            </Card>
            <Card frame="summary" className="my-books-summary-card">
              <span className="card-kicker my-books-summary-label">DEPOSIT</span>
              <strong className="metric-money my-books-summary-value">
                <Money amount={overview.totalDeposit} />
              </strong>
              <span className="subtle my-books-summary-help">Top up credit</span>
            </Card>
          </div>
          <div className="content-stack my-books-batch-list">
            <div className="split-heading my-books-batch-list-heading">
              <div>
                <span className="card-kicker">Batch buku</span>
                <h2>Semua buku yang sudah fix, dikelompokkan per Batch</h2>
              </div>
              <span className="subtle my-books-batch-range">
                {formatBfgCalendarDate(calendarDateToStartTimestamp(startDate))} –{" "}
                {formatBfgCalendarDate(calendarDateToEndTimestamp(endDate))}
              </span>
            </div>
            {overview.batches.length ? (
              overview.batches.map((batch) => (
                <Card className="my-books-batch-card" key={batch.batchId || "unassigned"}>
                  <div className="split-heading my-books-batch-heading">
                    <div>
                      <span className="card-kicker">
                        {batch.referenceCode || (batch.batchId ? "Batch PO" : "Pengecualian")}
                      </span>
                      <h2>{batch.name}</h2>
                    </div>
                    <StatusBadge tone={batch.currentShipmentStage ? "positive" : "neutral"}>
                      {batch.currentShipmentStage
                        ? shipmentStageLabels[batch.currentShipmentStage]
                        : batch.batchId
                          ? "PO terbuka"
                          : "Belum masuk Batch"}
                    </StatusBadge>
                  </div>
                  <div className="summary-line my-books-batch-summary">
                    <span>
                      {batch.bookCount} buku · {batch.orderCount} pesanan
                    </span>
                    <strong>
                      <Money amount={batch.totalAmount} />
                    </strong>
                  </div>
                  {!batch.batchId && batch.items.length ? (
                    <div className="content-stack my-books-unassigned-items">
                      {batch.items.map((item) => (
                        <div className="summary-line my-books-unassigned-row" key={item.assignmentId}>
                          <span>
                            <strong>{item.title}</strong>
                            <br />
                            <span className="subtle">
                              {item.publisher} · {item.format} · {item.quantity} buku
                            </span>
                          </span>
                          <Money amount={item.subtotalAmount} />
                        </div>
                      ))}
                    </div>
                  ) : null}
                  <div className="my-books-batch-footer">
                    <div className="my-books-batch-meta">
                      {batch.poDeadlineAt ? (
                        <p className="subtle">
                          <span className="my-books-batch-meta-label">Batas PO</span>
                          <span>{formatBfgCalendarDate(batch.poDeadlineAt)}</span>
                        </p>
                      ) : null}
                      <p className="subtle">
                        <span className="my-books-batch-meta-label">Perkiraan tiba</span>
                        <span>{formatCargoEta(batch.etaCargoMonth)}</span>
                      </p>
                      {!batch.batchId ? (
                        <p className="subtle">Admin akan memasukkan buku ini ke Batch yang sesuai.</p>
                      ) : null}
                    </div>
                    {batch.batchId ? (
                      <LinkButton
                        href={`/account/batches/${batch.batchId}`}
                        variant="secondary"
                        className="my-books-batch-cta"
                      >
                        Buka detail Batch
                      </LinkButton>
                    ) : null}
                  </div>
                </Card>
              ))
            ) : (
              <EmptyState
                title="Belum ada buku yang fix"
                description="Buku yang sudah dicatat dalam pesanan akan tampil di sini."
                action={<LinkButton href="/catalog">Lihat katalog</LinkButton>}
              />
            )}
          </div>
        </>
      ) : null}
    </div>
  );
}

function SignedOutBooks() {
  return (
    <div className="page narrow-page account-gate-page">
      <EmptyState
        eyebrow="Buku Saya"
        title="Belum ada buku yang bisa ditampilkan."
        description="Masuk lewat Akun untuk melihat buku, Batch, dan nilai pesananmu."
        mascotVariant="default"
        action={<LinkButton href="/account">Ke Akun</LinkButton>}
      />
    </div>
  );
}

export default function CustomerOrdersPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutBooks />}>
        <CustomerBooks />
      </ProductAccessGuard>
    </SiteShell>
  );
}
