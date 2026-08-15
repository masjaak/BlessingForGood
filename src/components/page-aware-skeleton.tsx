"use client";

import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin-nav";
import { adminConfig, customerConfig, skeletonName } from "@/components/page-aware-skeleton-config";
import type { AdminSkeletonKind, CustomerSkeletonKind, Workspace } from "@/components/page-aware-skeleton-config";
import { AdminSkeletonContent, CustomerSkeletonContent } from "@/components/workspace-skeleton-content";
import { PageHeader, Skeleton } from "@/components/ui";

export function PageAwareSkeleton({ workspace, pathname: pathnameProp }: { workspace: Workspace; pathname?: string }) {
  const routePathname = usePathname() || "/";
  const pathname = pathnameProp || routePathname;
  const config = workspace === "admin" ? adminConfig(pathname) : customerConfig(pathname);
  return (
    <div
      className={`${workspace === "admin" ? "admin-page " : ""}page workspace-skeleton ${workspace}-workspace-skeleton${config.narrow ? " narrow-page" : ""}`}
      data-skeleton={skeletonName(workspace, config.kind)}
      data-skeleton-layout={config.variant || config.kind}
      aria-busy="true"
      aria-label="Menyiapkan ruang kerja BFG"
    >
      {workspace === "admin" ? (
        <>
          <PageHeader
            eyebrow={config.eyebrow}
            title={config.title}
            description={config.description}
            actions={<Skeleton className="skeleton-cta" />}
          />
          <div className="admin-workspace">
            <AdminNav preview />
            <div className="admin-content admin-operational-content">
              <AdminSkeletonContent kind={config.kind as AdminSkeletonKind} variant={config.variant} />
            </div>
          </div>
        </>
      ) : (
        <>
          <PageHeader eyebrow={config.eyebrow} title={config.title} description={config.description} />
          <div className="customer-skeleton-content">
            <CustomerSkeletonContent kind={config.kind as CustomerSkeletonKind} variant={config.variant} />
          </div>
        </>
      )}
    </div>
  );
}
