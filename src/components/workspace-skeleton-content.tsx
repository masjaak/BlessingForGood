import { Card, Skeleton, SkeletonText } from "@/components/ui";
import type { AdminSkeletonKind, CustomerSkeletonKind, SkeletonVariant } from "@/components/page-aware-skeleton-config";
import {
  SkeletonDashboardSection,
  SkeletonForm,
  SkeletonListCard,
  SkeletonMetric,
  SkeletonPanel,
  SkeletonSummaryGrid,
  SkeletonTableBlock,
  SkeletonToolbar,
} from "@/components/workspace-skeleton-primitives";

export function AdminSkeletonContent({ kind, variant }: { kind: AdminSkeletonKind; variant?: SkeletonVariant }) {
  if (kind === "dashboard") {
    return (
      <>
        <SkeletonDashboardSection />
        <SkeletonDashboardSection secondary />
        <Card className="workspace-skeleton-quick-actions" aria-hidden="true">
          <div className="split-heading">
            <div className="skeleton-section-copy">
              <SkeletonText className="skeleton-section-kicker" width="92px" />
              <Skeleton className="skeleton-section-title" />
            </div>
          </div>
          <div className="actions admin-quick-actions">
            {Array.from({ length: 5 }, (_, index) => (
              <Skeleton className="skeleton-quick-action" key={index} />
            ))}
          </div>
        </Card>
      </>
    );
  }
  if (variant === "ready-stock")
    return (
      <>
        <SkeletonSummaryGrid />
        <SkeletonTableBlock />
      </>
    );
  if (variant === "book-master")
    return (
      <>
        <Card className="workspace-skeleton-book-create" aria-hidden="true">
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-publisher">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-cta" />
          </div>
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-book">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-cta" />
          </div>
        </Card>
        <Card className="workspace-skeleton-book-publisher" aria-hidden="true">
          <SkeletonText width="34%" />
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-master">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-cta" />
          </div>
        </Card>
        <Card className="workspace-skeleton-book-filters" aria-hidden="true">
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-filters">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
          </div>
        </Card>
        <SkeletonTableBlock />
      </>
    );
  if (variant === "catalog-list")
    return (
      <div className="workspace-skeleton-two-column">
        <SkeletonForm />
        <div className="workspace-skeleton-card-list">
          <SkeletonListCard />
          <SkeletonListCard />
        </div>
      </div>
    );
  if (variant === "users")
    return (
      <>
        <Card className="workspace-skeleton-users-onboarding" aria-hidden="true">
          <SkeletonText width="34%" />
          <SkeletonText width="78%" />
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-publisher">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-cta" />
          </div>
          <SkeletonText width="44%" />
        </Card>
        <Card className="workspace-skeleton-users-filters" aria-hidden="true">
          <div className="workspace-skeleton-inline-form workspace-skeleton-inline-form-filters">
            <Skeleton className="skeleton-field" />
            <Skeleton className="skeleton-field" />
          </div>
        </Card>
        <div className="workspace-skeleton-card-list">
          <SkeletonListCard />
          <SkeletonListCard />
          <SkeletonListCard />
        </div>
      </>
    );
  if (variant === "batch") {
    return (
      <>
        <SkeletonForm />
        <div className="workspace-skeleton-card-list">
          {Array.from({ length: 3 }, (_, index) => (
            <SkeletonListCard key={index} />
          ))}
        </div>
      </>
    );
  }
  if (variant === "orders") {
    return (
      <>
        <SkeletonForm />
        <SkeletonTableBlock />
        <SkeletonPanel lines={6} />
      </>
    );
  }
  if (variant === "card-list" || variant === "financial-list") {
    return (
      <div className="workspace-skeleton-card-list">
        {Array.from({ length: 3 }, (_, index) => (
          <SkeletonListCard key={index} />
        ))}
      </div>
    );
  }
  if (variant === "report") {
    return (
      <>
        <SkeletonToolbar />
        <SkeletonSummaryGrid />
        <div className="workspace-skeleton-two-column">
          <SkeletonPanel lines={6} />
          <SkeletonPanel lines={6} />
        </div>
      </>
    );
  }
  if (kind === "table-queue")
    return (
      <>
        <SkeletonToolbar />
        <SkeletonTableBlock />
      </>
    );
  if (kind === "form-list") {
    return (
      <>
        <div className="workspace-skeleton-two-column">
          <SkeletonForm />
          <SkeletonPanel lines={6} />
        </div>
        <SkeletonTableBlock />
      </>
    );
  }
  if (kind === "detail") {
    return (
      <>
        <Card className="workspace-skeleton-detail-summary" aria-hidden="true">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonPanel key={index} lines={2} />
          ))}
        </Card>
        <div className="workspace-skeleton-two-column">
          <SkeletonPanel lines={7} />
          <SkeletonPanel lines={7} />
        </div>
      </>
    );
  }
  if (kind === "finance") {
    return (
      <>
        <div className="workspace-skeleton-metric-grid workspace-skeleton-metric-grid-finance">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
        <div className="workspace-skeleton-two-column workspace-skeleton-finance-grid">
          <SkeletonTableBlock />
          <SkeletonPanel lines={7} />
        </div>
      </>
    );
  }
  return (
    <>
      <div className="workspace-skeleton-settings-grid">
        <SkeletonForm />
        <SkeletonForm />
        <SkeletonPanel lines={5} />
        <SkeletonPanel lines={5} />
      </div>
      <SkeletonPanel lines={4} />
    </>
  );
}

export function CustomerSkeletonContent({ kind, variant }: { kind: CustomerSkeletonKind; variant?: SkeletonVariant }) {
  if (kind === "dashboard") {
    return (
      <>
        <div className="account-metrics workspace-skeleton-customer-metrics">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonMetric key={index} />
          ))}
        </div>
        <div className="account-dashboard-grid workspace-skeleton-customer-dashboard-grid">
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={2} region="batch" />
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={5} region="orders" />
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={3} region="invoices" />
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={3} region="exceptions" />
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={5} region="activity" />
          <SkeletonPanel className="workspace-skeleton-customer-dashboard-panel" lines={3} region="settings" />
        </div>
      </>
    );
  }
  if (variant === "customer-card-list") {
    return (
      <div className="workspace-skeleton-card-list">
        {Array.from({ length: 4 }, (_, index) => (
          <SkeletonListCard key={index} />
        ))}
      </div>
    );
  }
  if (variant === "deposit") {
    return (
      <div className="workspace-skeleton-two-column workspace-skeleton-deposit-grid">
        <div className="workspace-skeleton-card-list">
          <SkeletonPanel lines={3} />
          <SkeletonPanel lines={5} />
        </div>
        <div className="workspace-skeleton-card-list">
          <SkeletonForm />
          <SkeletonPanel lines={5} />
        </div>
      </div>
    );
  }
  if (kind === "list") {
    return (
      <>
        <SkeletonToolbar />
        <div className="workspace-skeleton-customer-list">
          {Array.from({ length: 4 }, (_, index) => (
            <Card className="workspace-skeleton-customer-row" aria-hidden="true" key={index}>
              <Skeleton className="skeleton-cover-small" />
              <div>
                <SkeletonText width="72%" />
                <SkeletonText width="48%" />
                <SkeletonText width="62%" />
              </div>
              <Skeleton className="skeleton-status" />
            </Card>
          ))}
        </div>
      </>
    );
  }
  if (kind === "detail")
    return (
      <>
        <SkeletonPanel lines={5} />
        <SkeletonPanel lines={7} />
        <SkeletonPanel lines={3} />
      </>
    );
  if (kind === "finance") {
    return (
      <>
        <SkeletonPanel className="workspace-skeleton-finance-hero" lines={4} />
        <SkeletonPanel lines={3} />
        <SkeletonPanel lines={5} />
      </>
    );
  }
  if (kind === "settings") return <SkeletonForm />;
  return (
    <div className="workspace-skeleton-customer-list">
      <SkeletonPanel lines={4} />
      <SkeletonPanel lines={4} />
    </div>
  );
}
