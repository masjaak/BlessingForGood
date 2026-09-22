import { Card, LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";
import { SkeletonMetric, SkeletonTableBlock } from "@/components/workspace-skeleton-primitives";

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
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
        <SkeletonMetric />
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
