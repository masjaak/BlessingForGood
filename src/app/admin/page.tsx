"use client";

import { useQuery_experimental as useQueryState } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Card, LinkButton, PageHeader, Skeleton, SkeletonText, StatusBadge } from "@/components/ui";
import { roleCanAccess } from "@/domain/prototype/session";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { AdminSkeletonContent } from "@/components/workspace-skeleton-content";

type DashboardCountResult =
  { status: "pending" } | { status: "error"; error: Error } | { status: "success"; data: number };

type QueueDefinition = {
  label: string;
  count: DashboardCountResult;
  href: string;
  description: string;
};

function DashboardQueueCard({ label, count, href, description }: QueueDefinition) {
  if (count.status === "pending") {
    return (
      <Card className="metric" data-dashboard-block={label} data-dashboard-state="loading" aria-busy="true">
        <div className="split-heading">
          <SkeletonText className="skeleton-queue-label" width="58%" />
          <Skeleton className="skeleton-queue-status" />
        </div>
        <Skeleton className="metric-value skeleton-queue-value" />
        <p className="skeleton-queue-description">
          <SkeletonText width="92%" />
          <SkeletonText width="68%" />
        </p>
        <div className="skeleton-queue-action-slot">
          <Skeleton className="skeleton-queue-action" />
        </div>
      </Card>
    );
  }

  if (count.status === "error") {
    return (
      <Card className="metric" data-dashboard-block={label} data-dashboard-state="unavailable" role="status">
        <div className="split-heading">
          <span className="card-kicker">{label}</span>
          <StatusBadge tone="warning">Tidak tersedia</StatusBadge>
        </div>
        <strong className="metric-value">—</strong>
        <div className="action-region">
          <p className="action-support">Data belum tersedia saat ini.</p>
          <LinkButton href={href} variant="tertiary">
            {href === "/admin/join-requests" ? "Review" : `Buka ${label.toLowerCase()} →`}
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="metric" data-dashboard-block={label} data-dashboard-state="ready">
      <div className="split-heading">
        <span className="card-kicker">{label}</span>
        <StatusBadge tone={count.data ? "warning" : "positive"}>{count.data ? "Perlu tindakan" : "Bersih"}</StatusBadge>
      </div>
      <strong className="metric-value">{count.data}</strong>
      <div className="action-region">
        <p className="action-support">{description}</p>
        <LinkButton href={href} variant="tertiary">
          {href === "/admin/join-requests" ? "Review" : `Buka ${label.toLowerCase()} →`}
        </LinkButton>
      </div>
    </Card>
  );
}

function AdminOverview() {
  const { dataSource, sessionRole } = useProduct();
  const queryArgs = dataSource === "convex" ? {} : "skip";
  const pendingAdmissions = useQueryState({ query: api.joinRequests.pendingCount, args: queryArgs });
  const newOrders = useQueryState({ query: api.orders.countSubmittedForAdmin, args: queryArgs });
  const pendingPayments = useQueryState({ query: api.paymentConfirmations.countPendingForAdmin, args: queryArgs });
  const openExceptions = useQueryState({ query: api.orderExceptions.countOpenForAdmin, args: queryArgs });
  const activeBatches = useQueryState({ query: api.batches.countActiveForAdmin, args: queryArgs });
  const openInvoices = useQueryState({ query: api.invoices.countOpenForAdmin, args: queryArgs });
  const pendingRefunds = useQueryState({ query: api.refunds.countPendingForAdmin, args: queryArgs });

  const queues: ReadonlyArray<QueueDefinition> = [
    {
      label: "Join Requests",
      count: pendingAdmissions,
      href: "/admin/join-requests",
      description: "Permintaan Blessfriends baru yang menunggu review",
    },
    {
      label: "Pesanan baru",
      count: newOrders,
      href: "/admin/orders",
      description: "Pesanan yang belum masuk proses PO",
    },
    {
      label: "Pembayaran",
      count: pendingPayments,
      href: "/admin/payments",
      description: "Konfirmasi pembayaran menunggu verifikasi",
    },
    {
      label: "Masalah",
      count: openExceptions,
      href: "/admin/exceptions",
      description: "OOS, defect, atau pembatalan aktif",
    },
    {
      label: "Batch aktif",
      count: activeBatches,
      href: "/admin/batches",
      description: "Batch yang sedang dioperasikan",
    },
    {
      label: "Invoice terbuka",
      count: openInvoices,
      href: "/admin/invoices",
      description: "Invoice dengan saldo yang belum selesai",
    },
    {
      label: "Refund",
      count: pendingRefunds,
      href: "/admin/refunds",
      description: "Kewajiban refund menunggu payout",
    },
  ];
  const routeLoading = queues.some((queue) => queue.count.status === "pending");
  const queueCards = (items: ReadonlyArray<QueueDefinition>) =>
    items.map((item) => <DashboardQueueCard {...item} key={item.label} />);

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasional BFG"
        title="Pekerjaan penting hari ini."
        description="Antrian utama dari pesanan, batch, pembayaran, invoice, dan penanganan masalah."
        actions={<LinkButton href="/admin/orders">Kelola pesanan</LinkButton>}
        loading={routeLoading}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {routeLoading ? (
            <AdminSkeletonContent kind="dashboard" />
          ) : (
            <>
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
                  {roleCanAccess(sessionRole, "admin") ? (
                    <LinkButton href="/admin/users" variant="secondary">
                      Pengguna
                    </LinkButton>
                  ) : null}
                </div>
              </Card>
            </>
          )}
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
