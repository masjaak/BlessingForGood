"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { PageAwareSkeleton } from "@/components/page-aware-skeleton";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { useOperations } from "@/domain/prototype/operations-context";
import { roleCanAccess } from "@/domain/prototype/session";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminOverview() {
  const { state, dataSource, sessionRole, ordersLoading, catalogsLoading } = useProduct();
  const { batchList, adminInvoiceList, adminPaymentQueue } = useOperations();
  const joinRequests = useQuery(api.joinRequests.listForAdmin, dataSource === "convex" ? {} : "skip");
  const exceptions = useQuery(
    api.orderExceptions.listForAdmin,
    dataSource === "convex" ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const refunds = useQuery(api.refunds.listForAdmin, dataSource === "convex" ? {} : "skip");
  if (
    ordersLoading ||
    catalogsLoading ||
    batchList === undefined ||
    adminInvoiceList === undefined ||
    adminPaymentQueue === undefined ||
    joinRequests === undefined ||
    exceptions === undefined ||
    refunds === undefined
  ) {
    return <PageAwareSkeleton workspace="admin" pathname="/admin" />;
  }
  const pendingAdmissions =
    joinRequests?.filter((item) => item.status === "submitted" || item.status === "under_review").length || 0;
  const activeBatches = batchList?.page.filter((batch) => !batch.isArchived).length || 0;
  const openInvoices =
    adminInvoiceList?.page.filter((invoice) => invoice.status === "issued" && invoice.outstandingAmount > 0).length ||
    0;
  const openExceptions =
    exceptions?.page.filter((item) => item.status !== "resolved" && item.status !== "rejected").length || 0;
  const pendingPayments = adminPaymentQueue?.length || 0;
  const newOrders = state.orders.filter((order) => order.status === "submitted").length;
  const pendingRefunds = refunds.filter((item) => item.status !== "paid").length;

  const queues = [
    [
      "Join Requests",
      pendingAdmissions,
      "/admin/join-requests",
      pendingAdmissions
        ? `${pendingAdmissions} permintaan Blessfriends baru`
        : "Tidak ada permintaan Blessfriends baru",
    ],
    ["Pesanan baru", newOrders, "/admin/orders", "Pesanan yang belum masuk proses PO"],
    ["Pembayaran", pendingPayments, "/admin/payments", "Konfirmasi pembayaran menunggu verifikasi"],
    ["Masalah", openExceptions, "/admin/exceptions", "OOS, defect, atau pembatalan aktif"],
    ["Batch aktif", activeBatches, "/admin/batches", "Batch yang sedang dioperasikan"],
    ["Invoice terbuka", openInvoices, "/admin/invoices", "Invoice dengan saldo yang belum selesai"],
    ["Refund", pendingRefunds, "/admin/refunds", "Kewajiban refund menunggu payout"],
  ] as const;
  const queueCards = (items: ReadonlyArray<(typeof queues)[number]>) =>
    items.map(([label, count, href, description]) => (
      <Card className="metric" key={label}>
        <div className="split-heading">
          <span className="card-kicker">{label}</span>
          <StatusBadge tone={count ? "warning" : "positive"}>{count ? "Perlu tindakan" : "Bersih"}</StatusBadge>
        </div>
        <strong className="metric-value">{count}</strong>
        <div className="action-region">
          <p className="action-support">{description}</p>
          <LinkButton href={href} variant="tertiary">
            {href === "/admin/join-requests" ? "Review" : `Buka ${label.toLowerCase()} →`}
          </LinkButton>
        </div>
      </Card>
    ));

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
          <section className="admin-dashboard-section" aria-labelledby="admin-attention-heading">
            <div className="admin-section-heading">
              <div>
                <span className="card-kicker">Prioritas operasi</span>
                <h2 id="admin-attention-heading">Perlu tindakan</h2>
              </div>
              <p>Mulai dari antrian yang mengubah langkah berikutnya.</p>
            </div>
            <div className="admin-queue-grid admin-queue-grid-primary">{queueCards(queues.slice(0, 4))}</div>
          </section>

          <section className="admin-dashboard-section" aria-labelledby="admin-context-heading">
            <div className="admin-section-heading">
              <div>
                <span className="card-kicker">Konteks operasi</span>
                <h2 id="admin-context-heading">Ringkasan kerja</h2>
              </div>
              <p>Status yang membantu membaca antrian utama.</p>
            </div>
            <div className="admin-queue-grid admin-queue-grid-secondary">{queueCards(queues.slice(4))}</div>
          </section>
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Akses cepat</span>
                <h2>Operasi utama</h2>
              </div>
            </div>
            <div className="actions admin-quick-actions">
              <LinkButton href="/admin/books" variant="secondary">
                Master Buku
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
              {roleCanAccess(sessionRole, "owner") ? (
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
