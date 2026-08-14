"use client";

import { useParams } from "next/navigation";
import { AdminCatalogAccess } from "@/components/admin-catalog-access";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminCatalogAccessPage() {
  const { catalogId } = useParams<{ catalogId: string }>();
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminCatalogAccess catalogId={catalogId} />
      </ProductAccessGuard>
    </SiteShell>
  );
}
