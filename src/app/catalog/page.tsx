import { CustomerCatalog } from "@/components/customer-catalog";
import { BackButton } from "@/components/back-button";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";

export default function CatalogPage() {
  return (
    <SiteShell>
      <div className="page">
        <BackButton fallback="/" />
        <ProductAccessGuard>
          <CustomerCatalog />
        </ProductAccessGuard>
      </div>
    </SiteShell>
  );
}
