"use client";

import { ActivityCenter } from "@/components/activity-center";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminInboxPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ActivityCenter workspace="admin" />
      </ProductAccessGuard>
    </SiteShell>
  );
}
