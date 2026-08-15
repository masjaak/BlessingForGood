"use client";

import type { ReactNode } from "react";
import { AdminNav } from "@/components/admin-nav";
import { AdminShell, AdminShellContext } from "@/components/site-shell";

export function AdminLayoutShell({ children }: { children: ReactNode }) {
  return (
    <AdminShellContext.Provider value>
      <AdminShell>
        <div className="admin-layout-workspace">
          <AdminNav persistent />
          <div className="admin-layout-route">{children}</div>
        </div>
      </AdminShell>
    </AdminShellContext.Provider>
  );
}
