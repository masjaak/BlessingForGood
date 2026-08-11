"use client";

import { useParams } from "next/navigation";
import { AdminBookDetail } from "@/components/admin-book-detail";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminBookDetailPage() {
  const { bookId } = useParams<{ bookId: string }>();
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminBookDetail bookId={bookId} />
      </ProductAccessGuard>
    </SiteShell>
  );
}
