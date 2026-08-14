"use client";

import { ActivityCenter } from "@/components/activity-center";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminNotificationsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ActivityCenter surface="notification" workspace="admin" />
      </ProductAccessGuard>
    </SiteShell>
  );
}
