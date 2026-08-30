"use client";

import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { BFGSelect } from "@/components/bfg-select";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  ActionGroup,
  Button,
  Card,
  ConfirmationDialog,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import {
  formatCargoEta,
  invoicePaymentStatusLabel,
  shipmentStageLabels,
  shipmentStages,
} from "@/domain/prototype/operations";
import { formatIdr } from "@/domain/prototype/logic";
import { useOperations, type BatchDetail } from "@/domain/prototype/operations-context";
import { productErrorMessage } from "@/domain/prototype/errors";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { purchaseSummaryCsvRows, toExcelCsv } from "@/lib/excel-export";
import { formatGbpMinor } from "@/lib/gbp";
import { calendarDateInputValue, calendarDateToEndTimestamp, formatBfgCalendarDate } from "@/lib/calendar-date";

function formatCatalogDeadline(value: number | null | undefined): string {
  return value === null || value === undefined ? "Belum ditentukan" : formatBfgCalendarDate(value);
}

function formatBatchDeadlineInput(value: number | null | undefined): string {
  return calendarDateInputValue(value);
}

function downloadPurchaseSummary(batch: BatchDetail) {
  const blob = new Blob([toExcelCsv(purchaseSummaryCsvRows(batch.purchaseSummary))], {
    type: "text/csv;charset=utf-8",
  });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = (batch.referenceCode || batch.name) + "-purchase-summary.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}

function AdminBatchDetail() {
  const params = useParams<{ batchId: string }>();
  const batchId = String(params.batchId);
  const { dataSource, state } = useProduct();
  const {
    batchList,
    currentBatch,
    currentBatchUnassigned,
    currentBatchPagination,
    currentBatchUnassignedPagination,
    updateBatch,
    linkCatalog,
    unlinkCatalog,
    archiveBatch,
    removeBatch,
    updateEtaCargoMonth,
    assignOrderItem,
    unassignOrderItem,
    moveOrderItem,
    updateShipmentStage,
  } = useOperations();
  const [catalogId, setCatalogId] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [pendingStage, setPendingStage] = useState<(typeof shipmentStages)[number] | null>(null);
  const [confirmLock, setConfirmLock] = useState(false);
  const [confirmArchive, setConfirmArchive] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const router = useRouter();
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
  const assignmentPage = currentBatch.assignmentPage || { isDone: true, continueCursor: "" };
  const unassignedPage = Array.isArray(currentBatchUnassigned)
    ? { page: currentBatchUnassigned, isDone: true, continueCursor: "" }
    : currentBatchUnassigned;
  const unassignedRows = unassignedPage.page;
  const currentIndex = currentBatch.currentShipmentStage
    ? shipmentStages.indexOf(currentBatch.currentShipmentStage)
    : -1;
  const nextStage = shipmentStages[currentIndex + 1];
  const linked = new Set(currentBatch.catalogLinks.map((link) => String(link.catalogId)));
  const availableCatalogs = state.catalogs.filter((catalog) => !linked.has(catalog.id));
  const rosterLocked = currentBatch.rosterLocked;
  const eligibleOrderItemCount = currentBatch.catalogLinks.reduce(
    (total, link) => total + link.eligibleOrderItemCount,
    0,
  );
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
    setMessageIsError(false);
    setPendingAction(actionId);
    try {
      await action();
      setMessage(success);
    } catch (reason) {
      setMessageIsError(true);
      setMessage(productErrorMessage(reason, "Operasi Batch belum berhasil. Silakan coba lagi."));
    } finally {
      setPendingAction(null);
    }
  }

  async function advance() {
    if (!nextStage) return;
    if (nextStage === "po_closed") {
      setConfirmLock(true);
      return;
    }
    await run(() => updateShipmentStage(batchId, nextStage), "Tahap pengiriman diperbarui.", "shipment");
  }

  async function chooseStage(value: string) {
    if (!value) return;
    const target = value as (typeof shipmentStages)[number];
    const targetIndex = shipmentStages.indexOf(target);
    const allowSkip = targetIndex > currentIndex + 1;
    if (allowSkip) {
      setPendingStage(target);
      return;
    }
    await run(() => updateShipmentStage(batchId, target, allowSkip), "Tahap pengiriman diperbarui.", "shipment");
  }

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi batch"
        title={currentBatch.name}
        description={currentBatch.referenceCode || "Tanpa referensi"}
        actions={
          <ActionGroup>
            <Button
              type="button"
              variant={currentBatch.rosterLocked ? "primary" : "secondary"}
              onClick={() => downloadPurchaseSummary(currentBatch)}
            >
              {currentBatch.rosterLocked ? "Unduh purchase CSV" : "Unduh preview CSV"}
            </Button>
            <LinkButton href="/admin/batches" variant="secondary">
              Kembali ke batch
            </LinkButton>
          </ActionGroup>
        }
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <ConfirmationDialog
            open={pendingStage !== null}
            title="Lewati tahap pengiriman?"
            description="Tahap ini akan dicatat sebagai koreksi eksplisit pada linimasa Batch."
            confirmLabel="Lewati tahap"
            onCancel={() => setPendingStage(null)}
            onConfirm={() => {
              const target = pendingStage;
              setPendingStage(null);
              if (target)
                void run(() => updateShipmentStage(batchId, target, true), "Tahap pengiriman diperbarui.", "shipment");
            }}
          />
          <ConfirmationDialog
            open={confirmLock}
            title="Kunci PO?"
            description="Setelah PO ditutup, assignment, tautan Catalog, dan data procurement utama tidak dapat diubah."
            confirmLabel="Kunci PO"
            onCancel={() => setConfirmLock(false)}
            onConfirm={() => {
              setConfirmLock(false);
              void run(() => updateShipmentStage(batchId, "po_closed"), "PO dikunci.", "shipment");
            }}
          />
          {message ? (
            <p className={messageIsError ? "error-text" : "success-banner"} role={messageIsError ? "alert" : "status"}>
              {message}
            </p>
          ) : null}
          <p className="subtle action-support">
            Alur kerja: Informasi Batch → Catalog terhubung → pesanan eligible masuk otomatis bila tujuan tunggal →
            rekap dan pengecualian → Purchase Summary → Kunci PO → shipment.
          </p>
          <Card style={{ order: 1 }}>
            <span className="card-kicker">1. Informasi Batch</span>
            <h2>Data procurement</h2>
            <p className="subtle">
              {rosterLocked || currentBatch.isArchived
                ? "Batch sudah dikunci. Data procurement utama tidak dapat diubah setelah PO ditutup."
                : "Simpan identitas siklus procurement sebelum menghubungkan Catalog dan menyusun Roster."}
            </p>
            <BatchMetadataForm
              key={currentBatch.updatedAt}
              batch={currentBatch}
              updateBatch={updateBatch}
              disabled={rosterLocked || currentBatch.isArchived}
              onDone={() => {
                setMessageIsError(false);
                setMessage("Informasi Batch tersimpan.");
              }}
            />
          </Card>
          <Card style={{ order: 6 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">6–7. Kunci PO & perjalanan pengiriman</span>
                <h2>
                  {currentBatch.currentShipmentStage
                    ? shipmentStageLabels[currentBatch.currentShipmentStage]
                    : "Belum ditentukan"}
                </h2>
              </div>
              <StatusBadge>{currentBatch.isArchived ? "Diarsipkan" : "Aktif"}</StatusBadge>
            </div>
            <div className="action-region">
              <div className="form-actions">
                <Button
                  type="button"
                  loading={pendingAction === "shipment"}
                  loadingLabel="Memperbarui…"
                  onClick={() => void advance()}
                  disabled={currentBatch.isArchived || !nextStage}
                >
                  Lanjut ke {nextStage ? shipmentStageLabels[nextStage] : "selesai"}
                </Button>
                <label className="field">
                  <span className="field-label">Koreksi tahap (sekunder)</span>
                  <BFGSelect
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
                  </BFGSelect>
                </label>
                <Button
                  type="button"
                  variant="danger"
                  loading={pendingAction === "archive"}
                  loadingLabel="Mengarsipkan…"
                  onClick={() => setConfirmArchive(true)}
                  disabled={currentBatch.isArchived}
                >
                  Arsipkan batch
                </Button>
                {!currentBatch.isArchived &&
                !currentBatch.currentShipmentStage &&
                !currentBatch.catalogLinks.length &&
                !currentBatch.assignmentCount ? (
                  <Button
                    type="button"
                    variant="danger"
                    loading={pendingAction === "delete"}
                    loadingLabel="Menghapus…"
                    onClick={() => setConfirmDelete(true)}
                  >
                    Hapus batch
                  </Button>
                ) : null}
              </div>
              <p className="subtle action-support">
                {rosterLocked
                  ? "Roster dikunci pada tahap pengiriman pertama; penugasan dan tautan katalog hanya dapat dibaca."
                  : "Pastikan minimal satu item sudah dimasukkan ke Batch sebelum mengunci PO."}
              </p>
              {!nextStage ? (
                <p className="subtle action-support">Batch sudah berada di tahap pengiriman terakhir.</p>
              ) : null}
            </div>
          </Card>

          <Card style={{ order: 7 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Perkiraan tiba</span>
                <h2>ETA Cargo</h2>
              </div>
            </div>
            <p className="subtle">
              Estimasi tiba. Simpan bulan dan tahun cargo; ini bukan tanggal kedatangan yang dijamin.
            </p>
            <EtaCargoForm
              key={currentBatch.etaCargoMonth || "empty"}
              batchId={batchId}
              etaCargoMonth={currentBatch.etaCargoMonth}
              updateEtaCargoMonth={updateEtaCargoMonth}
              disabled={currentBatch.isArchived}
              onDone={() => setMessage("ETA Cargo diperbarui.")}
            />
          </Card>

          <Card style={{ order: 2 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">2. Catalog terhubung</span>
                <h2>{currentBatch.catalogLinks.length} terhubung</h2>
              </div>
            </div>
            <p className="subtle">
              Hubungkan Catalog untuk menetapkan siklus procurement penerima. Pesanan eligible dari Catalog dengan tepat
              satu Batch yang masih dapat diubah akan masuk otomatis; tujuan kosong atau ambigu muncul sebagai
              pengecualian. Melepas tautan hanya menghapus relasi.
            </p>
            {!currentBatch.catalogLinks.length ? (
              <p className="subtle">
                Belum ada Catalog terhubung. Hubungkan Catalog untuk mengambil pesanan preorder yang eligible.
              </p>
            ) : null}
            {currentBatch.catalogLinks.map((link) => (
              <div className="content-stack" key={link.catalogId}>
                <div className="summary-line">
                  <strong>CATALOG TERHUBUNG · {link.catalogName}</strong>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={pendingAction === `unlink-${link.catalogId}`}
                    loadingLabel="Melepas tautan…"
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
                <div className="summary-line">
                  <span>Batas pemesanan</span>
                  <span>{formatCatalogDeadline(link.closingAt)}</span>
                </div>
                <div className="summary-line">
                  <span>Pesanan eligible</span>
                  <span>{link.eligibleOrderItemCount}</span>
                </div>
                <div className="summary-line">
                  <span>Customers · Total qty · Publishers</span>
                  <span>
                    {link.eligibleCustomerCount} · {link.eligibleQuantity} · {link.publisherCount}
                  </span>
                </div>
                {!link.eligibleOrderItemCount ? (
                  <p className="subtle">Belum ada pesanan yang memenuhi syarat dari Catalog ini.</p>
                ) : null}
              </div>
            ))}
            {availableCatalogs.length ? (
              <div className="form-actions">
                <BFGSelect
                  aria-label="Katalog yang akan ditautkan"
                  className="select"
                  value={catalogId}
                  onChange={(event) => setCatalogId(event.target.value)}
                >
                  <option value="">Pilih katalog…</option>
                  {availableCatalogs.map((catalog) => (
                    <option value={catalog.id} key={catalog.id}>
                      {catalog.name}
                      {catalog.closingAt ? ` · batas ${formatCatalogDeadline(Date.parse(catalog.closingAt))}` : ""}
                    </option>
                  ))}
                </BFGSelect>
                <Button
                  type="button"
                  loading={pendingAction === "link"}
                  loadingLabel="Menautkan…"
                  onClick={() => {
                    if (catalogId) void run(() => linkCatalog(batchId, catalogId), "Katalog ditautkan.", "link");
                  }}
                  disabled={rosterLocked || pendingAction !== null || !catalogId}
                >
                  Hubungkan Catalog
                </Button>
              </div>
            ) : (
              <p className="subtle">Tidak ada katalog yang belum ditautkan pada sesi ini.</p>
            )}
          </Card>

          <Card style={{ order: 4 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">4. Rekap Pesanan</span>
                <h2>{currentBatch.assignmentCount} item masuk Batch</h2>
              </div>
            </div>
            <p className="subtle">
              Data operasional memakai snapshot order dan catatan keuangan kanonik. Format adalah varian buku; DP adalah
              deposit yang benar-benar teralokasi.
            </p>
            {currentBatch.assignments.length ? (
              <>
                <div className="table-wrap">
                  <table className="data-table batch-recap-table">
                    <caption className="sr-only">Rekap operasional pesanan Batch</caption>
                    <thead>
                      <tr>
                        <th>Tanggal pesan</th>
                        <th>Customer</th>
                        <th>Buku</th>
                        <th>Format</th>
                        <th>Qty</th>
                        <th>Status pembayaran</th>
                        <th>DP</th>
                        <th>Harga</th>
                        <th>ISBN</th>
                        <th>Publisher</th>
                        <th>ETA</th>
                        <th>Harga modal (GBP)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {currentBatch.assignments.map((assignment) => (
                        <tr key={assignment.assignmentId}>
                          <td>{formatBfgCalendarDate(assignment.orderDate)}</td>
                          <td>
                            <strong>{assignment.customerName}</strong>
                            <br />
                            <span className="subtle">{assignment.customerMemberCode || "—"}</span>
                            <br />
                            <span className="subtle">
                              {assignment.orderCode ||
                                `BFG-ORD-LEGACY-${String(assignment.orderId).slice(-8).toUpperCase()}`}
                            </span>
                          </td>
                          <td>{assignment.bookTitle}</td>
                          <td>{assignment.format}</td>
                          <td>
                            {assignment.assignedQuantity}/{assignment.orderedQuantity}
                          </td>
                          <td>
                            <StatusBadge tone={assignment.paymentStatus === "paid" ? "positive" : "warning"}>
                              {invoicePaymentStatusLabel(assignment.paymentStatus)}
                            </StatusBadge>
                          </td>
                          <td>{formatIdr(assignment.dpAmount)}</td>
                          <td>{formatIdr(assignment.unitPriceAmount)}</td>
                          <td>{assignment.isbn}</td>
                          <td>{assignment.publisherName}</td>
                          <td>{formatCargoEta(assignment.etaCargoMonth)}</td>
                          <td>{assignment.gpe == null ? "—" : formatGbpMinor(assignment.gpe)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {!rosterLocked ? (
                  <details className="content-stack">
                    <summary>Koreksi assignment</summary>
                    {currentBatch.assignments.map((assignment) => (
                      <div className="content-stack" key={assignment.assignmentId}>
                        <strong>
                          {assignment.customerName} · {assignment.bookTitle} · {assignment.assignedQuantity}/
                          {assignment.orderedQuantity}
                        </strong>
                        <AssignmentQuantityForm
                          assignment={assignment}
                          batchId={batchId}
                          assignOrderItem={assignOrderItem}
                          onDone={() => setMessage("Jumlah penugasan diperbarui.")}
                        />
                        <div className="form-actions">
                          <Button
                            type="button"
                            variant="secondary"
                            loading={pendingAction === `unassign-${assignment.assignmentId}`}
                            loadingLabel="Mengeluarkan…"
                            onClick={() =>
                              void run(
                                () => unassignOrderItem(assignment.orderItemId, batchId),
                                "Item dikeluarkan dari Batch.",
                                `unassign-${assignment.assignmentId}`,
                              )
                            }
                          >
                            Keluarkan dari Batch
                          </Button>
                          {movableBatches(String(assignment.catalogId)).length ? (
                            <label className="field">
                              <span className="field-label">Pindahkan ke</span>
                              <BFGSelect
                                className="select"
                                defaultValue=""
                                onChange={(event) => {
                                  if (event.target.value) {
                                    void run(
                                      () => moveOrderItem(assignment.orderItemId, batchId, event.target.value),
                                      "Item dipindahkan ke Batch.",
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
                              </BFGSelect>
                            </label>
                          ) : null}
                        </div>
                      </div>
                    ))}
                  </details>
                ) : null}
                <AdminPagination
                  {...currentBatchPagination}
                  rowCount={currentBatch.assignments.length}
                  isDone={assignmentPage.isDone}
                  continueCursor={assignmentPage.continueCursor}
                />
              </>
            ) : (
              <p className="subtle">Belum ada pesanan yang masuk ke Batch ini.</p>
            )}
          </Card>

          <Card style={{ order: 4 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">Roster Batch</span>
                <h2>{currentBatch.customerCount} pelanggan</h2>
              </div>
            </div>
            <p className="subtle">
              Daftar item preorder Customer yang sudah masuk ke Batch ini. Setiap baris menunjukkan Customer,
              memberCode, order reference, buku, Publisher, format, dan qty.
            </p>
            {currentBatch.customerRoster.length ? (
              currentBatch.customerRoster.map((customer) => (
                <div className="content-stack" key={customer.customerUserId}>
                  <strong>
                    {customer.customerName} · memberCode: {customer.customerMemberCode || "—"}
                  </strong>
                  {customer.items.map((item) => (
                    <div className="summary-line" key={item.assignmentId}>
                      <span>
                        {item.assignedQuantity} × {item.bookTitle} · {item.publisherName} · {item.format}
                        <br />
                        <span className="subtle">
                          Order: {item.orderCode || `BFG-ORD-LEGACY-${String(item.orderId).slice(-8).toUpperCase()}`}
                        </span>
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

          <Card style={{ order: 5 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">5. Purchase Summary</span>
                <h2>{currentBatch.purchaseSummary.length} varian</h2>
              </div>
            </div>
            <p className="subtle">
              Ringkasan pembelian dihitung otomatis dari item yang sudah masuk Batch. Ringkasan ini tidak diedit
              terpisah.
            </p>
            {currentBatch.purchaseSummary.length ? (
              <div className="table-wrap">
                <table className="data-table">
                  <caption className="sr-only">Ringkasan pembelian batch</caption>
                  <thead>
                    <tr>
                      <th>Publisher</th>
                      <th>Judul</th>
                      <th>Format</th>
                      <th>ISBN</th>
                      <th>Qty</th>
                      <th>Harga modal (GBP)</th>
                      <th>Harga IDR</th>
                      <th>Pelanggan</th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentBatch.purchaseSummary.map((item) => (
                      <tr key={item.bookVariantId}>
                        <td>{item.publisherName}</td>
                        <td>{item.bookTitle}</td>
                        <td>{item.format}</td>
                        <td>{item.isbn}</td>
                        <td>{item.quantity}</td>
                        <td>
                          {item.supplierPriceGbpMinor === null ? "—" : formatGbpMinor(item.supplierPriceGbpMinor)}
                        </td>
                        <td>{item.unitPriceAmount.toLocaleString("id-ID")}</td>
                        <td>{item.customerCount}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="subtle">Ringkasan akan muncul setelah item Roster dimasukkan ke Batch.</p>
            )}
          </Card>

          <Card style={{ order: 3 }}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">3. Roster Pesanan</span>
                <h2>{eligibleOrderItemCount} item siap diproses</h2>
              </div>
            </div>
            <p className="subtle">
              Item normal masuk otomatis setelah Catalog memiliki satu Batch penerima. Hanya item tanpa tujuan, tujuan
              ambigu, atau koreksi yang membutuhkan keputusan Admin.
            </p>
            <div className="summary-line">
              <span>Rekap assignment</span>
              <strong>
                {currentBatch.assignmentCount} masuk Batch · {unassignedRows.length} perlu tindakan
              </strong>
            </div>
            {unassignedRows.length ? <h3>Perlu tindakan</h3> : null}
            {unassignedRows.length ? (
              unassignedRows.map((item) => (
                <div className="summary-line" key={item.orderItemId}>
                  <span>
                    {item.remainingQuantity} × {item.bookTitle} · {item.publisherName} · {item.format} ·{" "}
                    {item.customerName}
                    <br />
                    <span className="subtle">
                      memberCode: {item.customerMemberCode || "—"} · {item.isbn} · {item.catalogName}
                      <br />
                      Order: {item.orderCode || `BFG-ORD-LEGACY-${String(item.orderId).slice(-8).toUpperCase()}`}
                      <br />
                      Status: {item.assignmentState}
                    </span>
                  </span>
                  <Button
                    type="button"
                    variant="secondary"
                    loading={pendingAction === `assign-${item.orderItemId}`}
                    loadingLabel="Memasukkan…"
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
                    Masukkan ke Batch
                  </Button>
                </div>
              ))
            ) : unassignedPage.isDone ? (
              <p className="subtle">Semua pesanan eligible sudah masuk otomatis atau belum memiliki pengecualian.</p>
            ) : null}
            <AdminPagination
              {...currentBatchUnassignedPagination}
              rowCount={unassignedRows.length}
              isDone={unassignedPage.isDone}
              continueCursor={unassignedPage.continueCursor}
            />
          </Card>

          <Card style={{ order: 8 }}>
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
          <ConfirmationDialog
            open={confirmArchive}
            title="Arsipkan batch ini?"
            description="Batch berhenti beroperasi, tetapi tautan, assignment, dan riwayat tetap disimpan."
            confirmLabel="Arsipkan batch"
            onCancel={() => setConfirmArchive(false)}
            onConfirm={() => {
              setConfirmArchive(false);
              void run(() => archiveBatch(batchId), "Batch diarsipkan.", "archive");
            }}
          />
          <ConfirmationDialog
            open={confirmDelete}
            title="Hapus batch ini?"
            description="Hanya Batch draf yang benar-benar kosong tanpa tautan, assignment, atau riwayat yang dapat dihapus."
            confirmLabel="Hapus batch"
            danger
            onCancel={() => setConfirmDelete(false)}
            onConfirm={() => {
              setConfirmDelete(false);
              void run(
                async () => {
                  await removeBatch(batchId);
                  router.push("/admin/batches");
                },
                "Batch dihapus.",
                "delete",
              );
            }}
          />
        </div>
      </div>
    </div>
  );
}

function BatchMetadataForm({
  batch,
  updateBatch,
  disabled,
  onDone,
}: {
  batch: BatchDetail;
  updateBatch: (
    batchId: string,
    input: { name: string; description?: string; poDeadlineAt?: number },
  ) => Promise<unknown>;
  disabled: boolean;
  onDone: () => void;
}) {
  const [name, setName] = useState(batch.name);
  const [description, setDescription] = useState(batch.description || "");
  const [poDeadlineAt, setPoDeadlineAt] = useState(formatBatchDeadlineInput(batch.poDeadlineAt));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await updateBatch(batch.batchId, {
        name,
        description,
        poDeadlineAt: poDeadlineAt ? calendarDateToEndTimestamp(poDeadlineAt) : undefined,
      });
      onDone();
    } catch (reason) {
      setError(productErrorMessage(reason, "Informasi Batch belum berhasil disimpan. Silakan coba lagi."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-card" onSubmit={submit}>
      <div className="form-grid">
        <Field label="Nama">
          <input
            className="input"
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={disabled || pending}
            required
          />
        </Field>
        <Field label="Deadline PO" hint="Batas finalisasi roster dan jumlah pembelian sebelum PO dikunci.">
          <input
            className="input"
            type="date"
            value={poDeadlineAt}
            onChange={(event) => setPoDeadlineAt(event.target.value)}
            disabled={disabled || pending}
          />
        </Field>
      </div>
      <Field label="Deskripsi">
        <textarea
          className="textarea"
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          disabled={disabled || pending}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" loading={pending} loadingLabel="Menyimpan…" disabled={disabled}>
          Simpan informasi Batch
        </Button>
        {error ? (
          <span className="error-text" role="alert">
            {error}
          </span>
        ) : null}
      </div>
    </form>
  );
}

function EtaCargoForm({
  batchId,
  etaCargoMonth,
  updateEtaCargoMonth,
  disabled,
  onDone,
}: {
  batchId: string;
  etaCargoMonth: string | null;
  updateEtaCargoMonth: (batchId: string, etaCargoMonth?: string) => Promise<unknown>;
  disabled: boolean;
  onDone: () => void;
}) {
  const [value, setValue] = useState(etaCargoMonth || "");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await updateEtaCargoMonth(batchId, value || undefined);
      onDone();
    } catch (reason) {
      setError(productErrorMessage(reason, "ETA Cargo belum dapat diperbarui."));
    } finally {
      setPending(false);
    }
  }

  return (
    <form className="form-actions" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Bulan ETA Cargo</span>
        <input
          aria-label="Bulan ETA Cargo"
          className="input"
          type="month"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          disabled={disabled || pending}
        />
      </label>
      <Button type="submit" loading={pending} loadingLabel="Menyimpan…" disabled={disabled}>
        Simpan ETA Cargo
      </Button>
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

function AssignmentQuantityForm({
  assignment,
  batchId,
  assignOrderItem,
  onDone,
}: {
  assignment: BatchDetail["assignments"][number];
  batchId: string;
  assignOrderItem: (orderItemId: string, batchId: string, assignedQuantity: number) => Promise<unknown>;
  onDone: () => void;
}) {
  const [quantity, setQuantity] = useState(String(assignment.assignedQuantity));
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      await assignOrderItem(assignment.orderItemId, batchId, Number(quantity));
      onDone();
    } catch (reason) {
      setError(productErrorMessage(reason, "Jumlah belum dapat diperbarui."));
    } finally {
      setPending(false);
    }
  }
  return (
    <form className="form-actions" onSubmit={submit}>
      <label className="field">
        <span className="field-label">Jumlah assignment</span>
        <input
          aria-label={`Jumlah ${assignment.bookTitle} untuk ${assignment.customerName}`}
          className="input"
          type="number"
          min="1"
          max={assignment.orderedQuantity}
          step="1"
          value={quantity}
          onChange={(event) => setQuantity(event.target.value)}
          required
        />
      </label>
      <Button type="submit" variant="primary" loading={pending} loadingLabel="Menyimpan…">
        Simpan jumlah
      </Button>
      {error ? (
        <span className="error-text" role="alert">
          {error}
        </span>
      ) : null}
    </form>
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
