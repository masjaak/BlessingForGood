"use client";

import { AdminBooks } from "@/components/admin-books";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminBooksPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminBooks />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
