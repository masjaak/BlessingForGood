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
  metrics: {
    addActions: number;
    interestedCustomers: number;
    unconvertedIntents: number;
    convertedIntents: number;
  };
  books: Array<{
    bookTitle: string;
    format: string;
    addActions: number;
    customers: number;
    convertedIntents: number;
    conversionRate: number;
  }>;
  customers: Array<{
    customerId: string;
    name: string;
    memberCode: string | null;
    itemCount: number;
    quantity: number;
    lastActivityAt: number;
    status: AnalyticsStatus;
    items: Array<{ title: string; quantity: number }>;
  }>;
  customerActivityTruncated: boolean;
};

const periodOptions = [
  { value: "7", label: "7 hari terakhir" },
  { value: "30", label: "30 hari terakhir" },
  { value: "90", label: "90 hari terakhir" },
];

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
  if (!data.metrics.addActions) {
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
      <section className="account-metrics" aria-label="Ringkasan minat Customer">
        <Card className="metric">
          <span className="card-kicker">Add ke keranjang</span>
          <strong className="metric-value">{data.metrics.addActions}</strong>
          <p>Aksi tambah yang berhasil.</p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Customer berminat</span>
          <strong className="metric-value">{data.metrics.interestedCustomers}</strong>
          <p>Customer unik pada periode ini.</p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Belum checkout</span>
          <strong className="metric-value">{data.metrics.unconvertedIntents}</strong>
          <p>Intent buku yang belum menjadi pesanan.</p>
        </Card>
        <Card className="metric">
          <span className="card-kicker">Menjadi pesanan</span>
          <strong className="metric-value">{data.metrics.convertedIntents}</strong>
          <p>Intent dengan Order kanonik.</p>
        </Card>
      </section>

      <section className="admin-dashboard-section" aria-labelledby="analytics-books-heading">
        <div className="admin-section-heading">
          <div>
            <span className="card-kicker">Minat &amp; keranjang</span>
            <h2 id="analytics-books-heading">Buku paling sering masuk keranjang</h2>
          </div>
          <p>Diurutkan dari aksi tambah terbanyak.</p>
        </div>
        {data.books.length ? (
          <div className="table-wrap">
            <table className="data-table">
              <caption className="sr-only">Buku paling sering masuk keranjang</caption>
              <thead>
                <tr>
                  <th>Buku</th>
                  <th>Format</th>
                  <th>Add ke keranjang</th>
                  <th>Customer</th>
                  <th>Menjadi pesanan</th>
                  <th>Konversi</th>
                </tr>
              </thead>
              <tbody>
                {data.books.map((book) => (
                  <tr key={`${book.bookTitle}-${book.format}`}>
                    <td>{book.bookTitle}</td>
                    <td>{book.format}</td>
                    <td>{book.addActions}</td>
                    <td>{book.customers}</td>
                    <td>{book.convertedIntents}</td>
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
                    <StatusBadge tone={statusTone(customer.status)}>{statusLabel(customer.status)}</StatusBadge>
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

  return (
    <AdminOperationalPage
      eyebrow="Analytics"
      title="Analytics"
      description="Lihat minat Customer dari aktivitas keranjang sebelum menjadi pesanan."
      loading={loading}
      skeleton={{ titleWidth: "34%", descriptionWidths: ["88%"], actionWidths: [] }}
    >
      {loading ? <AnalyticsSkeleton /> : null}
      {result.status === "error" ? (
        <ErrorState title="Data analytics belum berhasil dimuat." description="Silakan coba lagi." />
      ) : null}
      {result.status === "success" ? (
        <>
          <Card className="admin-book-filters">
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
          <AnalyticsContent data={result.data as AnalyticsData} />
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
