"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { EmptyState, LoadingRegion, SkeletonTable } from "@/components/ui";

function AuditLog() {
  const events = useQuery(api.auditEvents.list, { paginationOpts: { numItems: 100, cursor: null } });
  return (
    <AdminOperationalPage
      eyebrow="Owner security"
      title="Activity log"
      description="Riwayat immutable untuk tindakan operasional dan perubahan akses yang sensitif."
    >
      {events === undefined ? (
        <LoadingRegion label="Memuat activity log">
          <SkeletonTable rows={6} />
        </LoadingRegion>
      ) : events.page.length ? (
        <div className="table-wrap">
          <table className="data-table">
            <caption className="sr-only">Activity log</caption>
            <thead>
              <tr>
                <th>Waktu</th>
                <th>Actor</th>
                <th>Action</th>
                <th>Target</th>
              </tr>
            </thead>
            <tbody>
              {events.page.map((event) => (
                <tr key={event.auditEventId}>
                  <td>{new Date(event.createdAt).toLocaleString("id-ID")}</td>
                  <td>{event.actorName}</td>
                  <td>{event.action}</td>
                  <td>
                    {event.targetType} · {event.targetId}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState title="Activity log kosong" description="Tindakan Admin dan Owner akan dicatat di sini." />
      )}
    </AdminOperationalPage>
  );
}

export default function AdminAuditPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="owner">
        <AuditLog />
      </ProductAccessGuard>
    </SiteShell>
  );
}
