"use client";

import { useQuery } from "convex/react";
import Link from "next/link";
import { api } from "../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonTable, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

function number(value: number) {
  return value.toLocaleString("id-ID");
}

function ConnectedAdminReadyStock() {
  const rows = useQuery(api.readyStock.listForAdmin, {});

  if (rows === undefined) {
    return (
      <LoadingRegion label="Memuat Ready Stock">
        <SkeletonTable rows={7} />
      </LoadingRegion>
    );
  }

  const totals = rows.reduce(
    (summary, row) => ({
      onHand: summary.onHand + row.onHandQuantity,
      reserved: summary.reserved + row.reservedQuantity,
      available: summary.available + row.availableQuantity,
    }),
    { onHand: 0, reserved: 0, available: 0 },
  );

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Ready Stock"
        title="Stok yang siap diproses."
        description="On hand adalah jumlah fisik. Reserved berasal dari pesanan aktif. Available selalu dihitung server: on hand dikurangi reserved."
        actions={
          <LinkButton href="/admin/books" variant="secondary">
            Kelola Book Master
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card className="admin-inventory-summary">
            <div>
              <span className="card-kicker">On hand</span>
              <strong>{number(totals.onHand)}</strong>
              <span className="subtle">Jumlah fisik yang tercatat</span>
            </div>
            <div>
              <span className="card-kicker">Reserved</span>
              <strong>{number(totals.reserved)}</strong>
              <span className="subtle">Sudah diklaim pesanan aktif</span>
            </div>
            <div>
              <span className="card-kicker">Available</span>
              <strong>{number(totals.available)}</strong>
              <span className="subtle">Dapat dipesan sekarang</span>
            </div>
          </Card>
          {rows.length ? (
            <div className="table-wrap">
              <table className="data-table admin-stock-table">
                <caption className="sr-only">Daftar Ready Stock per format</caption>
                <thead>
                  <tr>
                    <th>Buku / ISBN</th>
                    <th>Format</th>
                    <th>Status</th>
                    <th>On hand</th>
                    <th>Reserved</th>
                    <th>Available</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr key={row.variantId}>
                      <td>
                        <strong>{row.title}</strong>
                        <span className="subtle table-secondary">
                          {row.publisherName} · {row.isbn}
                        </span>
                      </td>
                      <td>{row.format}</td>
                      <td>
                        <StatusBadge
                          tone={row.publicationStatus === "published" && row.isAvailable ? "positive" : "neutral"}
                        >
                          {row.publicationStatus === "published" && row.isAvailable ? "Listed" : row.publicationStatus}
                        </StatusBadge>
                      </td>
                      <td className="numeric-cell">{number(row.onHandQuantity)}</td>
                      <td className="numeric-cell">{number(row.reservedQuantity)}</td>
                      <td className="numeric-cell">
                        <strong>{number(row.availableQuantity)}</strong>
                      </td>
                      <td>
                        <Link className="button button-secondary" href={`/admin/books/${row.bookId}`}>
                          Edit stok
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <EmptyState
              title="Belum ada format Ready Stock."
              description="Tambahkan format buku dari Book Master untuk mulai mencatat stok fisik."
              action={<LinkButton href="/admin/books">Buka Book Master</LinkButton>}
            />
          )}
        </div>
      </div>
    </div>
  );
}

export function AdminReadyStock() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ConnectedAdminReadyStock />
      </ProductAccessGuard>
    </SiteShell>
  );
}
