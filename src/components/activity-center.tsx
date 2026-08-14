"use client";

import Link from "next/link";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Card, EmptyState, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";

export function ActivityCenter({
  surface,
  workspace,
}: {
  surface: "notification" | "inbox";
  workspace: "admin" | "customer";
}) {
  const notices = useQuery(api.notifications.listMine, { surface });
  const markRead = useMutation(api.notifications.markRead);
  const label = surface === "notification" ? "Notifikasi" : "Inbox";
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
          surface === "notification"
            ? "Pembaruan operasional yang relevan akan tampil di sini."
            : "Pesan operasional BFG yang perlu ditindaklanjuti akan tampil di sini."
        }
      />
    );

  return workspace === "admin" ? (
    <AdminOperationalPage
      eyebrow="Pusat aktivitas"
      title={label}
      description={
        surface === "notification"
          ? "Pembaruan sistem untuk workspace Admin."
          : "Pesan operasional yang perlu ditindaklanjuti."
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
          surface === "notification"
            ? "Pembaruan pesanan, batch, tagihan, dan pembayaranmu."
            : "Pesan operasional dari BFG untuk akunmu."
        }
      />
      {content}
    </div>
  );
}
