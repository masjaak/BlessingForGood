import { Card, LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";
import { SkeletonTableBlock } from "@/components/workspace-skeleton-primitives";

function AnalyticsSkeletonMetric() {
  return (
    <Card frame="summary" className="workspace-skeleton-metric analytics-skeleton-metric" aria-hidden="true">
      <SkeletonText width="42%" />
      <Skeleton className="skeleton-metric-value" />
      <SkeletonText width="76%" />
      <Skeleton className="analytics-skeleton-trend" />
    </Card>
  );
}

export function AnalyticsSkeleton() {
  return (
    <LoadingRegion label="Memuat analytics">
      <Card className="admin-book-filters" aria-hidden="true">
        <div className="field">
          <SkeletonText width="28%" />
          <Skeleton className="skeleton-field" />
        </div>
      </Card>
      <div className="account-metrics" aria-hidden="true">
        <AnalyticsSkeletonMetric />
        <AnalyticsSkeletonMetric />
        <AnalyticsSkeletonMetric />
        <AnalyticsSkeletonMetric />
      </div>
      <section className="admin-dashboard-section" aria-hidden="true">
        <SkeletonText width="34%" />
        <SkeletonTableBlock rows={6} columnWidths={["1.8fr", "0.8fr", "0.8fr", "0.9fr", "0.8fr"]} />
      </section>
      <section className="admin-dashboard-section" aria-hidden="true">
        <SkeletonText width="28%" />
        <SkeletonTableBlock rows={5} columnWidths={["1.5fr", "1fr", "1.1fr", "0.8fr", "1fr"]} />
      </section>
    </LoadingRegion>
  );
}
