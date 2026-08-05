"use client";

import { useState } from "react";
import { Button, Card, EmptyState, Field, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { isCatalogOpen, orderStatusLabels } from "@/domain/prototype/logic";
import { usePrototype } from "@/domain/prototype/store";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";

function EditOrderForm({ orderId }: { orderId: string }) {
  const { state, editOrder } = usePrototype();
  const order = state.orders.find((candidate) => candidate.id === orderId);
  const catalog = order && state.catalogs.find((candidate) => candidate.id === order.catalogId);
  const [name, setName] = useState(order?.customerName || "");
  const [email, setEmail] = useState(order?.customerEmail || "");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    Object.fromEntries(order?.items.map((item) => [item.variantId, item.quantity]) || []),
  );
  const [message, setMessage] = useState("");
  if (!order || !catalog || order.status !== "submitted" || !isCatalogOpen(catalog))
    return <p className="subtle">This preorder is locked after submission stage or catalog close.</p>;
  const editableOrder = order;

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      const updated = await editOrder(editableOrder.id, {
        customerName: name,
        customerEmail: email,
        items: editableOrder.items.map((item) => ({
          variantId: item.variantId,
          quantity: quantities[item.variantId] || 0,
        })),
      });
      setMessage(`Updated ${updated.id}.`);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Preorder could not be edited");
    }
  }

  return (
    <details className="edit-order">
      <summary>Edit before catalog close</summary>
      <form className="form-card" onSubmit={handleSubmit}>
        <Field label="Name">
          <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
        </Field>
        <Field label="Email">
          <input className="input" type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </Field>
        {order.items.map((item) => (
          <Field label={`${item.bookTitle} · ${item.format}`} key={item.id}>
            <input
              className="input"
              type="number"
              min="0"
              step="1"
              value={quantities[item.variantId] || 0}
              onChange={(event) =>
                setQuantities((current) => ({ ...current, [item.variantId]: Number(event.target.value) }))
              }
            />
          </Field>
        ))}
        <Button type="submit">Save preorder changes</Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </form>
    </details>
  );
}

function CustomerOrders() {
  const { state, dataSource } = usePrototype();
  return (
    <div className="page narrow-page">
      <PageHeader
        eyebrow="Order status"
        title="Keep the next step close."
        description={`This account foundation shows orders recorded in ${dataSource === "convex" ? "Convex Preview" : "the local prototype"}. Production account ownership is not enabled yet.`}
        actions={
          <LinkButton href="/catalog" variant="secondary">
            Back to catalog
          </LinkButton>
        }
      />
      {state.orders.length === 0 ? (
        <EmptyState
          title="No orders yet"
          description="Once a preorder is recorded, its stage and price snapshot will stay visible here."
          action={<LinkButton href="/catalog">Browse a catalog</LinkButton>}
        />
      ) : (
        <div className="content-stack">
          {state.orders.map((order) => (
            <Card key={order.id}>
              <div className="split-heading">
                <div>
                  <span className="card-kicker">{order.id}</span>
                  <h2>{order.items[0]?.bookTitle || "Order"}</h2>
                </div>
                <StatusBadge>{orderStatusLabels[order.status]}</StatusBadge>
              </div>
              <div className="summary-line">
                <span>
                  {order.customerName} · {order.items.reduce((total, item) => total + item.quantity, 0)} items
                </span>
                <Money amount={order.total} />
              </div>
              <EditOrderForm orderId={order.id} />
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
              <p className="subtle">WhatsApp remains the communication handoff; the website is the order record.</p>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CustomerOrdersPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard>
        <CustomerOrders />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
