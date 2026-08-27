"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";

const roleLabels = { owner: "Pemilik", admin: "Admin", customer: "Pelanggan" } as const;
const userStatusLabels = {
  active: "Aktif",
  suspended: "Ditangguhkan",
  removed: "Dihapus",
  pending: "Menunggu",
} as const;

function UserManagement() {
  const [role, setRole] = useState<"owner" | "admin" | "customer" | undefined>();
  const [status, setStatus] = useState<"active" | "suspended" | "removed" | undefined>();
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
      setMessage("Pengguna diperbarui.");
    } catch {
      setMessage("Perubahan pengguna ditolak.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Keamanan Owner"
        title="Kelola pengguna BFG"
        description="Perubahan role dan penangguhan ditegakkan oleh Convex."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content content-stack">
          <Card>
            <span className="card-kicker">Penyiapan Admin</span>
            <h2>Praotorisasi email staf</h2>
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
              <Button loading={pendingAction === "invite"} loadingLabel="Membuat…">
                Buat undangan
              </Button>
            </form>
            {invitations?.map((invitation) => (
              <div className="summary-line" key={invitation.invitationId}>
                <span>
                  {invitation.email} · {roleLabels[invitation.role as keyof typeof roleLabels] || invitation.role}
                </span>
                <span className="form-actions">
                  <span className="status-badge">
                    {userStatusLabels[invitation.status as keyof typeof userStatusLabels] || invitation.status}
                  </span>
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
                      Cabut
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </Card>
          <Card className="form-actions">
            <label className="field">
              <span className="field-label">Peran</span>
              <BFGSelect
                className="select"
                value={role || ""}
                onChange={(event) => setRole((event.target.value || undefined) as typeof role)}
              >
                <option value="">Semua</option>
                <option value="owner">Pemilik</option>
                <option value="admin">Admin</option>
                <option value="customer">Pelanggan</option>
              </BFGSelect>
            </label>
            <label className="field">
              <span className="field-label">Status</span>
              <BFGSelect
                className="select"
                value={status || ""}
                onChange={(event) => setStatus((event.target.value || undefined) as typeof status)}
              >
                <option value="">Semua</option>
                <option value="active">Aktif</option>
                <option value="suspended">Ditangguhkan</option>
                <option value="removed">Dihapus</option>
              </BFGSelect>
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
                  <span className="card-kicker">{roleLabels[user.role as keyof typeof roleLabels] || user.role}</span>
                  <h2>{user.displayNameSnapshot || "Pengguna BFG"}</h2>
                  <p className="subtle">{user.emailSnapshot || "Tidak ada email tersimpan"}</p>
                </div>
                <span className="status-badge">
                  {userStatusLabels[user.status as keyof typeof userStatusLabels] || user.status}
                </span>
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
                    loading={pendingAction === `role:${user.appUserId}`}
                    loadingLabel="Memperbarui…"
                  >
                    {user.role === "admin" ? "Turunkan ke pelanggan" : "Jadikan Admin"}
                  </Button>
                  {user.status === "active" ? (
                    <Button
                      variant="danger"
                      loading={pendingAction === `suspend:${user.appUserId}`}
                      loadingLabel="Menangguhkan…"
                      onClick={() =>
                        void run(suspend({ userId: user.appUserId as Id<"appUsers"> }), `suspend:${user.appUserId}`)
                      }
                    >
                      Tangguhkan
                    </Button>
                  ) : user.status === "suspended" ? (
                    <Button
                      loading={pendingAction === `reactivate:${user.appUserId}`}
                      loadingLabel="Mengaktifkan…"
                      onClick={() =>
                        void run(
                          reactivate({ userId: user.appUserId as Id<"appUsers"> }),
                          `reactivate:${user.appUserId}`,
                        )
                      }
                    >
                      Aktifkan kembali
                    </Button>
                  ) : null}
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
