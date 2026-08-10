"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { Button, Card, Field, Money, StatusBadge } from "@/components/ui";
import { usePrototype } from "@/domain/prototype/store";

type CustomerException = Awaited<FunctionReturnType<typeof api.orderExceptions.listMineForOrder>>[number];
type Item = { id: string; title: string; format: string; quantity: number; subtotal: number };

const typeLabels: Record<CustomerException["type"], string> = {
  out_of_stock: "Item unavailable",
  defect: "Issue reported",
  customer_cancellation: "Cancellation requested",
  admin_cancellation: "Order issue",
};

const statusLabels: Record<CustomerException["status"], string> = {
  opened: "Issue reported",
  under_review: "Under review",
  resolution_selected: "Resolution planned",
  resolved: "Resolved",
  rejected: "Request rejected",
};

function statusTone(status: CustomerException["status"]): "neutral" | "positive" | "warning" {
  if (status === "resolved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function CancellationAction({ item, enabled }: { item: Item; enabled: boolean }) {
  const eligibility = useQuery(
    api.orderExceptions.getCancellationEligibility,
    enabled ? { orderItemId: item.id as Id<"orderItems"> } : "skip",
  );
  const request = useMutation(api.orderExceptions.requestCancellation);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState("");
  const [open, setOpen] = useState(false);

  if (!eligibility || eligibility.decision === "not_eligible") return null;
  if (!open) {
    return (
      <Button type="button" variant="secondary" onClick={() => setOpen(true)}>
        {eligibility.decision === "eligible" ? "Request cancellation" : "Request admin review"}
      </Button>
    );
  }
  return (
    <form
      className="form-card"
      onSubmit={async (event) => {
        event.preventDefault();
        setMessage("");
        try {
          await request({ orderItemId: item.id as Id<"orderItems">, reason });
          setMessage("Cancellation request sent for review.");
          setReason("");
        } catch (error) {
          setMessage(error instanceof Error ? error.message : "Cancellation request could not be sent.");
        }
      }}
    >
      <Field label={`Reason for ${item.title}`}>
        <textarea className="textarea" value={reason} onChange={(event) => setReason(event.target.value)} required />
      </Field>
      <div className="form-actions">
        <Button type="submit">Send request</Button>
        <Button type="button" variant="quiet" onClick={() => setOpen(false)}>
          Close
        </Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function ExceptionCard({ exception }: { exception: CustomerException }) {
  return (
    <div className="content-stack">
      <div className="split-heading">
        <div>
          <span className="card-kicker">{typeLabels[exception.type]}</span>
          <h3>{exception.item?.bookTitle || "Order item"}</h3>
        </div>
        <StatusBadge tone={statusTone(exception.status)}>{statusLabels[exception.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>Affected quantity</span>
        <strong>{exception.affectedQuantity}</strong>
      </div>
      {exception.customerNote ? <p className="subtle">{exception.customerNote}</p> : null}
      {exception.financialImpact ? (
        <div className="summary-line">
          <span>Financial status</span>
          <span>
            {exception.financialImpact.refundObligationStatus === "refund_due"
              ? "Credit or refund pending review"
              : "Recorded"}
          </span>
        </div>
      ) : null}
      <ul className="timeline">
        {exception.history.map((event) => (
          <li key={`${event.eventType}-${event.at}`}>
            <span className="timeline-dot" aria-hidden="true" />
            <div>
              <strong>{statusLabels[event.toStatus || exception.status] || event.eventType}</strong>
              <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function CustomerOrderExceptions({ orderId, items }: { orderId: string; items: Item[] }) {
  const { dataSource } = usePrototype();
  const exceptions = useQuery(
    api.orderExceptions.listMineForOrder,
    dataSource === "convex" ? { orderId: orderId as Id<"orders"> } : "skip",
  );
  if (dataSource !== "convex" || exceptions === undefined) return null;
  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">Order exceptions</span>
          <h2>Issues and requests</h2>
        </div>
        <StatusBadge>{exceptions.length ? `${exceptions.length} recorded` : "No issues"}</StatusBadge>
      </div>
      {exceptions.length ? (
        <div className="content-stack">
          {exceptions.map((exception) => (
            <ExceptionCard key={exception.exceptionId} exception={exception} />
          ))}
        </div>
      ) : (
        <p className="subtle">No exception has been recorded for this order.</p>
      )}
      <div className="content-stack">
        {items.map((item) => (
          <div className="summary-line" key={item.id}>
            <span>
              {item.quantity} × {item.title} · {item.format}
              <br />
              <span className="subtle">Original item value</span>
            </span>
            <span>
              <Money amount={item.subtotal} />
              <br />
              <CancellationAction item={item} enabled={dataSource === "convex"} />
            </span>
          </div>
        ))}
      </div>
      <p className="subtle">
        Cancellation requests are reviewed by BFG operations. No payout is performed automatically.
      </p>
    </Card>
  );
}
