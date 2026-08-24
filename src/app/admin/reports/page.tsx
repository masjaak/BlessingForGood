"use client";

import { useMutation, useQuery } from "convex/react";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, EmptyState, Field, LoadingRegion, Money, SkeletonTable, StatusBadge } from "@/components/ui";
import { toExcelCsv } from "@/lib/excel-export";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { orderReference } from "@/domain/prototype/order-reference";
import { invoiceStatusLabel, shipmentStageLabels } from "@/domain/prototype/operations";
import { invoiceReference } from "@/domain/prototype/invoice-reference";

function dayValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function Reports() {
  const today = useMemo(() => new Date(), []);
  const [from, setFrom] = useState(dayValue(new Date(today.getFullYear(), today.getMonth(), 1)));
  const [to, setTo] = useState(dayValue(today));
  const [search, setSearch] = useState("");
  const report = useQuery(api.reports.get, {
    from: new Date(`${from}T00:00:00`).getTime(),
    to: new Date(`${to}T23:59:59.999`).getTime(),
  });
  const recordExport = useMutation(api.reports.recordExport);
  const orders =
    report?.orders.filter((row) =>
      `${row.customerName} ${orderReference({ id: row.orderId, orderCode: row.orderCode || undefined })}`
        .toLowerCase()
        .includes(search.toLowerCase()),
    ) || [];

  async function download() {
    if (!report) return;
    const csv = toExcelCsv([
      ["Referensi pesanan", "Pelanggan", "Status", "Total IDR", "Dibuat pada"],
      ...orders.map((row) => [
        orderReference({ id: row.orderId, orderCode: row.orderCode || undefined }),
        row.customerName,
        orderStatusLabels[row.status],
        row.totalAmount,
        new Date(row.createdAt).toISOString(),
      ]),
      [],
      ["Nomor invoice", "Status", "Total IDR", "Sisa IDR", "Dibuat pada"],
      ...report.invoices.map((row) => [
        invoiceReference(row.invoiceNumber),
        invoiceStatusLabel(row.status),
        row.totalAmount,
        row.outstandingAmount,
        new Date(row.createdAt).toISOString(),
      ]),
      [],
      ["Batch", "Tahap", "Batas PO", "Dibuat pada"],
      ...report.batches.map((row) => [
        row.name,
        row.stage ? shipmentStageLabels[row.stage] : "dapat diedit",
        row.deadlineAt ? new Date(row.deadlineAt).toISOString() : "",
        new Date(row.createdAt).toISOString(),
      ]),
    ]);
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    await recordExport({
      from: new Date(`${from}T00:00:00`).getTime(),
      to: new Date(`${to}T23:59:59.999`).getTime(),
      rowCount: orders.length + report.invoices.length + report.batches.length,
    });
    const link = document.createElement("a");
    link.href = url;
    link.download = `bfg-report-${from}-${to}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <AdminOperationalPage
      eyebrow="Laporan & analitik"
      title="Rekap operasional BFG"
      description="Ringkasan penjualan, kinerja batch, pencarian pesanan, dan ekspor memakai data kanonik pada periode terpilih."
      actions={
        <Button onClick={() => void download()} disabled={!report}>
          Ekspor CSV yang kompatibel dengan Excel
        </Button>
      }
    >
      <Card className="admin-book-filters">
        <Field label="Dari">
          <input
            className="input"
            type="date"
            value={from}
            max={to}
            onChange={(event) => setFrom(event.target.value)}
          />
        </Field>
        <Field label="Sampai">
          <input className="input" type="date" value={to} min={from} onChange={(event) => setTo(event.target.value)} />
        </Field>
        <Field label="Cari pesanan">
          <input
            className="input"
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Pelanggan atau ID pesanan"
          />
        </Field>
      </Card>
      {report === undefined ? (
        <LoadingRegion label="Memuat laporan">
          <SkeletonTable />
        </LoadingRegion>
      ) : (
        <>
          <section className="account-metrics" aria-label="Ringkasan penjualan">
            <Card className="metric">
              <span className="card-kicker">Invoice terbit</span>
              <strong className="metric-value">{report.sales.invoiceCount}</strong>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Nilai invoice terbit</span>
              <strong className="metric-value metric-money">
                <Money amount={report.sales.issuedAmount} />
              </strong>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Pesanan periode</span>
              <strong className="metric-value">{report.orders.length}</strong>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Batch dibuat</span>
              <strong className="metric-value">{report.batches.length}</strong>
            </Card>
          </section>
          {orders.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">Rekap pesanan</caption>
                <thead>
                  <tr>
                    <th>Pesanan</th>
                    <th>Pelanggan</th>
                    <th>Status</th>
                    <th>Total</th>
                    <th>Tanggal</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((row) => (
                    <tr key={row.orderId}>
                      <td>{orderReference({ id: row.orderId, orderCode: row.orderCode || undefined })}</td>
                      <td>{row.customerName}</td>
                      <td>
                        <StatusBadge>{row.status}</StatusBadge>
                      </td>
                      <td>
                        <Money amount={row.totalAmount} />
                      </td>
                      <td>{new Date(row.createdAt).toLocaleDateString("id-ID")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Tidak ada pesanan pada periode ini"
              description="Ubah periode atau pencarian. Ekspor tetap memakai hasil filter kanonik."
            />
          )}
          <Card>
            <span className="card-kicker">Kinerja batch</span>
            <h2>Status batch pada periode</h2>
            {report.batches.length ? (
              report.batches.map((batch) => (
                <div className="summary-line" key={batch.batchId}>
                  <span>{batch.name}</span>
                  <StatusBadge>{batch.stage || "dapat diedit"}</StatusBadge>
                </div>
              ))
            ) : (
              <p className="subtle">Belum ada batch pada periode ini.</p>
            )}
          </Card>
        </>
      )}
    </AdminOperationalPage>
  );
}

export default function AdminReportsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <Reports />
      </ProductAccessGuard>
    </SiteShell>
  );
}
