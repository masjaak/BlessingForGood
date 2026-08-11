"use client";

import { AdminBooks } from "@/components/admin-books";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminBooksPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminBooks />
      </ProductAccessGuard>
    </SiteShell>
  );
}
