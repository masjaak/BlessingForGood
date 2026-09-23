"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { CatalogPageNavigation, CatalogResultToolbar } from "@/components/catalog-pagination";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, Field, LinkButton, LoadingRegion, PageHeader } from "@/components/ui";
import { SkeletonTableBlock } from "@/components/workspace-skeleton-primitives";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";
import { useAdminCursorPagination } from "@/domain/prototype/pagination";

function CustomerList() {
  const { dataSource } = useProduct();
  const pagination = useAdminCursorPagination();
  const [search, setSearch] = useState("");
  const customers = useQuery(
    api.users.listCustomersForAdmin,
    dataSource === "convex"
      ? {
          paginationOpts: { numItems: pagination.pageSize as 25 | 50 | 100, cursor: pagination.cursor },
          search,
        }
      : "skip",
  );
  const customerRows = customers?.page ?? [];
  const resultText = customers?.truncated
    ? search.trim()
      ? `Menampilkan ${customerRows.length ? (pagination.pageNumber - 1) * pagination.pageSize + 1 : 0}–${(pagination.pageNumber - 1) * pagination.pageSize + customerRows.length} hasil; pencarian mencakup 2.000 pelanggan terbaru`
      : `Menampilkan ${(pagination.pageNumber - 1) * pagination.pageSize + 1}–${(pagination.pageNumber - 1) * pagination.pageSize + customerRows.length} dari 2.000+ pelanggan`
    : undefined;
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional pelanggan"
        title="Pelanggan aktif"
        description="Buka satu pelanggan untuk melihat profil dan riwayat operasional yang terkait dengan akun tersebut."
        skeleton={{ titleWidth: "42%", descriptionWidths: ["92%", "60%"] }}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="customer-directory-controls">
            <Field label="Cari pelanggan">
              <input
                className="input"
                type="search"
                aria-label="Cari pelanggan"
                placeholder="Nama, email, atau kode anggota"
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  pagination.reset();
                }}
              />
            </Field>
            <CatalogResultToolbar
              pageNumber={pagination.pageNumber}
              pageSize={pagination.pageSize as 25 | 50 | 100}
              resultCount={customers?.totalCount ?? 0}
              resultText={resultText}
              noun="pelanggan"
              loading={customers === undefined}
              onPageSizeChange={pagination.setPageSize}
            />
          </div>
          {customers === undefined ? (
            <LoadingRegion label="Memuat pelanggan">
              <SkeletonTableBlock rows={8} columnWidths={["1.35fr", "1.2fr", "0.7fr"]} />
            </LoadingRegion>
          ) : customerRows.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">Daftar pelanggan aktif</caption>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customerRows.map((customer) => (
                    <tr key={customer.customerUserId}>
                      <td>
                        <strong>{customer.displayName}</strong>
                        <br />
                        <span className="subtle">{customer.memberCode || "Kode belum tersedia"}</span>
                      </td>
                      <td>{customer.email || "—"}</td>
                      <td>
                        <LinkButton href={`/admin/customers/${customer.customerUserId}`} variant="tertiary">
                          Lihat detail →
                        </LinkButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Card>
              <EmptyState
                title={search.trim() ? "Tidak ada pelanggan yang cocok" : "Belum ada pelanggan aktif"}
                description={
                  search.trim()
                    ? "Coba kata kunci lain."
                    : "Pelanggan yang sudah memiliki akun aktif akan tampil di sini."
                }
              />
            </Card>
          )}
          <CatalogPageNavigation
            pageNumber={pagination.pageNumber}
            pageSize={pagination.pageSize as 25 | 50 | 100}
            resultCount={customers?.totalCount ?? 0}
            pageCount={customers?.totalCountKnown ? Math.ceil(customers.totalCount / pagination.pageSize) : undefined}
            hidePageCount={!customers?.totalCountKnown}
            canGoPrevious={pagination.canGoPrevious}
            canGoNext={customers ? !customers.isDone : false}
            noun="pelanggan"
            loading={customers === undefined}
            onPageNumberChange={(next) => {
              if (next < pagination.pageNumber) pagination.previous();
              else if (customers?.continueCursor) pagination.next(customers.continueCursor);
            }}
            onPageSizeChange={pagination.setPageSize}
          />
        </div>
      </div>
    </div>
  );
}

export default function AdminCustomersPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <CustomerList />
      </ProductAccessGuard>
    </SiteShell>
  );
}
