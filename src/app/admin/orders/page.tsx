"use client";

import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { nextOrderStatuses, orderStatusLabels } from "@/domain/prototype/logic";
import type { OrderStatus } from "@/domain/prototype/types";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function OrderTable() {
  const { state, updateOrderStatus, dataSource } = usePrototype();
  if (state.orders.length === 0)
    return (
      <EmptyState
        title="No orders to review"
        description="Submit a customer preorder from the catalog preview, then it will appear here with a price snapshot."
        action={
          <LinkButton href="/catalog" variant="secondary">
            Open customer preview
          </LinkButton>
        }
      />
    );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">Prototype orders</caption>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Items</th>
            <th>Total</th>
            <th>Stage</th>
            <th>Next action</th>
          </tr>
        </thead>
        <tbody>
          {state.orders.map((order) => {
            const statuses: OrderStatus[] =
              dataSource === "convex"
                ? order.status === "submitted"
                  ? ["cancelled", "completed"]
                  : []
                : nextOrderStatuses(order.status);
            return (
              <tr key={order.id}>
                <td>
                  <strong>{order.customerName}</strong>
                  <br />
                  <span className="subtle">{order.customerEmail || "No email"}</span>
                  <br />
                  <span className="subtle">{order.id}</span>
                  <br />
                  <LinkButton href={`/admin/orders/${order.id}`} variant="secondary">
                    Operations detail
                  </LinkButton>
                </td>
                <td>
                  {order.items.map((item) => (
                    <div key={item.id}>
                      {item.quantity} × {item.bookTitle} ({item.format})
                    </div>
                  ))}
                </td>
                <td>
                  <Money amount={order.total} />
                </td>
                <td>
                  <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
                  <br />
                  <span className="subtle">Updated {new Date(order.updatedAt).toLocaleString("en-GB")}</span>
                </td>
                <td>
                  {statuses.length ? (
                    <select
                      className="select"
                      aria-label={`Update status for ${order.id}`}
                      defaultValue=""
                      onChange={(event) => {
                        const next = event.target.value as OrderStatus;
                        if (next) void updateOrderStatus(order.id, next);
                      }}
                    >
                      <option value="">Choose stage…</option>
                      {statuses.map((status) => (
                        <option value={status} key={status}>
                          {orderStatusLabels[status]}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="subtle">No next stage</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function OrderTimeline({ orderId }: { orderId: string }) {
  const { state } = usePrototype();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  if (!order) return null;
  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">Selected order</span>
          <h2>{order.customerName}</h2>
        </div>
        <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
      </div>
      <div className="content-stack">
        {order.items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.bookTitle} · {item.format}
            </span>
            <Money amount={item.subtotal} />
          </div>
        ))}
      </div>
      <ul className="timeline">
        {order.statusHistory.map((event) => (
          <li key={`${event.status}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{orderStatusLabels[event.status]}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

function AdminOrders() {
  const { state } = usePrototype();
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Order operations"
        title="See the preorder, then move its stage."
        description="Status transitions are explicit and recorded with timestamps. This prototype has no live customer or payment service behind it."
        actions={<span className="button button-secondary">{state.orders.length} recorded</span>}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <OrderTable />
          {state.orders[0] ? <OrderTimeline orderId={state.orders[0].id} /> : null}
        </div>
      </div>
    </div>
  );
}

export default function AdminOrdersPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminOrders />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
