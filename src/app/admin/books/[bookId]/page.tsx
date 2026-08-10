"use client";

import { useParams } from "next/navigation";
import { AdminBookDetail } from "@/components/admin-book-detail";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminBookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminBookDetail bookId={bookId} />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
