"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, PageHeader } from "@/components/ui";

function UserManagement() {
  const [role, setRole] = useState<"owner" | "admin" | "customer" | undefined>();
  const [status, setStatus] = useState<"active" | "suspended" | undefined>();
  const users = useQuery(api.users.list, { role, status, paginationOpts: { numItems: 100, cursor: null } });
  const updateRole = useMutation(api.users.updateRole);
  const suspend = useMutation(api.users.suspend);
  const reactivate = useMutation(api.users.reactivate);
  const [message, setMessage] = useState("");

  async function run(action: Promise<unknown>) {
    setMessage("");
    try {
      await action;
      setMessage("User updated.");
    } catch {
      setMessage("User update denied.");
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Owner security"
        title="Manage BFG users"
        description="Role and suspension changes are enforced by Convex."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content content-stack">
          <Card className="form-actions">
            <label className="field">
              <span className="field-label">Role</span>
              <select
                className="select"
                value={role || ""}
                onChange={(event) => setRole((event.target.value || undefined) as typeof role)}
              >
                <option value="">All</option>
                <option value="owner">Owner</option>
                <option value="admin">Admin</option>
                <option value="customer">Customer</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <select
                className="select"
                value={status || ""}
                onChange={(event) => setStatus((event.target.value || undefined) as typeof status)}
              >
                <option value="">All</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
            </label>
          </Card>
          {message ? (
            <p className="subtle" role="status">
              {message}
            </p>
          ) : null}
          {users?.page.map((user) => (
            <Card key={user.appUserId}>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">{user.role}</span>
                  <h2>{user.displayNameSnapshot || "BFG user"}</h2>
                  <p className="subtle">{user.emailSnapshot || "No email snapshot"}</p>
                </div>
                <span className="status-badge">{user.status}</span>
              </div>
              {user.role !== "owner" ? (
                <div className="form-actions">
                  <Button
                    variant="secondary"
                    onClick={() =>
                      void run(
                        updateRole({
                          userId: user.appUserId as Id<"appUsers">,
                          role: user.role === "admin" ? "customer" : "admin",
                        }),
                      )
                    }
                  >
                    {user.role === "admin" ? "Demote to customer" : "Promote to admin"}
                  </Button>
                  {user.status === "active" ? (
                    <Button
                      variant="danger"
                      onClick={() => void run(suspend({ userId: user.appUserId as Id<"appUsers"> }))}
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button onClick={() => void run(reactivate({ userId: user.appUserId as Id<"appUsers"> }))}>
                      Reactivate
                    </Button>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
          {users === undefined ? <div className="state-panel">Loading users…</div> : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminUsersPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="owner">
        <UserManagement />
      </ProductAccessGuard>
    </SiteShell>
  );
}
