"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Card, EmptyState, IconButton, LinkButton, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";

export function ActivityCenter({
  workspace,
  compact = false,
  onClose,
}: {
  workspace: "admin" | "customer";
  compact?: boolean;
  onClose?: () => void;
}) {
  const activity = useQuery(api.notifications.listActivity, { workspace });
  const markRead = useMutation(api.notifications.markRead);
  const content =
    activity === undefined ? (
      <LoadingRegion label="Memuat aktivitas">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    ) : activity.length ? (
      <div className="content-stack">
        {activity.map((item) => (
          <Card
            className={item.readAt ? "activity-card is-read" : "activity-card is-unread"}
            data-read-state={item.readAt ? "read" : "unread"}
            key={item.sourceId}
          >
            <div className="activity-card-topline">
              <span className="activity-type-group">
                <span className="activity-type">{item.type === "system" ? "Sistem" : "Pesan BFG"}</span>
                {!item.readAt ? (
                  <span className="activity-unread-marker" role="status" aria-label="Belum dibaca">
                    <span className="activity-unread-dot" aria-hidden="true" />
                    <span>Baru · Belum dibaca</span>
                  </span>
                ) : null}
              </span>
              <time dateTime={new Date(item.timestamp).toISOString()}>
                {new Date(item.timestamp).toLocaleString("id-ID")}
              </time>
            </div>
            <h2 className={!item.readAt ? "activity-title-unread" : undefined}>{item.title}</h2>
            <p>{item.description}</p>
            <LinkButton
              variant="secondary"
              href={item.destination}
              onClick={() => void markRead({ notificationId: item.sourceId })}
            >
              Buka detail
            </LinkButton>
          </Card>
        ))}
      </div>
    ) : (
      <EmptyState
        title="Belum ada aktivitas"
        description="Pembaruan sistem dan pesan operasional BFG akan tampil di sini."
      />
    );

  if (compact) {
    return (
      <div className="activity-panel-content">
        <div className="activity-panel-heading">
          <div>
            <strong>Aktivitas</strong>
            <span className="subtle">Pembaruan terbaru</span>
          </div>
          {onClose ? (
            <IconButton
              aria-label="Tutup Aktivitas"
              className="activity-panel-close"
              onClick={onClose}
              type="button"
              variant="tertiary"
            >
              ×
            </IconButton>
          ) : null}
        </div>
        <p className="activity-explanation">
          Sistem dan pesan BFG tampil dalam satu urutan waktu. Makna dan riwayat sumbernya tetap terjaga.
        </p>
        {content}
        <Link className="activity-panel-footer" href={`${workspace === "admin" ? "/admin" : "/account"}/notifications`}>
          Lihat semua aktivitas
        </Link>
      </div>
    );
  }

  return workspace === "admin" ? (
    <AdminOperationalPage
      eyebrow="Pusat aktivitas"
      title="Aktivitas"
      description="Satu feed kronologis untuk perubahan sistem dan pesan operasional BFG."
    >
      {content}
    </AdminOperationalPage>
  ) : (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Akun Blessfriends"
        title="Aktivitas"
        description="Satu feed kronologis untuk perubahan sistem dan pesan operasional BFG."
      />
      {content}
    </div>
  );
}
