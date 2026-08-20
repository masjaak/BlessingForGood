"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { useId, useState } from "react";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Card, EmptyState, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";

type ActivitySurface = "notification" | "inbox";

export function ActivityCenter({
  surface,
  workspace,
  compact = false,
  counts,
  onSurfaceChange,
}: {
  surface: ActivitySurface;
  workspace: "admin" | "customer";
  compact?: boolean;
  counts?: Partial<Record<ActivitySurface, number | undefined>>;
  onSurfaceChange?: (surface: ActivitySurface) => void;
}) {
  const [localSurface, setLocalSurface] = useState<ActivitySurface>(surface);
  const activeSurface = compact && onSurfaceChange ? surface : localSurface;
  const notices = useQuery(api.notifications.listMine, { surface: activeSurface });
  const markRead = useMutation(api.notifications.markRead);
  const label = activeSurface === "notification" ? "Notifikasi" : "Kotak masuk";
  const panelId = useId();
  const content =
    notices === undefined ? (
      <LoadingRegion label={`Memuat ${label}`}>
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    ) : notices.length ? (
      <div className="content-stack">
        {notices.map((notice) => (
          <Card className={notice.readAt ? "activity-card" : "activity-card is-unread"} key={notice.notificationId}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">{new Date(notice.createdAt).toLocaleString("id-ID")}</span>
                <h2>{notice.title}</h2>
              </div>
              {!notice.readAt ? <span className="status-badge status-warning">Baru</span> : null}
            </div>
            <p>{notice.body}</p>
            <Link
              className="button button-secondary"
              href={notice.destination}
              onClick={() => void markRead({ notificationId: notice.notificationId })}
            >
              Buka detail
            </Link>
          </Card>
        ))}
      </div>
    ) : (
      <EmptyState
        title={`${label} masih kosong`}
        description={
          activeSurface === "notification"
            ? "Pembaruan operasional yang relevan akan tampil di sini."
            : "Pesan operasional BFG yang perlu ditindaklanjuti akan tampil di sini."
        }
      />
    );

  if (compact) {
    const destination = activeSurface === "notification" ? "notifications" : "inbox";
    return (
      <div className="activity-panel-content">
        <div className="activity-panel-heading">
          <strong>Aktivitas</strong>
          <span className="subtle">Pembaruan terbaru</span>
        </div>
        <p className="activity-explanation">
          Notifikasi berisi perubahan sistem; Kotak masuk berisi pesan operasional. Keduanya satu pintu di Aktivitas,
          tetapi riwayatnya tetap terpisah.
        </p>
        <div className="activity-tabs" role="tablist" aria-label="Jenis aktivitas">
          {(["notification", "inbox"] as const).map((tabSurface) => {
            const tabLabel = tabSurface === "notification" ? "Notifikasi" : "Kotak masuk";
            const count = counts?.[tabSurface];
            return (
              <button
                aria-controls={`${panelId}-panel`}
                aria-selected={activeSurface === tabSurface}
                className={`activity-tab${activeSurface === tabSurface ? " is-active" : ""}`}
                key={tabSurface}
                onClick={() => {
                  setLocalSurface(tabSurface);
                  onSurfaceChange?.(tabSurface);
                }}
                role="tab"
                type="button"
              >
                {tabLabel}
                {count ? <span className="activity-tab-count">{count > 99 ? "99+" : count}</span> : null}
              </button>
            );
          })}
        </div>
        <div id={`${panelId}-panel`} role="tabpanel">
          {content}
        </div>
        <Link
          className="activity-panel-footer"
          href={`${workspace === "admin" ? "/admin" : "/account"}/${destination}`}
        >
          {activeSurface === "notification" ? "Lihat semua notifikasi" : "Buka Kotak Masuk"}
        </Link>
      </div>
    );
  }

  return workspace === "admin" ? (
    <AdminOperationalPage
      eyebrow="Pusat aktivitas"
      title={label}
      description={
        "Aktivitas adalah satu pintu: Notifikasi untuk perubahan sistem dan Kotak masuk untuk pesan operasional."
      }
    >
      {content}
    </AdminOperationalPage>
  ) : (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Akun Blessfriends"
        title={label}
        description={
          "Aktivitas adalah satu pintu: Notifikasi untuk perubahan sistem dan Kotak masuk untuk pesan operasional."
        }
      />
      {content}
    </div>
  );
}
