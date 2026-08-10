"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, LinkButton, PageHeader, StatusBadge } from "@/components/ui";
import { shipmentStageLabels, shipmentStages } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { usePrototype } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminBatchDetail() {
  const params = useParams<{ batchId: string }>();
  const batchId = String(params.batchId);
  const { dataSource, state } = usePrototype();
  const {
    batchList,
    currentBatch,
    currentBatchUnassigned,
    linkCatalog,
    unlinkCatalog,
    archiveBatch,
    assignOrderItem,
    unassignOrderItem,
    moveOrderItem,
    updateShipmentStage,
  } = useOperations();
  const [catalogId, setCatalogId] = useState("");
  const [message, setMessage] = useState("");
  if (dataSource !== "convex")
    return <div className="state-panel">Persistent batches require canonical Convex Development.</div>;
  if (!currentBatch || currentBatchUnassigned === undefined) {
    if (!currentBatch) {
      return (
        <EmptyState
          title="Batch not found"
          description="The admin session cannot access that batch."
          action={<LinkButton href="/admin/batches">Back to batches</LinkButton>}
        />
      );
    }
    return <div className="state-panel">Loading batch roster…</div>;
  }
  const currentIndex = currentBatch.currentShipmentStage
    ? shipmentStages.indexOf(currentBatch.currentShipmentStage)
    : -1;
  const nextStage = shipmentStages[currentIndex + 1];
  const linked = new Set(currentBatch.catalogLinks.map((link) => String(link.catalogId)));
  const availableCatalogs = state.catalogs.filter((catalog) => !linked.has(catalog.id));
  const rosterLocked = currentBatch.rosterLocked;

  function movableBatches(catalogId: string) {
    return (batchList?.page || []).filter(
      (batch) =>
        batch.batchId !== batchId &&
        !batch.isArchived &&
        !batch.rosterLocked &&
        batch.catalogLinks.some((link) => String(link.catalogId) === catalogId),
    );
  }

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operation failed");
    }
  }

  async function advance() {
    if (!nextStage) return;
    await run(() => updateShipmentStage(batchId, nextStage), "Shipment stage updated.");
  }

  async function chooseStage(value: string) {
    if (!value) return;
    const target = value as (typeof shipmentStages)[number];
    const targetIndex = shipmentStages.indexOf(target);
    const allowSkip = targetIndex > currentIndex + 1;
    if (allowSkip && !window.confirm("Confirm skipping forward in the shipment timeline?")) return;
    await run(() => updateShipmentStage(batchId, target, allowSkip), "Shipment stage updated.");
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Batch operations"
        title={currentBatch.name}
        description={currentBatch.referenceCode || currentBatch.batchId}
        actions={
          <LinkButton href="/admin/batches" variant="secondary">
            Back to batches
          </LinkButton>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          {message ? (
            <p className="success-banner" role="status">
              {message}
            </p>
          ) : null}
          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Shipment stage</span>
                <h2>
                  {currentBatch.currentShipmentStage
                    ? shipmentStageLabels[currentBatch.currentShipmentStage]
                    : "Not set"}
                </h2>
              </div>
              <StatusBadge>{currentBatch.isArchived ? "Archived" : "Active"}</StatusBadge>
            </div>
            <div className="form-actions">
              <Button type="button" onClick={() => void advance()} disabled={currentBatch.isArchived || !nextStage}>
                Advance to {nextStage ? shipmentStageLabels[nextStage] : "complete"}
              </Button>
              <label className="field">
                <span className="field-label">Explicit skip/correction</span>
                <select
                  aria-label="Shipment stage choice"
                  className="select"
                  value=""
                  disabled={currentBatch.isArchived}
                  onChange={(event) => void chooseStage(event.target.value)}
                >
                  <option value="">Choose a later stage…</option>
                  {shipmentStages.slice(currentIndex + 2).map((stage) => (
                    <option value={stage} key={stage}>
                      {shipmentStageLabels[stage]}
                    </option>
                  ))}
                </select>
              </label>
              <Button
                type="button"
                variant="danger"
                onClick={() => void run(() => archiveBatch(batchId), "Batch archived.")}
                disabled={currentBatch.isArchived}
              >
                Archive batch
              </Button>
            </div>
            <p className="subtle">
              {rosterLocked
                ? "Roster locked at the first shipment stage; assignments and catalog links are read-only."
                : "Roster is editable until the PO is closed."}
            </p>
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Catalog links</span>
                <h2>{currentBatch.catalogLinks.length} linked</h2>
              </div>
            </div>
            {currentBatch.catalogLinks.map((link) => (
              <div className="summary-line" key={link.catalogId}>
                <span>{link.catalogName}</span>
                <Button
                  type="button"
                  variant="quiet"
                  onClick={() => void run(() => unlinkCatalog(batchId, link.catalogId), "Catalog unlinked.")}
                  disabled={rosterLocked}
                >
                  Unlink
                </Button>
              </div>
            ))}
            {availableCatalogs.length ? (
              <div className="form-actions">
                <select
                  aria-label="Catalog to link"
                  className="select"
                  value={catalogId}
                  onChange={(event) => setCatalogId(event.target.value)}
                >
                  <option value="">Select catalog…</option>
                  {availableCatalogs.map((catalog) => (
                    <option value={catalog.id} key={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  onClick={() => {
                    if (catalogId) void run(() => linkCatalog(batchId, catalogId), "Catalog linked.");
                  }}
                  disabled={rosterLocked}
                >
                  Link catalog
                </Button>
              </div>
            ) : (
              <p className="subtle">No unlinked catalog is available in this session.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Assigned order items</span>
                <h2>{currentBatch.assignments.length} assignments</h2>
              </div>
            </div>
            {currentBatch.assignments.length ? (
              currentBatch.assignments.map((assignment) => (
                <div className="content-stack" key={assignment.assignmentId}>
                  <div className="summary-line">
                    <span>
                      {assignment.assignedQuantity}/{assignment.orderedQuantity} × {assignment.bookTitle} ·{" "}
                      {assignment.format} · {assignment.customerName}
                      <br />
                      <span className="subtle">
                        {assignment.isbn} · {assignment.catalogName} · {assignment.orderId}
                      </span>
                    </span>
                    <span className="subtle">IDR {assignment.unitPriceAmount.toLocaleString("id-ID")}</span>
                  </div>
                  {!rosterLocked ? (
                    <div className="form-actions">
                      <Button
                        type="button"
                        variant="quiet"
                        onClick={() =>
                          void run(() => unassignOrderItem(assignment.orderItemId, batchId), "Assignment removed.")
                        }
                      >
                        Unassign
                      </Button>
                      {movableBatches(String(assignment.catalogId)).length ? (
                        <label className="field">
                          <span className="field-label">Move to</span>
                          <select
                            className="select"
                            defaultValue=""
                            onChange={(event) => {
                              if (event.target.value) {
                                void run(
                                  () => moveOrderItem(assignment.orderItemId, batchId, event.target.value),
                                  "Assignment moved.",
                                );
                              }
                            }}
                          >
                            <option value="">Choose editable batch…</option>
                            {movableBatches(String(assignment.catalogId)).map((candidate) => (
                              <option key={candidate.batchId} value={candidate.batchId}>
                                {candidate.name}
                              </option>
                            ))}
                          </select>
                        </label>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))
            ) : (
              <p className="subtle">No order item is assigned to this batch yet.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Customer roster</span>
                <h2>{currentBatch.customerRoster.length} customers</h2>
              </div>
            </div>
            {currentBatch.customerRoster.length ? (
              currentBatch.customerRoster.map((customer) => (
                <div className="content-stack" key={customer.customerUserId}>
                  <strong>{customer.customerName}</strong>
                  {customer.items.map((item) => (
                    <div className="summary-line" key={item.assignmentId}>
                      <span>
                        {item.assignedQuantity} × {item.bookTitle} · {item.format}
                      </span>
                      <span className="subtle">{item.isbn}</span>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="subtle">No customer has been assigned to this batch.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Purchase summary</span>
                <h2>{currentBatch.purchaseSummary.length} variants</h2>
              </div>
            </div>
            {currentBatch.purchaseSummary.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">Batch purchase summary</caption>
                  <thead>
                    <tr>
                      <th>Book / variant</th>
                      <th>ISBN</th>
                      <th>Qty</th>
                      <th>Customers</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBatch.purchaseSummary.map((item) => (
                      <tr key={item.bookVariantId}>
                        <td>
                          {item.bookTitle} · {item.format}
                          <br />
                          <span className="subtle">IDR {item.unitPriceAmount.toLocaleString("id-ID")}</span>
                        </td>
                        <td>{item.isbn}</td>
                        <td>{item.quantity}</td>
                        <td>{item.customerCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtle">No assigned quantity is ready for purchasing.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Unassigned work queue</span>
                <h2>{currentBatchUnassigned.length} order items</h2>
              </div>
            </div>
            {currentBatchUnassigned.length ? (
              currentBatchUnassigned.map((item) => (
                <div className="summary-line" key={item.orderItemId}>
                  <span>
                    {item.remainingQuantity} remaining × {item.bookTitle} · {item.format} · {item.customerName}
                    <br />
                    <span className="subtle">
                      {item.isbn} · {item.catalogName} · {item.orderId}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={rosterLocked}
                    onClick={() =>
                      void run(
                        () =>
                          assignOrderItem(
                            item.orderItemId,
                            batchId,
                            item.assignedToBatchQuantity + item.remainingQuantity,
                          ),
                        "Remaining quantity assigned.",
                      )
                    }
                  >
                    Assign remaining
                  </Button>
                </div>
              ))
            ) : (
              <p className="subtle">No submitted order quantity is waiting for this batch.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Status history</span>
                <h2>Append-only timeline</h2>
              </div>
            </div>
            <ul className="timeline">
              {currentBatch.history.map((event) => (
                <li key={`${event.toStage}-${event.at}`}>
                  <span className="timeline-dot" aria-hidden="true" />
                  <div>
                    <strong>{shipmentStageLabels[event.toStage]}</strong>
                    <time dateTime={event.at}>{new Date(event.at).toLocaleString("en-GB")}</time>
                    {event.note ? <span className="subtle">{event.note}</span> : null}
                  </div>
                </li>
              ))}
            </ul>
            {!currentBatch.history.length ? <p className="subtle">No customer-visible stage has been set.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchDetailPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminBatchDetail />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
