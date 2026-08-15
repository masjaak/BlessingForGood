import { AdminBulkImport } from "@/components/admin-bulk-import";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function AdminImportPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminBulkImport />
      </ProductAccessGuard>
    </SiteShell>
  );
}
