"use client";

import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Card, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { orderStatusLabels } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminOverview() {
  const { state, previewDemo, dataSource } = usePrototype();
  const openCatalogs = state.catalogs.filter((catalog) => catalog.status === "open").length;

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operations prototype"
        title="A calm view of the work in motion."
        description={`This dashboard starts empty. Every count below comes from records created in ${dataSource === "convex" ? "the shared Convex Preview" : "this browser"}.`}
        actions={<LinkButton href="/admin/catalogs">Create a catalog</LinkButton>}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <div className="dashboard-grid">
            <Card className="metric">
              <span className="card-kicker">Catalogs</span>
              <strong className="metric-value">{state.catalogs.length}</strong>
              <p>{openCatalogs} currently open</p>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Orders</span>
              <strong className="metric-value">{state.orders.length}</strong>
              <p>Recorded preorders</p>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Next action</span>
              <strong className="metric-value">
                {state.orders.filter((order) => order.status === "submitted").length}
              </strong>
              <p>Orders needing review</p>
            </Card>
            <Card className="metric">
              <span className="card-kicker">Mode</span>
              <strong className="metric-value">{previewDemo ? "Preview" : "Dev"}</strong>
              <p>Explicit prototype boundary</p>
            </Card>
          </div>
          <div className="two-column">
            <Card>
              <div className="split-heading">
                <h2>Latest catalogs</h2>
                <LinkButton href="/admin/catalogs" variant="quiet">
                  Manage →
                </LinkButton>
              </div>
              {state.catalogs.length === 0 ? (
                <EmptyState
                  title="No catalogs yet"
                  description="Create the first empty-start catalog to unlock the customer flow."
                  action={
                    <LinkButton href="/admin/catalogs" variant="secondary">
                      Create catalog
                    </LinkButton>
                  }
                />
              ) : (
                <div className="content-stack">
                  {state.catalogs.slice(0, 4).map((catalog) => (
                    <div className="summary-line" key={catalog.id}>
                      <span>{catalog.name}</span>
                      <StatusBadge tone={catalog.status === "open" ? "positive" : "neutral"}>
                        {catalog.status === "open" ? "Open" : "Closed"}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
            <Card>
              <div className="split-heading">
                <h2>Latest orders</h2>
                <LinkButton href="/admin/orders" variant="quiet">
                  Review →
                </LinkButton>
              </div>
              {state.orders.length === 0 ? (
                <EmptyState
                  title="No orders yet"
                  description="Customer orders will appear here after a catalog is unlocked and submitted."
                />
              ) : (
                <div className="content-stack">
                  {state.orders.slice(0, 4).map((order) => (
                    <div className="summary-line" key={order.id}>
                      <span>{order.customerName}</span>
                      <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminOverview />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
