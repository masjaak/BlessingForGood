"use client";

import { useParams } from "next/navigation";
import { useState } from "react";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  Button,
  Card,
  EmptyState,
  LinkButton,
  LoadingRegion,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { shipmentStageLabels, shipmentStages } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";

function AdminBatchDetail() {
  const params = useParams<{ batchId: string }>();
  const batchId = String(params.batchId);
  const { dataSource, state } = useProduct();
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
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  if (dataSource !== "convex") return <div className="state-panel">Data batch belum tersedia.</div>;
  if (currentBatch === undefined || currentBatchUnassigned === undefined) {
    return (
      <LoadingRegion label="Memuat operasi batch">
        <SkeletonCard />
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  if (!currentBatch) {
    return (
      <EmptyState
        title="Batch tidak ditemukan"
        description="Sesi Admin tidak dapat mengakses batch tersebut."
        action={<LinkButton href="/admin/batches">Kembali ke batch</LinkButton>}
      />
    );
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

  async function run(action: () => Promise<unknown>, success: string, actionId: string) {
    setMessage("");
    setPendingAction(actionId);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessage(reason instanceof Error ? reason.message : "Operasi gagal.");
    } finally {
      setPendingAction(null);
    }
  }

  async function advance() {
    if (!nextStage) return;
    await run(() => updateShipmentStage(batchId, nextStage), "Tahap pengiriman diperbarui.", "shipment");
  }

  async function chooseStage(value: string) {
    if (!value) return;
    const target = value as (typeof shipmentStages)[number];
    const targetIndex = shipmentStages.indexOf(target);
    const allowSkip = targetIndex > currentIndex + 1;
    if (allowSkip && !window.confirm("Lewati ke depan dalam linimasa pengiriman?")) return;
    await run(() => updateShipmentStage(batchId, target, allowSkip), "Tahap pengiriman diperbarui.", "shipment");
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi batch"
        title={currentBatch.name}
        description={currentBatch.referenceCode || currentBatch.batchId}
        actions={
          <LinkButton href="/admin/batches" variant="secondary">
            Kembali ke batch
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
                <span className="card-kicker">Tahap pengiriman</span>
                <h2>
                  {currentBatch.currentShipmentStage
                    ? shipmentStageLabels[currentBatch.currentShipmentStage]
                    : "Belum ditentukan"}
                </h2>
              </div>
              <StatusBadge>{currentBatch.isArchived ? "Diarsipkan" : "Aktif"}</StatusBadge>
            </div>
            <div className="form-actions">
              <Button
                type="button"
                pending={pendingAction === "shipment"}
                pendingLabel="Memperbarui…"
                onClick={() => void advance()}
                disabled={currentBatch.isArchived || !nextStage}
              >
                Lanjut ke {nextStage ? shipmentStageLabels[nextStage] : "selesai"}
              </Button>
              <label className="field">
                <span className="field-label">Lewati/koreksi eksplisit</span>
                <select
                  aria-label="Pilihan tahap pengiriman"
                  className="select"
                  value=""
                  disabled={currentBatch.isArchived || pendingAction !== null}
                  onChange={(event) => void chooseStage(event.target.value)}
                >
                  <option value="">Pilih tahap berikutnya…</option>
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
                pending={pendingAction === "archive"}
                pendingLabel="Mengarsipkan…"
                onClick={() => void run(() => archiveBatch(batchId), "Batch diarsipkan.", "archive")}
                disabled={currentBatch.isArchived}
              >
                Arsipkan batch
              </Button>
            </div>
            <p className="subtle">
              {rosterLocked
                ? "Roster dikunci pada tahap pengiriman pertama; penugasan dan tautan katalog hanya dapat dibaca."
                : "Roster dapat diubah sampai PO ditutup."}
            </p>
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Tautan katalog</span>
                <h2>{currentBatch.catalogLinks.length} terhubung</h2>
              </div>
            </div>
            {currentBatch.catalogLinks.map((link) => (
              <div className="summary-line" key={link.catalogId}>
                <span>{link.catalogName}</span>
                <Button
                  type="button"
                  variant="quiet"
                  pending={pendingAction === `unlink-${link.catalogId}`}
                  pendingLabel="Melepas tautan…"
                  onClick={() =>
                    void run(
                      () => unlinkCatalog(batchId, link.catalogId),
                      "Tautan katalog dilepas.",
                      `unlink-${link.catalogId}`,
                    )
                  }
                  disabled={rosterLocked}
                >
                  Lepas tautan
                </Button>
              </div>
            ))}
            {availableCatalogs.length ? (
              <div className="form-actions">
                <select
                  aria-label="Katalog yang akan ditautkan"
                  className="select"
                  value={catalogId}
                  onChange={(event) => setCatalogId(event.target.value)}
                >
                  <option value="">Pilih katalog…</option>
                  {availableCatalogs.map((catalog) => (
                    <option value={catalog.id} key={catalog.id}>
                      {catalog.name}
                    </option>
                  ))}
                </select>
                <Button
                  type="button"
                  pending={pendingAction === "link"}
                  pendingLabel="Menautkan…"
                  onClick={() => {
                    if (catalogId) void run(() => linkCatalog(batchId, catalogId), "Katalog ditautkan.", "link");
                  }}
                  disabled={rosterLocked || pendingAction !== null}
                >
                  Tautkan katalog
                </Button>
              </div>
            ) : (
              <p className="subtle">Tidak ada katalog yang belum ditautkan pada sesi ini.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Item pesanan yang ditugaskan</span>
                <h2>{currentBatch.assignments.length} penugasan</h2>
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
                        pending={pendingAction === `unassign-${assignment.assignmentId}`}
                        pendingLabel="Menghapus…"
                        onClick={() =>
                          void run(
                            () => unassignOrderItem(assignment.orderItemId, batchId),
                            "Penugasan dihapus.",
                            `unassign-${assignment.assignmentId}`,
                          )
                        }
                      >
                        Unassign
                      </Button>
                      {movableBatches(String(assignment.catalogId)).length ? (
                        <label className="field">
                          <span className="field-label">Pindahkan ke</span>
                          <select
                            className="select"
                            defaultValue=""
                            onChange={(event) => {
                              if (event.target.value) {
                                void run(
                                  () => moveOrderItem(assignment.orderItemId, batchId, event.target.value),
                                  "Assignment moved.",
                                  `move-${assignment.assignmentId}`,
                                );
                              }
                            }}
                          >
                            <option value="">Pilih batch yang dapat diubah…</option>
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
              <p className="subtle">Belum ada item pesanan yang ditugaskan ke batch ini.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Roster pelanggan</span>
                <h2>{currentBatch.customerRoster.length} pelanggan</h2>
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
              <p className="subtle">Belum ada pelanggan yang ditugaskan ke batch ini.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Ringkasan pembelian</span>
                <h2>{currentBatch.purchaseSummary.length} varian</h2>
              </div>
            </div>
            {currentBatch.purchaseSummary.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">Ringkasan pembelian batch</caption>
                  <thead>
                    <tr>
                      <th>Buku / varian</th>
                      <th>ISBN</th>
                      <th>Jumlah</th>
                      <th>Pelanggan</th>
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
              <p className="subtle">Belum ada jumlah yang ditugaskan dan siap dibeli.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Antrian kerja belum ditugaskan</span>
                <h2>{currentBatchUnassigned.length} item pesanan</h2>
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
                    pending={pendingAction === `assign-${item.orderItemId}`}
                    pendingLabel="Menugaskan…"
                    disabled={rosterLocked || pendingAction !== null}
                    onClick={() =>
                      void run(
                        () =>
                          assignOrderItem(
                            item.orderItemId,
                            batchId,
                            item.assignedToBatchQuantity + item.remainingQuantity,
                          ),
                        "Sisa jumlah ditugaskan.",
                        `assign-${item.orderItemId}`,
                      )
                    }
                  >
                    Tugaskan sisa
                  </Button>
                </div>
              ))
            ) : (
              <p className="subtle">Tidak ada jumlah pesanan yang menunggu batch ini.</p>
            )}
          </Card>

          <Card>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Riwayat status</span>
                <h2>Linimasa append-only</h2>
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
            {!currentBatch.history.length ? <p className="subtle">Belum ada tahap yang terlihat pelanggan.</p> : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchDetailPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminBatchDetail />
      </ProductAccessGuard>
    </SiteShell>
  );
}
