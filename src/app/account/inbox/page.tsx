"use client";

import { ActivityCenter } from "@/components/activity-center";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function CustomerInboxPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer">
        <ActivityCenter workspace="customer" />
      </ProductAccessGuard>
    </SiteShell>
  );
}
