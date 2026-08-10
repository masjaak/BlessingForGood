"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { Button, Card, EmptyState, Field, LinkButton, Money, PageHeader, StatusBadge } from "@/components/ui";
import { usePrototype } from "@/domain/prototype/store";

type AdminException = Awaited<FunctionReturnType<typeof api.orderExceptions.listForAdmin>>[number];
type AdminOrdersPage = NonNullable<FunctionReturnType<typeof api.orders.listForAdmin>>;
type AdminOrder = AdminOrdersPage["page"][number];
type Resolution = "remove_item" | "deposit_release" | "refund_required" | "no_action";

const typeLabels = {
  out_of_stock: "Out of stock",
  defect: "Defect",
  customer_cancellation: "Customer cancellation",
  admin_cancellation: "Admin cancellation",
} as const;

const statusLabels = {
  opened: "Opened",
  under_review: "Under review",
  resolution_selected: "Resolution selected",
  resolved: "Resolved",
  rejected: "Rejected",
} as const;

const resolutionLabels: Record<Resolution, string> = {
  remove_item: "Remove affected quantity",
  deposit_release: "Release deposit allocations",
  refund_required: "Record refund obligation",
  no_action: "No action",
};

function tone(status: AdminException["status"]): "neutral" | "positive" | "warning" {
  if (status === "resolved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function OpenExceptionForm({ orders }: { orders: AdminOrder[] }) {
  const open = useMutation(api.orderExceptions.open);
  const [orderId, setOrderId] = useState("");
  const [itemId, setItemId] = useState("");
  const [type, setType] = useState<"out_of_stock" | "defect" | "admin_cancellation">("out_of_stock");
  const [quantity, setQuantity] = useState("1");
  const [reason, setReason] = useState("");
  const [customerNote, setCustomerNote] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [message, setMessage] = useState("");
  const selectedOrder = orders.find((order) => order.orderId === orderId);
  const selectedItem = selectedOrder?.items.find((item) => item._id === itemId);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await open({
        orderItemId: itemId as Id<"orderItems">,
        type,
        affectedQuantity: Number(quantity),
        reason,
        customerNote: customerNote || undefined,
        internalNote: internalNote || undefined,
      });
      setOrderId("");
      setItemId("");
      setReason("");
      setCustomerNote("");
      setInternalNote("");
      setMessage("Exception opened.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Exception could not be opened.");
    }
  }

  return (
    <Card>
      <span className="card-kicker">Admin operation</span>
      <h2>Open an exception</h2>
      <p className="subtle">The server validates quantity, ownership references, and active exception conflicts.</p>
      <form className="form-card" onSubmit={submit}>
        <div className="form-grid">
          <Field label="Type">
            <select className="select" value={type} onChange={(event) => setType(event.target.value as typeof type)}>
              <option value="out_of_stock">Out of stock</option>
              <option value="defect">Defect</option>
              <option value="admin_cancellation">Admin cancellation</option>
            </select>
          </Field>
          <Field label="Order">
            <select
              className="select"
              value={orderId}
              onChange={(event) => {
                setOrderId(event.target.value);
                setItemId("");
              }}
              required
            >
              <option value="">Choose order…</option>
              {orders.map((order) => (
                <option value={order.orderId} key={order.orderId}>
                  {order.customerName} · {order.orderId}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <div className="form-grid">
          <Field label="Item">
            <select className="select" value={itemId} onChange={(event) => setItemId(event.target.value)} required>
              <option value="">Choose item…</option>
              {selectedOrder?.items.map((item) => (
                <option value={item._id} key={item._id}>
                  {item.quantity} × {item.bookTitleSnapshot} · {item.formatSnapshot}
                </option>
              ))}
            </select>
          </Field>
          <Field
            label="Affected quantity"
            hint={selectedItem ? `Maximum in snapshot: ${selectedItem.quantity}` : undefined}
          >
            <input
              className="input"
              type="number"
              min="1"
              max={selectedItem?.quantity}
              step="1"
              value={quantity}
              onChange={(event) => setQuantity(event.target.value)}
              required
            />
          </Field>
        </div>
        <Field label="Reason">
          <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} required />
        </Field>
        <div className="form-grid">
          <Field label="Customer-facing note (optional)">
            <textarea
              className="textarea"
              value={customerNote}
              onChange={(event) => setCustomerNote(event.target.value)}
            />
          </Field>
          <Field label="Internal note (optional)">
            <textarea
              className="textarea"
              value={internalNote}
              onChange={(event) => setInternalNote(event.target.value)}
            />
          </Field>
        </div>
        <div className="form-actions">
          <Button type="submit">Open exception</Button>
          {message ? (
            <span className="subtle" role="status">
              {message}
            </span>
          ) : null}
        </div>
      </form>
    </Card>
  );
}

function ExceptionCard({ exception }: { exception: AdminException }) {
  const startReview = useMutation(api.orderExceptions.startReview);
  const selectResolution = useMutation(api.orderExceptions.selectResolution);
  const resolve = useMutation(api.orderExceptions.resolve);
  const reject = useMutation(api.orderExceptions.reject);
  const [resolution, setResolution] = useState<Resolution>("remove_item");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Exception operation failed.");
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">
            {typeLabels[exception.type]} · {exception.exceptionId}
          </span>
          <h2>{exception.item?.bookTitle || "Order item"}</h2>
          <p className="subtle">
            {exception.order?.customerName || "Unknown customer"} · {exception.orderId}
          </p>
        </div>
        <StatusBadge tone={tone(exception.status)}>{statusLabels[exception.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>Affected quantity</span>
        <strong>{exception.affectedQuantity}</strong>
      </div>
      <div className="summary-line">
        <span>Reason</span>
        <span>{exception.reason}</span>
      </div>
      {exception.reasonCode ? (
        <div className="summary-line">
          <span>Eligibility code</span>
          <span>{exception.reasonCode}</span>
        </div>
      ) : null}
      {exception.batchContext.length ? (
        <div className="summary-line">
          <span>Batch</span>
          <span>
            {exception.batchContext
              .map((batch) => `${batch.batchName} · ${batch.shipmentStage || "unlocked"}`)
              .join(", ")}
          </span>
        </div>
      ) : null}
      {exception.invoice ? (
        <div className="summary-line">
          <span>Invoice effect</span>
          <span>
            {exception.invoice.invoiceNumber} · {exception.invoice.adjustedTotalAmount.toLocaleString("id-ID")} IDR
            current
          </span>
        </div>
      ) : null}
      {exception.financialImpact ? (
        <div className="summary-line">
          <span>Financial consequence</span>
          <span>
            <Money
              amount={
                exception.financialImpact.invoiceAdjustmentAmount < 0
                  ? -exception.financialImpact.invoiceAdjustmentAmount
                  : exception.financialImpact.invoiceAdjustmentAmount
              }
            />{" "}
            adjustment · {exception.financialImpact.refundObligationStatus}
          </span>
        </div>
      ) : null}
      {exception.customerNote ? <p className="subtle">Customer note: {exception.customerNote}</p> : null}
      {exception.internalNote ? <p className="subtle">Internal note: {exception.internalNote}</p> : null}
      {exception.status === "opened" ? (
        <div className="form-actions">
          <Button
            type="button"
            onClick={() => void run(() => startReview({ exceptionId: exception.exceptionId }), "Review started.")}
          >
            Start review
          </Button>
        </div>
      ) : null}
      {exception.status === "under_review" ? (
        <div className="form-actions">
          <select
            className="select"
            value={resolution}
            onChange={(event) => setResolution(event.target.value as Resolution)}
          >
            {Object.entries(resolutionLabels).map(([value, label]) => (
              <option value={value} key={value}>
                {label}
              </option>
            ))}
          </select>
          <Button
            type="button"
            onClick={() =>
              void run(
                () => selectResolution({ exceptionId: exception.exceptionId, resolution }),
                "Resolution selected.",
              )
            }
          >
            Select resolution
          </Button>
        </div>
      ) : null}
      {exception.status === "resolution_selected" ? (
        <div className="form-actions">
          <span className="subtle">
            Selected: {exception.resolution ? resolutionLabels[exception.resolution] : "Unknown"}
          </span>
          <Button
            type="button"
            onClick={() => void run(() => resolve({ exceptionId: exception.exceptionId }), "Exception resolved.")}
          >
            Resolve
          </Button>
        </div>
      ) : null}
      {exception.status === "opened" || exception.status === "under_review" ? (
        <div className="form-actions">
          <input
            className="input"
            value={rejectionReason}
            onChange={(event) => setRejectionReason(event.target.value)}
            placeholder="Rejection reason"
            aria-label="Rejection reason"
          />
          <Button
            type="button"
            variant="danger"
            onClick={() =>
              void run(() => reject({ exceptionId: exception.exceptionId, rejectionReason }), "Exception rejected.")
            }
          >
            Reject
          </Button>
        </div>
      ) : null}
      <div className="form-actions">
        <LinkButton href={`/admin/orders/${exception.orderId}`} variant="secondary">
          Open order
        </LinkButton>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </div>
      <ul className="timeline">
        {exception.history.map((event) => (
          <li key={`${event.eventType}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{event.eventType}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
              {event.note ? <span className="subtle">{event.note}</span> : null}
            </div>
          </li>
        ))}
      </ul>
    </Card>
  );
}

export function AdminExceptions() {
  const { dataSource } = usePrototype();
  const orders = useQuery(
    api.orders.listForAdmin,
    dataSource === "convex" ? { paginationOpts: { numItems: 100, cursor: null } } : "skip",
  );
  const exceptions = useQuery(api.orderExceptions.listForAdmin, dataSource === "convex" ? {} : "skip");
  if (dataSource !== "convex")
    return <div className="state-panel">Exception operations require the Convex data source.</div>;
  if (!orders || !exceptions) return <div className="state-panel">Loading exception operations…</div>;
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Exception operations"
        title="Resolve the exception, preserve the record."
        description="OOS, defects, cancellations, deposit releases, and refund obligations stay item-level and auditable."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <OpenExceptionForm orders={orders.page} />
          {exceptions.length ? (
            <div className="content-stack">
              {exceptions.map((exception) => (
                <ExceptionCard key={exception.exceptionId} exception={exception} />
              ))}
            </div>
          ) : (
            <EmptyState title="No exceptions" description="The queue is empty. No business data is seeded." />
          )}
        </div>
      </div>
    </div>
  );
}
