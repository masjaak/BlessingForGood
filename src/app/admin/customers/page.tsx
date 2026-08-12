"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, EmptyState, LinkButton, LoadingRegion, PageHeader, SkeletonTable } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";

function CustomerList() {
  const { dataSource } = useProduct();
  const customers = useQuery(api.orders.listEligibleCustomers, dataSource === "convex" ? {} : "skip");
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional customer"
        title="Customer aktif"
        description="Buka satu customer untuk melihat profil dan riwayat operasional yang terkait dengan akun tersebut."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {!customers ? (
            <LoadingRegion label="Memuat customer">
              <SkeletonTable rows={5} />
            </LoadingRegion>
          ) : customers.length ? (
            <div className="table-wrap">
              <table className="data-table">
                <caption className="sr-only">Daftar customer aktif</caption>
                <thead>
                  <tr>
                    <th>Nama</th>
                    <th>Email</th>
                    <th>Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.customerUserId}>
                      <td>
                        <strong>{customer.displayName}</strong>
                      </td>
                      <td>{customer.email || "—"}</td>
                      <td>
                        <LinkButton href={`/admin/customers/${customer.customerUserId}`} variant="quiet">
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
                title="Belum ada customer aktif"
                description="Customer yang sudah memiliki akun aktif akan tampil di sini."
              />
            </Card>
          )}
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
