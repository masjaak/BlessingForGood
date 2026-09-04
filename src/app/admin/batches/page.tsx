"use client";

import { useState } from "react";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminNav } from "@/components/admin-nav";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { formatCargoEta, shipmentStageLabels } from "@/domain/prototype/operations";
import { useOperations } from "@/domain/prototype/operations-context";
import { productErrorMessage } from "@/domain/prototype/errors";
import { useProduct } from "@/domain/prototype/store";
import { SiteShell } from "@/components/site-shell";
import { calendarDateToEndTimestamp, formatBfgCalendarDate } from "@/lib/calendar-date";

function CreateBatchForm() {
  const { createBatch } = useOperations();
  const [name, setName] = useState("");
  const [referenceCode, setReferenceCode] = useState("");
  const [description, setDescription] = useState("");
  const [poDeadlineAt, setPoDeadlineAt] = useState("");
  const [etaCargoMonth, setEtaCargoMonth] = useState("");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSubmitting(true);
    try {
      await createBatch({
        name,
        referenceCode: referenceCode || undefined,
        description: description || undefined,
        poDeadlineAt: calendarDateToEndTimestamp(poDeadlineAt),
        etaCargoMonth: etaCargoMonth || undefined,
      });
      setName("");
      setReferenceCode("");
      setDescription("");
      setPoDeadlineAt("");
      setEtaCargoMonth("");
      setMessage("Batch berhasil dibuat.");
    } catch (reason) {
      setMessage(productErrorMessage(reason, "Batch belum dapat dibuat."));
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <Card>
      <span className="card-kicker">Cargo baru</span>
      <h2>Buat batch</h2>
      <form className="form-card admin-batch-create-form" onSubmit={handleSubmit}>
        <div className="form-grid">
          <Field label="Nama">
            <input className="input" value={name} onChange={(event) => setName(event.target.value)} required />
          </Field>
          <Field label="Kode referensi">
            <input className="input" value={referenceCode} onChange={(event) => setReferenceCode(event.target.value)} />
          </Field>
          <Field label="Deadline PO" hint="Batas finalisasi roster dan jumlah pembelian sebelum PO dikunci.">
            <input
              className="input"
              type="date"
              value={poDeadlineAt}
              onChange={(event) => setPoDeadlineAt(event.target.value)}
              required
            />
          </Field>
          <Field label="ETA Cargo" hint="Estimasi tiba dalam format bulan dan tahun">
            <input
              className="input"
              type="month"
              value={etaCargoMonth}
              onChange={(event) => setEtaCargoMonth(event.target.value)}
            />
          </Field>
        </div>
        <Field label="Deskripsi">
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
        </Field>
        <div className="form-actions">
          <Button type="submit" loading={isSubmitting} loadingLabel="Membuat…">
            Buat batch
          </Button>
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
  const { batchList, batchListPagination } = useOperations();
  const { state } = useProduct();
  if (!batchList) {
    return (
      <LoadingRegion label="Memuat batch">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi batch"
        title="Jalankan cargo dengan catatan yang jelas."
        description="Hubungkan katalog, susun roster, kunci PO, dan catat perjalanan kiriman dalam satu alur."
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
                      ? "Diarsipkan"
                      : batch.currentShipmentStage
                        ? shipmentStageLabels[batch.currentShipmentStage]
                        : "Tahap belum ditentukan"}
                  </StatusBadge>
                </div>
                <p className="subtle">{batch.description || "Tanpa deskripsi"}</p>
                <div className="summary-line">
                  <span>Deadline PO</span>
                  <strong>{batch.poDeadlineAt ? formatBfgCalendarDate(batch.poDeadlineAt) : "Belum ditentukan"}</strong>
                </div>
                <div className="summary-line">
                  <span>ETA Cargo</span>
                  <strong>{formatCargoEta(batch.etaCargoMonth)}</strong>
                </div>
                <div className="summary-line">
                  <span>Katalog terhubung</span>
                  <strong>{batch.catalogLinks.length}</strong>
                </div>
                <div className="summary-line">
                  <span>Roster</span>
                  <strong>
                    {batch.rosterLocked ? "Dikunci" : "Dapat diubah"} · {batch.assignmentCount} penugasan ·{" "}
                    {batch.customerCount} pelanggan
                  </strong>
                </div>
                <div className="summary-line">
                  <span>Jumlah yang ditugaskan</span>
                  <strong>{batch.assignedQuantity}</strong>
                </div>
                {batch.catalogLinks.map((link) => (
                  <div className="summary-line" key={link.catalogId}>
                    <span>{link.catalogName}</span>
                    <span className="subtle">{link.catalogId}</span>
                  </div>
                ))}
                <LinkButton href={`/admin/batches/${batch.batchId}`} variant="secondary">
                  Buka operasi batch
                </LinkButton>
              </Card>
            ))
          ) : (
            <EmptyState
              title="Belum ada batch"
              description="Buat catatan cargo pertama saat ada batch nyata yang siap dioperasikan."
              action={
                <LinkButton href="/admin/orders" variant="secondary">
                  Tinjau pesanan
                </LinkButton>
              }
            />
          )}
          <AdminPagination
            {...batchListPagination}
            rowCount={batchList.page.length}
            isDone={batchList.isDone}
            continueCursor={batchList.continueCursor}
          />
          <p className="subtle">Katalog yang tersedia untuk operasi batch: {state.catalogs.length}.</p>
        </div>
      </div>
    </div>
  );
}

export default function AdminBatchesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminBatches />
      </ProductAccessGuard>
    </SiteShell>
  );
}
