"use client";

import { useParams } from "next/navigation";
import { AdminCatalogDetail } from "@/components/admin-catalog-detail";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminCatalogDetailPage() {
  const { catalogId } = useParams<{ catalogId: string }>();
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminCatalogDetail catalogId={catalogId} />
      </ProductAccessGuard>
    </SiteShell>
  );
}
