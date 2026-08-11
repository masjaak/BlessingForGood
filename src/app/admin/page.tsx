"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminOverview() {
  const { state, dataSource, sessionRole } = useProduct();
  const { batchList, adminInvoiceList, adminPaymentQueue } = useOperations();
  const joinRequests = useQuery(api.joinRequests.listForAdmin, dataSource === "convex" ? {} : "skip");
  const exceptions = useQuery(api.orderExceptions.listForAdmin, dataSource === "convex" ? {} : "skip");
  const pendingAdmissions =
    joinRequests?.filter((item) => item.status === "submitted" || item.status === "under_review").length || 0;
  const activeBatches = batchList?.page.filter((batch) => !batch.isArchived).length || 0;
  const openInvoices =
    adminInvoiceList?.page.filter((invoice) => invoice.status === "issued" && invoice.outstandingAmount > 0).length ||
    0;
  const openExceptions =
    exceptions?.filter((item) => item.status !== "resolved" && item.status !== "rejected").length || 0;
  const pendingPayments = adminPaymentQueue?.length || 0;
  const newOrders = state.orders.filter((order) => order.status === "submitted").length;

  const queues = [
    ["Penerimaan", pendingAdmissions, "/admin/join-requests", "Permintaan Blessfriends menunggu tinjauan"],
    ["Pesanan baru", newOrders, "/admin/orders", "Pesanan yang belum masuk proses PO"],
    ["Batch aktif", activeBatches, "/admin/batches", "Batch yang sedang dioperasikan"],
    ["Pembayaran", pendingPayments, "/admin/payments", "Konfirmasi pembayaran menunggu verifikasi"],
    ["Masalah", openExceptions, "/admin/exceptions", "OOS, defect, atau pembatalan aktif"],
    ["Invoice terbuka", openInvoices, "/admin/invoices", "Invoice dengan saldo yang belum selesai"],
  ] as const;

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional BFG"
        title="Pekerjaan penting hari ini."
        description="Antrian utama dari pesanan, batch, pembayaran, invoice, dan penanganan masalah."
        actions={<LinkButton href="/admin/orders">Kelola pesanan</LinkButton>}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="admin-queue-grid">
            {queues.map(([label, count, href, description]) => (
              <Card className="metric" key={label}>
                <div className="split-heading">
                  <span className="card-kicker">{label}</span>
                  <StatusBadge tone={count ? "warning" : "positive"}>{count ? "Perlu tindakan" : "Bersih"}</StatusBadge>
                </div>
                <strong className="metric-value">{count}</strong>
                <p>{description}</p>
                <LinkButton href={href} variant="quiet">
                  Buka {label.toLowerCase()} →
                </LinkButton>
              </Card>
            ))}
          </div>
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Akses cepat</span>
                <h2>Operasi utama</h2>
              </div>
            </div>
            <div className="actions admin-quick-actions">
              <LinkButton href="/admin/books" variant="secondary">
                Book Master
              </LinkButton>
              <LinkButton href="/admin/catalogs" variant="secondary">
                Secret Catalog
              </LinkButton>
              <LinkButton href="/admin/batches" variant="secondary">
                Batch PO
              </LinkButton>
              <LinkButton href="/admin/invoices" variant="secondary">
                Invoice & deposit
              </LinkButton>
              {sessionRole === "owner" ? (
                <LinkButton href="/admin/users" variant="secondary">
                  Pengguna
                </LinkButton>
              ) : null}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminOverview />
      </ProductAccessGuard>
    </SiteShell>
  );
}
