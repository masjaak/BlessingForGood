import { AdminExceptions } from "@/components/admin-exceptions";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminExceptionsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminExceptions />
      </ProductAccessGuard>
    </SiteShell>
  );
}
