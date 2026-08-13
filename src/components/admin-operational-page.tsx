"use client";

import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PageHeader } from "@/components/ui";

export function AdminOperationalPage({
  eyebrow,
  title,
  description,
  actions,
  children,
}: {
  eyebrow: string;
  title: string;
  description: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="page admin-page admin-operational-page">
      <PageHeader eyebrow={eyebrow} title={title} description={description} actions={actions} />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content admin-operational-content">{children}</div>
      </div>
    </div>
  );
}
