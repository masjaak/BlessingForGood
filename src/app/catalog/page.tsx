import { CustomerCatalog } from "@/components/customer-catalog";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function CatalogPage() {
  return (
    <SiteShell>
      <div className="page">
        <ProductAccessGuard>
          <CustomerCatalog />
        </ProductAccessGuard>
      </div>
    </SiteShell>
  );
}
