"use client";

import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { nextOrderStatuses, orderStatusLabels } from "@/domain/prototype/logic";
import type { OrderStatus } from "@/domain/prototype/types";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function OrderTable() {
  const { state, updateOrderStatus, dataSource } = useProduct();
  if (state.orders.length === 0)
    return (
      <EmptyState
        title="No orders to review"
        description="Pesanan customer akan tampil di sini bersama snapshot harga dan item saat dibuat."
        action={
          <LinkButton href="/catalog" variant="secondary">
            Lihat sisi customer
          </LinkButton>
        }
      />
    );
  return (
    <div className="table-wrap">
      <table className="data-table">
        <caption className="sr-only">Daftar pesanan</caption>
        <thead>
          <tr>
            <th>Customer</th>
            <th>Source</th>
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
                  ? ["completed"]
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
                <td>{order.source === "admin_assisted" ? "Admin-assisted" : "Customer self-service"}</td>
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

function ConvexAssistedOrderForm() {
  const { state } = useProduct();
  const customers = useQuery(api.orders.listEligibleCustomers, {});
  const createAssisted = useMutation(api.orders.createAssisted);
  const [customerId, setCustomerId] = useState("");
  const [catalogId, setCatalogId] = useState("");
  const [variantId, setVariantId] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submissionKeyRef = useRef<string | null>(null);
  const catalogs = state.catalogs.filter((candidate) => candidate.status === "open");
  const catalog = catalogs.find((candidate) => candidate.id === catalogId);
  const variants =
    catalog?.books.flatMap((book) => book.variants.map((variant) => ({ ...variant, bookTitle: book.title }))) || [];
  const selectedVariant = variants.find((variant) => variant.id === variantId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    setMessage("");
    setSubmitting(true);
    try {
      const submissionKey = submissionKeyRef.current || crypto.randomUUID();
      submissionKeyRef.current = submissionKey;
      await createAssisted({
        customerUserId: customerId as Id<"appUsers">,
        catalogId: catalogId as Id<"secretCatalogs">,
        submissionKey,
        items: [{ variantId: variantId as Id<"bookVariants">, quantity: Number(quantity) }],
      });
      setCustomerId("");
      setCatalogId("");
      setVariantId("");
      setQuantity("1");
      submissionKeyRef.current = null;
      setMessage("Admin-assisted order recorded in the canonical order pipeline.");
    } catch {
      setMessage("Assisted order could not be recorded.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card>
      <span className="card-kicker">Manual customer operation</span>
      <h2>Record an assisted order</h2>
      <p className="subtle">
        Choose an existing active BFG customer. The server derives the customer snapshot and price.
      </p>
      {customers === undefined ? <div className="state-panel">Loading eligible customers…</div> : null}
      {customers && customers.length > 0 && catalogs.length > 0 ? (
        <form className="form-card" onSubmit={submit}>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Customer</span>
              <select
                className="select"
                value={customerId}
                onChange={(event) => setCustomerId(event.target.value)}
                required
              >
                <option value="">Choose customer…</option>
                {customers.map((customer) => (
                  <option value={customer.customerUserId} key={customer.customerUserId}>
                    {customer.displayName}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Catalog</span>
              <select
                className="select"
                value={catalogId}
                onChange={(event) => {
                  setCatalogId(event.target.value);
                  setVariantId("");
                }}
                required
              >
                <option value="">Choose open catalog…</option>
                {catalogs.map((catalogOption) => (
                  <option value={catalogOption.id} key={catalogOption.id}>
                    {catalogOption.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="form-grid">
            <label className="field">
              <span className="field-label">Book / variant</span>
              <select
                className="select"
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                required
              >
                <option value="">Choose variant…</option>
                {variants.map((variant) => (
                  <option value={variant.id} key={variant.id}>
                    {variant.bookTitle} · {variant.format} · {variant.isbn}
                  </option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Quantity</span>
              <input
                className="input"
                type="number"
                min="1"
                max="1000"
                step="1"
                value={quantity}
                onChange={(event) => setQuantity(event.target.value)}
                required
              />
            </label>
          </div>
          <div className="form-actions">
            <span className="subtle">
              Server price:{" "}
              {selectedVariant ? `IDR ${selectedVariant.price.toLocaleString("id-ID")}` : "choose a variant"}
            </span>
            <Button type="submit" disabled={submitting}>
              {submitting ? "Recording…" : "Record assisted order"}
            </Button>
          </div>
          {message ? (
            <span className="subtle" role="status">
              {message}
            </span>
          ) : null}
        </form>
      ) : customers !== undefined ? (
        <p className="subtle">An active customer and an open catalog are required.</p>
      ) : null}
    </Card>
  );
}

function OrderTimeline({ orderId }: { orderId: string }) {
  const { state } = useProduct();
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
  const { state, dataSource } = useProduct();
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Order operations"
        title="See the preorder, then move its stage."
        description="Status transitions, assisted orders, and batch links use the existing canonical Convex order pipeline."
        actions={<span className="button button-secondary">{state.orders.length} recorded</span>}
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {dataSource === "convex" ? <ConvexAssistedOrderForm /> : null}
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
      <ProductAccessGuard requiredRole="admin">
        <AdminOrders />
      </ProductAccessGuard>
    </SiteShell>
  );
}
