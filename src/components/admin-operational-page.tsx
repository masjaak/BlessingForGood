"use client";

import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PageHeader, type PageHeaderSkeleton } from "@/components/ui";

export function AdminOperationalPage({
  eyebrow,
  title,
  description,
  actions,
  loading = false,
  skeleton,
  className = "",
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: string;
  actions?: ReactNode;
  loading?: boolean;
  skeleton?: PageHeaderSkeleton;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div className={`page admin-page admin-operational-page ${className}`.trim()}>
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        actions={actions}
        loading={loading}
        skeleton={skeleton}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content admin-operational-content">{children}</div>
      </div>
    </div>
  );
}
