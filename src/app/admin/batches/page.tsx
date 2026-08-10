"use client";

import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, Field, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function CreateBatchForm() {
  const { createBatch } = useOperations();
  const [name, setName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await createBatch({ name, referenceCode: referenceCode || undefined, description: description || undefined });
      setName("");
      setReferenceCode("");
      setDescription("");
      setMessage("Batch created.");
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Batch could not be created");
    }
  }
  return (
    <Card>
      <span className="card-kicker">New cargo</span>
      <h2>Create batch</h2>
      <form className="form-card" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Name">
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Reference code">
            <input className="input" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} />
          </Field>
        </div>
        <Field label="Description">
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="form-actions">
          <Button type="submit">Create batch</Button>
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

function AdminBatches() {
  const { batchList } = useOperations();
  const { state } = usePrototype();
  if (!batchList) return <div className="state-panel">Loading batches…</div>;
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Batch tracking"
        title="Move cargo with a clear record."
        description="Batches start empty. Catalog links, assignments, and shipment history are persisted in canonical Convex Development."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <CreateBatchForm />
          {batchList.page.length ? (
            batchList.page.map((batch) => (
              <Card key={batch.batchId}>
                <div className="split-heading">
                  <div>
                    <span className="card-kicker">{batch.referenceCode || batch.batchId}</span>
                    <h2>{batch.name}</h2>
                  </div>
                  <StatusBadge tone={batch.isArchived ? "neutral" : "positive"}>
                    {batch.isArchived
                      ? "Archived"
                      : batch.currentShipmentStage
                        ? shipmentStageLabels[batch.currentShipmentStage]
                        : "No stage"}
                  </StatusBadge>
                </div>
                <p className="subtle">{batch.description || "No description"}</p>
                <div className="summary-line">
                  <span>Linked catalogs</span>
                  <strong>{batch.catalogLinks.length}</strong>
                </div>
                <div className="summary-line">
                  <span>Roster</span>
                  <strong>
                    {batch.rosterLocked ? "Locked" : "Editable"} · {batch.assignmentCount} assignments ·{" "}
                    {batch.customerCount} customers
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Assigned quantity</span>
                  <strong>{batch.assignedQuantity}</strong>
                </div>
                {batch.catalogLinks.map((link) => (
                  <div className="summary-line" key={link.catalogId}>
                    <span>{link.catalogName}</span>
                    <span className="subtle">{link.catalogId}</span>
                  </div>
                ))}
                <LinkButton href={`/admin/batches/${batch.batchId}`} variant="secondary">
                  Open batch operations
                </LinkButton>
              </Card>
            ))
          ) : (
            <EmptyState
              title="No batches yet"
              description="Create the first cargo record when an admin has an actual batch to operate."
              action={
                <LinkButton href="/admin/orders" variant="secondary">
                  Review orders
                </LinkButton>
              }
            />
          )}
          <p className="subtle">
            Catalogs available in this admin session: {state.catalogs.length}. No sample batch is created automatically.
          </p>
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchesPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminBatches />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
