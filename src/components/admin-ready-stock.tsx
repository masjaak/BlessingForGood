"use client";

import { useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, LinkButton, LoadingRegion, SkeletonTable, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";

function number(value: number) {
  return value.toLocaleString("id-ID");
}

type ReadyStockRows = Awaited<FunctionReturnType<typeof api.readyStock.listForAdmin>>;

const publicationLabels: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  special: "Khusus / privat",
  archived: "Diarsipkan",
};

function ReadyStockContent({ rows }: { rows: ReadyStockRows }) {
  const totals = rows.reduce(
    (summary, row) => ({
      onHand: summary.onHand + row.onHandQuantity,
      reserved: summary.reserved + row.reservedQuantity,
      available: summary.available + row.availableQuantity,
    }),
    { onHand: 0, reserved: 0, available: 0 },
  );

  return (
    <>
      <Card className="admin-inventory-summary">
        <div>
          <span className="card-kicker">Stok fisik</span>
          <strong>{number(totals.onHand)}</strong>
          <span className="subtle">Jumlah fisik yang tercatat</span>
        </div>
        <div>
          <span className="card-kicker">Dipesan</span>
          <strong>{number(totals.reserved)}</strong>
          <span className="subtle">Sudah diklaim pesanan aktif</span>
        </div>
        <div>
          <span className="card-kicker">Tersedia</span>
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
                <th>Stok fisik</th>
                <th>Dipesan</th>
                <th>Tersedia</th>
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
                      {row.publicationStatus === "published" && row.isAvailable
                        ? "Tercantum"
                        : publicationLabels[row.publicationStatus] || row.publicationStatus}
                    </StatusBadge>
                  </td>
                  <td className="numeric-cell">{number(row.onHandQuantity)}</td>
                  <td className="numeric-cell">{number(row.reservedQuantity)}</td>
                  <td className="numeric-cell">
                    <strong>{number(row.availableQuantity)}</strong>
                  </td>
                  <td>
                    <LinkButton href={`/admin/books/${row.bookId}`} variant="secondary">
                      Edit stok
                    </LinkButton>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Belum ada format Ready Stock."
          description="Tambahkan format buku dari Master Buku untuk mulai mencatat stok fisik."
          action={<LinkButton href="/admin/books">Buka Master Buku</LinkButton>}
        />
      )}
    </>
  );
}

function ConnectedAdminReadyStock() {
  const rows = useQuery(api.readyStock.listForAdmin, {});

  return (
    <AdminOperationalPage
      eyebrow="Ready Stock"
      title="Stok yang siap diproses."
      description="Stok fisik adalah jumlah yang tercatat. Dipesan berasal dari pesanan aktif. Tersedia selalu dihitung server."
      actions={
        <LinkButton href="/admin/books" variant="secondary">
          Kelola Master Buku
        </LinkButton>
      }
    >
      {rows === undefined ? (
        <LoadingRegion label="Memuat Ready Stock">
          <SkeletonTable rows={7} />
        </LoadingRegion>
      ) : (
        <ReadyStockContent rows={rows} />
      )}
    </AdminOperationalPage>
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
