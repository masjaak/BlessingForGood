import { Card, Skeleton, SkeletonTable, SkeletonText } from "@/components/ui";

export function SkeletonMetric({ className = "" }: { className?: string }) {
  return (
    <Card frame="summary" className={`workspace-skeleton-metric ${className}`.trim()} aria-hidden="true">
      <SkeletonText width="42%" />
      <Skeleton className="skeleton-metric-value" />
      <SkeletonText width="76%" />
    </Card>
  );
}

export function SkeletonPanel({
  className = "",
  lines = 4,
  region,
}: {
  className?: string;
  lines?: number;
  region?: string;
}) {
  return (
    <Card
      frame="operational"
      className={`workspace-skeleton-panel ${className}`.trim()}
      data-skeleton-region={region}
      aria-hidden="true"
    >
      <SkeletonText width="34%" />
      {Array.from({ length: lines }, (_, index) => (
        <SkeletonText key={index} width={index === lines - 1 ? "58%" : index % 2 ? "82%" : "94%"} />
      ))}
    </Card>
  );
}

export function SkeletonToolbar() {
  return (
    <div className="workspace-skeleton-toolbar" aria-hidden="true">
      <Skeleton className="skeleton-field skeleton-field-wide" />
      <Skeleton className="skeleton-field" />
      <Skeleton className="skeleton-field" />
      <Skeleton className="skeleton-cta" />
    </div>
  );
}

export function SkeletonTableBlock() {
  return (
    <Card frame="table" className="workspace-skeleton-table-card" aria-hidden="true">
      <div className="workspace-skeleton-table-head">
        <SkeletonText width="24%" />
        <SkeletonText width="18%" />
        <SkeletonText width="16%" />
        <SkeletonText width="12%" />
      </div>
      <SkeletonTable rows={6} />
    </Card>
  );
}

export function SkeletonForm() {
  return (
    <Card frame="form" className="workspace-skeleton-form" aria-hidden="true">
      <SkeletonText width="38%" />
      <div className="workspace-skeleton-form-grid">
        {Array.from({ length: 6 }, (_, index) => (
          <Skeleton key={index} className="skeleton-field" />
        ))}
      </div>
      <Skeleton className="skeleton-cta" />
    </Card>
  );
}

export function SkeletonQueueCard() {
  return (
    <Card frame="attention" className="metric workspace-skeleton-queue-card" aria-hidden="true">
      <div className="split-heading">
        <SkeletonText className="skeleton-queue-label" width="58%" />
        <Skeleton className="skeleton-queue-status" />
      </div>
      <Skeleton className="metric-value skeleton-queue-value" />
      <p className="skeleton-queue-description">
        <SkeletonText width="92%" />
        <SkeletonText width="68%" />
      </p>
      <div className="skeleton-queue-action-slot">
        <Skeleton className="skeleton-queue-action" />
      </div>
    </Card>
  );
}

export function SkeletonListCard() {
  return (
    <Card frame="list" className="workspace-skeleton-list-card" aria-hidden="true">
      <div className="split-heading">
        <div>
          <SkeletonText width="42%" />
          <SkeletonText className="skeleton-list-title" width="72%" />
        </div>
        <Skeleton className="skeleton-status" />
      </div>
      <SkeletonText width="88%" />
      <SkeletonText width="62%" />
      <Skeleton className="skeleton-cta" />
    </Card>
  );
}

export function SkeletonSummaryGrid() {
  return (
    <Card frame="summary" className="admin-inventory-summary workspace-skeleton-summary-grid" aria-hidden="true">
      {Array.from({ length: 3 }, (_, index) => (
        <div className="workspace-skeleton-metric workspace-skeleton-summary-item" key={index}>
          <SkeletonText width={index === 0 ? "42%" : "52%"} />
          <Skeleton className="skeleton-metric-value" />
          <SkeletonText width="68%" />
        </div>
      ))}
    </Card>
  );
}

export function SkeletonDashboardSection({ secondary = false }: { secondary?: boolean }) {
  const cardCount = secondary ? 3 : 4;
  return (
    <section className="admin-dashboard-section" aria-hidden="true">
      <div className="admin-section-heading">
        <div className="skeleton-section-copy">
          <SkeletonText className="skeleton-section-kicker" width={secondary ? "112px" : "118px"} />
          <Skeleton className="skeleton-section-title" />
        </div>
        <SkeletonText className="skeleton-section-description" width={secondary ? "250px" : "286px"} />
      </div>
      <div className={`admin-queue-grid ${secondary ? "admin-queue-grid-secondary" : "admin-queue-grid-primary"}`}>
        {Array.from({ length: cardCount }, (_, index) => (
          <SkeletonQueueCard key={index} />
        ))}
      </div>
    </section>
  );
}
