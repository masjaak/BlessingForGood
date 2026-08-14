"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";

function UserManagement() {
  const [role, setRole] = useState<"owner" | "admin" | "customer" | undefined>();
  const [status, setStatus] = useState<"active" | "suspended" | undefined>();
  const users = useQuery(api.users.list, { role, status, paginationOpts: { numItems: 100, cursor: null } });
  const invitations = useQuery(api.users.listStaffInvitations, {});
  const updateRole = useMutation(api.users.updateRole);
  const suspend = useMutation(api.users.suspend);
  const reactivate = useMutation(api.users.reactivate);
  const inviteStaff = useMutation(api.users.inviteStaff);
  const revokeStaffInvitation = useMutation(api.users.revokeStaffInvitation);
  const [staffEmail, setStaffEmail] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  async function run(action: Promise<unknown>, actionId: string) {
    setMessage("");
    setPendingAction(actionId);
    try {
      await action;
      setMessage("User updated.");
    } catch {
      setMessage("User update denied.");
    } finally {
      setPendingAction(null);
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
          <Card>
            <span className="card-kicker">Admin onboarding</span>
            <h2>Pre-authorize staff email</h2>
            <p className="subtle">
              Bagikan link masuk BFG secara manual. Saat email yang sama masuk lewat Clerk, role Admin diklaim otomatis;
              tidak ada password atau token yang disimpan BFG.
            </p>
            <form
              className="form-actions"
              onSubmit={(event) => {
                event.preventDefault();
                void run(
                  inviteStaff({ email: staffEmail }).then(() => setStaffEmail("")),
                  "invite",
                );
              }}
            >
              <Field label="Email Admin">
                <input
                  className="input"
                  type="email"
                  value={staffEmail}
                  onChange={(event) => setStaffEmail(event.target.value)}
                  required
                />
              </Field>
              <Button pending={pendingAction === "invite"} pendingLabel="Membuat…">
                Buat invitation
              </Button>
            </form>
            {invitations?.map((invitation) => (
              <div className="summary-line" key={invitation.invitationId}>
                <span>
                  {invitation.email} · {invitation.role}
                </span>
                <span className="form-actions">
                  <span className="status-badge">{invitation.status}</span>
                  {invitation.status === "pending" ? (
                    <Button
                      variant="danger"
                      onClick={() =>
                        void run(
                          revokeStaffInvitation({ invitationId: invitation.invitationId as Id<"staffInvitations"> }),
                          `revoke:${invitation.invitationId}`,
                        )
                      }
                    >
                      Revoke
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </Card>
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
                        `role:${user.appUserId}`,
                      )
                    }
                    pending={pendingAction === `role:${user.appUserId}`}
                    pendingLabel="Updating…"
                  >
                    {user.role === "admin" ? "Demote to customer" : "Promote to admin"}
                  </Button>
                  {user.status === "active" ? (
                    <Button
                      variant="danger"
                      pending={pendingAction === `suspend:${user.appUserId}`}
                      pendingLabel="Suspending…"
                      onClick={() =>
                        void run(suspend({ userId: user.appUserId as Id<"appUsers"> }), `suspend:${user.appUserId}`)
                      }
                    >
                      Suspend
                    </Button>
                  ) : (
                    <Button
                      pending={pendingAction === `reactivate:${user.appUserId}`}
                      pendingLabel="Reactivating…"
                      onClick={() =>
                        void run(
                          reactivate({ userId: user.appUserId as Id<"appUsers"> }),
                          `reactivate:${user.appUserId}`,
                        )
                      }
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              ) : null}
            </Card>
          ))}
          {users === undefined ? (
            <LoadingRegion label="Memuat pengguna">
              <SkeletonCard />
              <SkeletonCard />
            </LoadingRegion>
          ) : null}
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
