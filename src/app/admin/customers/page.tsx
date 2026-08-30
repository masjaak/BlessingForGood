"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonTable } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";
import { useAdminCursorPagination } from "@/domain/prototype/pagination";

function CustomerList() {
  const { dataSource } = useProduct();
  const pagination = useAdminCursorPagination();
  const customers = useQuery(
    api.orders.listEligibleCustomers,
    dataSource === "convex" ? { paginationOpts: { numItems: pagination.pageSize, cursor: pagination.cursor } } : "skip",
  );
  const customerPage = Array.isArray(customers) ? { page: customers, isDone: true, continueCursor: "" } : customers;
  const customerRows = customerPage?.page || [];
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional pelanggan"
        title="Pelanggan aktif"
        description="Buka satu pelanggan untuk melihat profil dan riwayat operasional yang terkait dengan akun tersebut."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {!customers ? (
            <LoadingRegion label="Memuat pelanggan">
              <SkeletonTable rows={5} />
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
                title="Belum ada pelanggan aktif"
                description="Pelanggan yang sudah memiliki akun aktif akan tampil di sini."
              />
            </Card>
          )}
          <AdminPagination
            {...pagination}
            rowCount={customerRows.length}
            isDone={customerPage?.isDone ?? true}
            continueCursor={customerPage?.continueCursor ?? ""}
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
