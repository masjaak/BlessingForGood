import { AdminRefunds } from "@/components/admin-refunds";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminRefundsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminRefunds />
      </ProductAccessGuard>
    </SiteShell>
  );
}
