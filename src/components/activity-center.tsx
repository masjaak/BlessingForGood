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
  unreadCount,
}: {
  workspace: "admin" | "customer";
  compact?: boolean;
  onClose?: () => void;
  unreadCount?: number;
}) {
  const activity = useQuery(api.notifications.listActivity, { workspace });
  const markRead = useMutation(api.notifications.markRead);
  const visibleActivity = compact ? activity?.slice(0, 3) : activity;
  const previewUnreadCount = unreadCount ?? activity?.filter((item) => !item.readAt).length;
  const content =
    activity === undefined ? (
      <LoadingRegion label="Memuat aktivitas">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    ) : visibleActivity?.length ? (
      compact ? (
        <ul className="activity-preview-list" aria-label="Pesan terbaru">
          {visibleActivity.map((item) => (
            <li key={item.sourceId}>
              <Link
                className={`activity-preview-row ${item.readAt ? "is-read" : "is-unread"}`}
                data-read-state={item.readAt ? "read" : "unread"}
                href={item.destination}
                onClick={() => void markRead({ notificationId: item.sourceId })}
              >
                <span className="activity-preview-row-meta">
                  <span>
                    <span className="activity-type">{item.type === "system" ? "Sistem" : "Pesan BFG"}</span>
                    {!item.readAt ? (
                      <span className="activity-preview-unread" role="status" aria-label="Belum dibaca">
                        <span className="activity-unread-dot" aria-hidden="true" />
                        <span>Baru · Belum dibaca</span>
                      </span>
                    ) : null}
                  </span>
                  <time dateTime={new Date(item.timestamp).toISOString()}>
                    {new Date(item.timestamp).toLocaleString("id-ID")}
                  </time>
                </span>
                <strong className="activity-preview-row-title">{item.title}</strong>
                <span className="activity-preview-row-description">{item.description}</span>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <div className="content-stack">
          {visibleActivity.map((item) => (
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
      )
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
            <span className="subtle">
              {previewUnreadCount === undefined ? "Memuat…" : `${previewUnreadCount} belum dibaca`}
            </span>
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
