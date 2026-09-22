"use client";

import { useQuery_experimental as useQueryState } from "convex/react";
import Link from "next/link";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, ErrorState, Field, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { AnalyticsSkeleton } from "./analytics-skeleton";

type PeriodDays = 7 | 30 | 90;
type AnalyticsStatus = "in_cart" | "converted" | "removed" | "unconverted";
type AnalyticsData = {
  periodDays: PeriodDays;
  trackingStartedAt: number | null;
  metrics: {
    addActions: number;
    interestedCustomers: number;
    unconvertedIntents: number;
    convertedIntents: number;
  };
  trends: {
    buckets: Array<{ startAt: number; endAt: number }>;
    addActions: number[];
    interestedCustomers: number[];
    unconvertedIntents: number[];
    convertedIntents: number[];
  };
  books: Array<{
    intentCount: number;
    distinctCustomerCount: number;
    unconvertedCount: number;
    convertedCount: number;
    bookTitle: string;
    format: string;
    conversionRate: number;
  }>;
  bookInterestTotal: number;
  bookInterestTruncated: boolean;
  customers: Array<{
    customerId: string;
    name: string;
    memberCode: string | null;
    itemCount: number;
    quantity: number;
    lastActivityAt: number;
    status: AnalyticsStatus;
    statusCounts: Record<AnalyticsStatus, number>;
    items: Array<{ title: string; quantity: number }>;
  }>;
  customerActivityTruncated: boolean;
};

const periodOptions = [
  { value: "7", label: "7 hari terakhir" },
  { value: "30", label: "30 hari terakhir" },
  { value: "90", label: "90 hari terakhir" },
];

function AnalyticsTrendChart({
  label,
  unit,
  buckets,
  values,
}: {
  label: string;
  unit: "intent" | "Customer";
  buckets: Array<{ startAt: number; endAt: number }>;
  values: number[];
}) {
  const width = 240;
  const height = 52;
  const max = Math.max(0, ...values);
  const points = values
    .map((value, index) => {
      const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
      const y = max ? height - 4 - (value / max) * (height - 8) : height / 2;
      return `${x},${y}`;
    })
    .join(" ");
  const dateFormatter = new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" });

  return (
    <div className={`analytics-trend-chart${max ? "" : " is-empty"}`}>
      <svg role="img" aria-label={label} viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none">
        <polyline points={points} />
        {values.map((value, index) => {
          const x = values.length === 1 ? width / 2 : (index / (values.length - 1)) * width;
          const y = max ? height - 4 - (value / max) * (height - 8) : height / 2;
          return (
            <circle key={`${buckets[index]?.startAt ?? index}-${value}`} cx={x} cy={y} r="2.5">
              <title>{`${dateFormatter.format(buckets[index]?.startAt ?? 0)}\n${value} ${unit}`}</title>
            </circle>
          );
        })}
      </svg>
    </div>
  );
}

function AnalyticsMetricCard({
  label,
  value,
  helper,
  chartLabel,
  chartUnit,
  buckets,
  values,
}: {
  label: string;
  value: number;
  helper: string;
  chartLabel: string;
  chartUnit: "intent" | "Customer";
  buckets: Array<{ startAt: number; endAt: number }>;
  values: number[];
}) {
  return (
    <Card className="metric analytics-metric-card">
      <span className="card-kicker">{label}</span>
      <strong className="metric-value">{value}</strong>
      <p>{helper}</p>
      <AnalyticsTrendChart label={chartLabel} unit={chartUnit} buckets={buckets} values={values} />
    </Card>
  );
}

function statusLabel(status: AnalyticsStatus) {
  if (status === "in_cart") return "Masih di keranjang";
  if (status === "converted") return "Sudah menjadi pesanan";
  if (status === "removed") return "Dikeluarkan dari keranjang";
  return "Belum checkout";
}

function statusTone(status: AnalyticsStatus): "neutral" | "positive" | "warning" {
  if (status === "converted") return "positive";
  if (status === "in_cart") return "warning";
  return "neutral";
}

function AnalyticsContent({ data }: { data: AnalyticsData }) {
  if (!data.metrics.addActions && !data.customers.length) {
    return (
      <EmptyState
        title="Belum ada aktivitas keranjang"
        description="Aktivitas Customer yang menambahkan buku ke keranjang akan muncul di sini."
        mascotVariant={false}
      />
    );
  }

  return (
    <>
      <section className="account-metrics analytics-metric-grid" aria-label="Ringkasan minat Customer">
        <AnalyticsMetricCard
          label="Add ke keranjang"
          value={data.metrics.addActions}
          helper="Intent buku yang tercatat pada periode ini."
          chartLabel={`Tren Add ke keranjang ${data.periodDays} hari terakhir`}
          chartUnit="intent"
          buckets={data.trends.buckets}
          values={data.trends.addActions}
        />
        <AnalyticsMetricCard
          label="Customer berminat"
          value={data.metrics.interestedCustomers}
          helper="Customer unik dari cohort yang sama."
          chartLabel={`Tren Customer berminat ${data.periodDays} hari terakhir`}
          chartUnit="Customer"
          buckets={data.trends.buckets}
          values={data.trends.interestedCustomers}
        />
        <AnalyticsMetricCard
          label="Belum checkout"
          value={data.metrics.unconvertedIntents}
          helper="Intent yang belum menjadi pesanan."
          chartLabel={`Tren Belum checkout ${data.periodDays} hari terakhir`}
          chartUnit="intent"
          buckets={data.trends.buckets}
          values={data.trends.unconvertedIntents}
        />
        <AnalyticsMetricCard
          label="Menjadi pesanan"
          value={data.metrics.convertedIntents}
          helper="Intent dengan Order kanonik."
          chartLabel={`Tren Menjadi pesanan ${data.periodDays} hari terakhir`}
          chartUnit="intent"
          buckets={data.trends.buckets}
          values={data.trends.convertedIntents}
        />
      </section>

      <section className="admin-dashboard-section" aria-labelledby="analytics-books-heading">
        <div className="admin-section-heading">
          <div>
            <span className="card-kicker">Minat &amp; keranjang</span>
            <h2 id="analytics-books-heading">Buku paling diminati</h2>
          </div>
          <p>
            {data.bookInterestTruncated ? "10 buku dengan intent tertinggi" : "Semua intent buku"} · Total{" "}
            {data.bookInterestTotal}
            intent.
          </p>
        </div>
        {data.books.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Buku paling diminati</caption>
              <thead>
                <tr>
                  <th>Buku</th>
                  <th>Format</th>
                  <th>Intent</th>
                  <th>Customer</th>
                  <th>Belum checkout</th>
                  <th>Menjadi pesanan</th>
                  <th>Konversi</th>
                </tr>
              </thead>
              <tbody>
                {data.books.map((book) => (
                  <tr key={`${book.bookTitle}-${book.format}`}>
                    <td>{book.bookTitle}</td>
                    <td>{book.format}</td>
                    <td>{book.intentCount}</td>
                    <td>{book.distinctCustomerCount}</td>
                    <td>{book.unconvertedCount}</td>
                    <td>{book.convertedCount}</td>
                    <td>{Math.round(book.conversionRate * 100)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState
            title="Belum ada buku pada periode ini"
            description="Aktivitas buku yang masuk keranjang akan muncul di sini."
            mascotVariant={false}
          />
        )}
      </section>

      <section className="admin-dashboard-section" aria-labelledby="analytics-customers-heading">
        <div className="admin-section-heading">
          <div>
            <span className="card-kicker">Customer</span>
            <h2 id="analytics-customers-heading">Aktivitas Customer</h2>
          </div>
          <p>Nama dan Member Code saja untuk evaluasi operasional.</p>
        </div>
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Aktivitas Customer dari keranjang</caption>
            <thead>
              <tr>
                <th>Customer</th>
                <th>Member Code</th>
                <th>Item / jumlah item</th>
                <th>Aktivitas terakhir</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {data.customers.map((customer) => (
                <tr key={customer.customerId}>
                  <td>
                    <Link href={`/admin/customers/${customer.customerId}`}>{customer.name}</Link>
                  </td>
                  <td>{customer.memberCode || "—"}</td>
                  <td>
                    {customer.items.map((item) => (
                      <span className="table-secondary" key={`${item.title}-${item.quantity}`}>
                        {item.title} · {item.quantity}
                      </span>
                    ))}
                    {customer.itemCount > customer.items.length ? (
                      <span className="table-secondary">
                        + {customer.itemCount - customer.items.length} buku lainnya
                      </span>
                    ) : null}
                  </td>
                  <td>{new Date(customer.lastActivityAt).toLocaleDateString("id-ID")}</td>
                  <td>
                    {Object.entries(customer.statusCounts).filter(([, count]) => count > 0).length > 1 ? (
                      <div className="analytics-status-summary">
                        {Object.entries(customer.statusCounts)
                          .filter(([, count]) => count > 0)
                          .map(([status, count]) => (
                            <span className="table-secondary" key={status}>
                              {count} · {statusLabel(status as AnalyticsStatus)}
                            </span>
                          ))}
                      </div>
                    ) : (
                      <StatusBadge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</StatusBadge>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {data.customerActivityTruncated ? (
          <p className="subtle">Menampilkan 100 Customer terbaru pada periode ini.</p>
        ) : null}
      </section>
    </>
  );
}

export function AdminAnalyticsContent() {
  const [days, setDays] = useState<PeriodDays>(30);
  const result = useQueryState({ query: api.analytics.get, args: { days } });
  const loading = result.status === "pending";
  const data = result.status === "success" ? (result.data as AnalyticsData) : null;

  return (
    <AdminOperationalPage
      eyebrow="Analytics"
      title="Analytics"
      description="Lihat minat Customer dari aktivitas keranjang sebelum menjadi pesanan."
      className="analytics-route"
      loading={loading}
      skeleton={{ titleWidth: "34%", descriptionWidths: ["88%"], actionWidths: [] }}
    >
      {loading ? <AnalyticsSkeleton /> : null}
      {result.status === "error" ? (
        <ErrorState title="Data analytics belum berhasil dimuat." description="Silakan coba lagi." />
      ) : null}
      {result.status === "success" ? (
        <>
          <Card className="admin-book-filters analytics-period-filter">
            <Field label="Periode">
              <BFGSelect
                aria-label="Periode analytics"
                value={String(days)}
                onChange={(event) => setDays(Number(event.target.value) as PeriodDays)}
              >
                {periodOptions.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </BFGSelect>
            </Field>
          </Card>
          <p className="subtle analytics-tracking-note">
            {data?.trackingStartedAt
              ? `Cohort memakai bukti pertama nyata (event atau Cart line). Event tertua tercatat sejak ${new Date(data.trackingStartedAt).toLocaleDateString("id-ID")}; Cart lama di luar periode tidak dihitung.`
              : "Cohort memakai bukti pertama nyata dari event atau Cart line; Cart lama di luar periode tidak dihitung."}
          </p>
          <AnalyticsContent data={data!} />
        </>
      ) : null}
    </AdminOperationalPage>
  );
}

export function AdminAnalyticsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminAnalyticsContent />
      </ProductAccessGuard>
    </SiteShell>
  );
}
