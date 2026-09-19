"use client";

import type { ReactNode } from "react";
import { AdminNav, AdminNavSkeleton } from "@/components/admin-nav";
import { AdminShell, AdminShellContext, isAdminShellBootstrapLoading } from "@/components/site-shell";
import { ProductContext } from "@/domain/prototype/context";
import { useContext } from "react";

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  const product = useContext(ProductContext);
  const shellLoading = isAdminShellBootstrapLoading(product);
  return (
    <AdminShellContext.Provider value>
      <AdminShell>
        <div className="admin-layout-workspace">
          {shellLoading ? <AdminNavSkeleton /> : <AdminNav persistent />}
          <div className="admin-layout-route">{children}</div>
        </div>
      </AdminShell>
    </AdminShellContext.Provider>
  );
}
