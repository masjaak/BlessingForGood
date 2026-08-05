import { CustomerCatalog } from "@/components/customer-catalog";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

export default function CatalogPage() {
  return (
    <SiteShell>
      <div className="page">
        <PrototypeModeGuard>
          <CustomerCatalog />
        </PrototypeModeGuard>
      </div>
    </SiteShell>
  );
}
