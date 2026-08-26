import { BackButton } from "@/components/back-button";
import { SecretCatalogBookDetail } from "@/components/secret-catalog-book-detail";
import { SiteShell } from "@/components/site-shell";

export default function SecretCatalogBookDetailPage() {
  return (
    <SiteShell>
      <div className="page">
        <BackButton fallback="/catalog" />
        <SecretCatalogBookDetail />
      </div>
    </SiteShell>
  );
}
