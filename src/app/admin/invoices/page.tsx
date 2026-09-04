"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminPagination } from "@/components/admin-pagination";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import {
  ActionGroup,
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";
import { formatIdr } from "@/domain/prototype/logic";
import { invoicePaymentStatusLabel, invoiceStatusLabel } from "@/domain/prototype/operations";
import { useOperations, type InvoiceRequirementMode } from "@/domain/prototype/operations-context";
import { SiteShell } from "@/components/site-shell";
import { invoiceReference } from "@/domain/prototype/invoice-reference";
import { productErrorMessage } from "@/domain/prototype/errors";
import { percentageToBasisPoints } from "@/lib/percentage";
import { useAdminCursorPagination } from "@/domain/prototype/pagination";

export function PersistentRequirementForm({ orderId }: { orderId: string }) {
  const { createInvoice, issueInvoice } = useOperations();
  const [mode, setMode] = useState<InvoiceRequirementMode>("none");
  const [value, setValue] = useState("");
  const [message, setMessage] = useState("");
  const [pendingAction, setPendingAction] = useState<"draft" | "issue" | null>(null);
  const [createdInvoiceId, setCreatedInvoiceId] = useState<string | null>(null);

  async function saveInvoice(issue: boolean) {
    setMessage("");
    setCreatedInvoiceId(null);
    setPendingAction(issue ? "issue" : "draft");
    let invoiceId: string | null = null;
    try {
      const numericValue = mode === "none" ? undefined : Number(value);
      if (mode === "percentage" && numericValue !== undefined) percentageToBasisPoints(numericValue);
      const draft = await createInvoice(orderId, mode, numericValue);
      invoiceId = draft.invoiceId;
      setCreatedInvoiceId(invoiceId);
      if (issue) {
        await issueInvoice(invoiceId);
        setMessage("Invoice diterbitkan.");
      } else {
        setMessage("Draf invoice tersimpan.");
      }
      setValue("");
    } catch (reason) {
      setMessage(
        invoiceId
          ? "Draf tersimpan, tetapi invoice belum diterbitkan. Buka operasi invoice untuk mencoba lagi."
          : productErrorMessage(reason, "Invoice tidak dapat dibuat."),
      );
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <form
      className="form-actions"
      onSubmit={(event) => {
        event.preventDefault();
        void saveInvoice(false);
      }}
    >
      <label className="field">
        <span className="field-label">Syarat deposit</span>
        <BFGSelect
          className="select"
          value={mode}
          onChange={(event) => setMode(event.target.value as InvoiceRequirementMode)}
        >
          <option value="none">Tidak ada</option>
          <option value="fixed">Nominal tetap (IDR)</option>
          <option value="percentage">Persentase (%)</option>
        </BFGSelect>
      </label>
      {mode !== "none" ? (
        <Field label={mode === "fixed" ? "Nominal (IDR)" : "Persentase (0–100%)"}>
          <input
            className="input"
            type="number"
            min="0"
            max={mode === "percentage" ? 100 : undefined}
            step={mode === "percentage" ? "0.01" : "1"}
            value={value}
            onChange={(event) => setValue(event.target.value)}
            required
          />
        </Field>
      ) : null}
      <ActionGroup variant="responsive">
        <Button
          type="submit"
          variant="secondary"
          loading={pendingAction === "draft"}
          disabled={pendingAction !== null}
          loadingLabel="Menyimpan…"
        >
          Simpan draf
        </Button>
        <Button
          type="button"
          variant="primary"
          loading={pendingAction === "issue"}
          disabled={pendingAction !== null}
          loadingLabel="Menerbitkan…"
          onClick={() => void saveInvoice(true)}
        >
          Terbitkan invoice
        </Button>
        {createdInvoiceId ? (
          <LinkButton href={`/admin/invoices/${createdInvoiceId}`} variant="tertiary">
            Buka operasi invoice
          </LinkButton>
        ) : null}
        {message ? (
          <span className="subtle action-support" role="status">
            {message}
          </span>
        ) : null}
      </ActionGroup>
    </form>
  );
}

function IssueInvoiceButton({ invoiceId }: { invoiceId: string }) {
  const { issueInvoice } = useOperations();
  const [message, setMessage] = useState("");
  const [isIssuing, setIsIssuing] = useState(false);

  async function issue() {
    setMessage("");
    setIsIssuing(true);
    try {
      await issueInvoice(invoiceId);
      setMessage("Diterbitkan.");
    } catch (reason) {
      setMessage(productErrorMessage(reason, "Invoice tidak dapat diterbitkan."));
    } finally {
      setIsIssuing(false);
    }
  }

  return (
    <ActionGroup variant="responsive">
      <Button
        type="button"
        variant="primary"
        loading={isIssuing}
        loadingLabel="Menerbitkan…"
        onClick={() => void issue()}
      >
        Terbitkan invoice
      </Button>
      {message ? (
        <span className="subtle action-support" role="status">
          {message}
        </span>
      ) : null}
    </ActionGroup>
  );
}

function CustomerBatchInvoiceQueue({ customerId: requestedCustomerId }: { customerId: string | null }) {
  const pagination = useAdminCursorPagination();
  const [customerId, setCustomerId] = useState(requestedCustomerId || "");
  const [batchId, setBatchId] = useState("");
  const customers = useQuery(api.orders.listEligibleCustomers, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const batches = useQuery(api.batches.listForAdmin, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const rows = useQuery(api.invoices.listReadyForIssuance, {
    paginationOpts: { numItems: pagination.pageSize, cursor: pagination.cursor },
    customerUserId: customerId ? (customerId as Id<"appUsers">) : undefined,
    batchId: batchId ? (batchId as Id<"batches">) : undefined,
  });
  const issueCustomerBatch = useMutation(api.invoices.issueCustomerBatch);
  const [mode, setMode] = useState<InvoiceRequirementMode>("none");
  const [value, setValue] = useState("");
  const [selected, setSelected] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);
  const [report, setReport] = useState("");
  const pageRows = rows?.page || [];
  const hasFilters = Boolean(customerId || batchId);

  function updateFilter(setter: (value: string) => void, value: string) {
    setter(value);
    pagination.reset();
    setSelected([]);
    setReport("");
  }

  function requirementValue() {
    if (mode === "none") return undefined;
    const numericValue = Number(value);
    return mode === "percentage" ? percentageToBasisPoints(numericValue) : numericValue;
  }

  async function issueRow(row: (typeof pageRows)[number]) {
    setPending(`${row.batchId}:${row.customerUserId}`);
    setReport("");
    try {
      await issueCustomerBatch({
        customerUserId: row.customerUserId,
        batchId: row.batchId,
        depositRequirementMode: mode,
        depositRequirementValue: requirementValue(),
      });
      setReport("Invoice diterbitkan.");
    } catch (reason) {
      setReport(productErrorMessage(reason, "Invoice tidak dapat diterbitkan."));
    } finally {
      setPending(null);
    }
  }

  async function issueSelected() {
    const targets = pageRows.filter((row) => row.eligible && selected.includes(`${row.batchId}:${row.customerUserId}`));
    if (!targets.length) {
      setReport("Pilih Customer yang eligible terlebih dahulu.");
      return;
    }
    if (targets.length > 100) {
      setReport("Maksimal 100 Customer per proses.");
      return;
    }
    setPending("bulk");
    setReport("");
    try {
      const results = await Promise.allSettled(
        targets.map((row) =>
          issueCustomerBatch({
            customerUserId: row.customerUserId,
            batchId: row.batchId,
            depositRequirementMode: mode,
            depositRequirementValue: requirementValue(),
          }),
        ),
      );
      const successCount = results.filter((result) => result.status === "fulfilled").length;
      const failedCount = results.length - successCount;
      setReport(
        `${successCount} berhasil${failedCount ? `, ${failedCount} gagal — pilih ulang untuk mencoba lagi.` : "."}`,
      );
      setSelected(
        targets
          .filter((_, index) => results[index].status === "rejected")
          .map((row) => `${row.batchId}:${row.customerUserId}`),
      );
    } catch (reason) {
      setReport(productErrorMessage(reason, "Bulk invoice tidak dapat diproses."));
    } finally {
      setPending(null);
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">Customer × Batch</span>
          <h2>Antrian invoice siap terbit</h2>
        </div>
        <StatusBadge>{pageRows.filter((row) => row.eligible).length} eligible</StatusBadge>
      </div>
      <p className="subtle">
        Satu Customer dalam satu Batch hanya memiliki satu invoice aktif. Pilih Customer secara eksplisit untuk bulk.
      </p>
      <div className="admin-finance-filter-grid">
        <Field label="Pelanggan">
          <BFGSelect
            aria-label="Pelanggan"
            className="select"
            value={customerId}
            onChange={(event) => updateFilter(setCustomerId, event.target.value)}
          >
            <option value="">Semua pelanggan</option>
            {customers?.page.map((customer) => (
              <option key={customer.customerUserId} value={customer.customerUserId}>
                {customer.displayName} · {customer.memberCode || "tanpa kode"}
              </option>
            ))}
          </BFGSelect>
        </Field>
        <Field label="Batch / Cargo">
          <BFGSelect
            aria-label="Batch / Cargo"
            className="select"
            value={batchId}
            onChange={(event) => updateFilter(setBatchId, event.target.value)}
          >
            <option value="">Semua Batch</option>
            {batches?.page
              .filter((batch) => !batch.isArchived && batch.currentShipmentStage)
              .map((batch) => (
                <option key={batch.batchId} value={batch.batchId}>
                  {batch.referenceCode ? `${batch.referenceCode} · ` : ""}
                  {batch.name}
                </option>
              ))}
          </BFGSelect>
        </Field>
        <Button
          type="button"
          variant="tertiary"
          disabled={!hasFilters}
          onClick={() => {
            setCustomerId("");
            setBatchId("");
            pagination.reset();
            setSelected([]);
            setReport("");
          }}
        >
          Reset filter
        </Button>
      </div>
      <div className="form-grid invoice-issue-requirement">
        <label className="field">
          <span className="field-label">Syarat deposit</span>
          <BFGSelect
            className="select"
            value={mode}
            onChange={(event) => setMode(event.target.value as InvoiceRequirementMode)}
          >
            <option value="none">Tidak ada</option>
            <option value="fixed">Nominal tetap (IDR)</option>
            <option value="percentage">Persentase (%)</option>
          </BFGSelect>
        </label>
        {mode !== "none" ? (
          <Field label={mode === "fixed" ? "Nominal (IDR)" : "Persentase (0–100%)"}>
            <input
              className="input"
              type="number"
              min="0"
              max={mode === "percentage" ? 100 : undefined}
              step={mode === "percentage" ? "0.01" : "1"}
              value={value}
              onChange={(event) => setValue(event.target.value)}
              required
            />
          </Field>
        ) : null}
      </div>
      <ActionGroup className="invoice-issue-bulk-actions" variant="responsive">
        <Button type="button" variant="primary" loading={pending === "bulk"} onClick={() => void issueSelected()}>
          Terbitkan invoice terpilih
        </Button>
        {report ? (
          <span className="subtle action-support" role="status">
            {report}
          </span>
        ) : null}
      </ActionGroup>
      {rows === undefined ? <p className="subtle">Memuat pool Customer × Batch…</p> : null}
      {pageRows.length ? (
        <div className="content-stack invoice-issue-list">
          {pageRows.map((row) => {
            const rowKey = `${row.batchId}:${row.customerUserId}`;
            return (
              <div className="invoice-issue-row" data-testid="invoice-issue-row" key={rowKey}>
                <label className="invoice-issue-select">
                  <input
                    aria-label={`Pilih ${row.customerName} · ${row.batchName}`}
                    type="checkbox"
                    checked={selected.includes(rowKey)}
                    disabled={!row.eligible || pending !== null}
                    onChange={(event) =>
                      setSelected((current) =>
                        event.target.checked ? [...current, rowKey] : current.filter((key) => key !== rowKey),
                      )
                    }
                  />
                </label>
                <div className="invoice-issue-main">
                  <strong>{row.customerName}</strong>
                  <span className="subtle">
                    {row.customerMemberCode ? `${row.customerMemberCode} · ` : ""}
                    {row.batchName} · {row.bookCount} buku · <Money amount={row.totalAmount} />
                  </span>
                </div>
                <div className="invoice-issue-status">
                  {row.invoiceStatus ? (
                    <StatusBadge tone={row.invoiceStatus === "issued" ? "positive" : "neutral"}>
                      {row.invoiceStatus === "issued" ? "Sudah terbit" : row.invoiceStatus}
                    </StatusBadge>
                  ) : !row.eligible ? (
                    <StatusBadge tone="warning">Perlu ditinjau</StatusBadge>
                  ) : null}
                </div>
                <div className="invoice-issue-action">
                  {row.invoiceId ? (
                    <LinkButton href={`/admin/invoices/${row.invoiceId}`} variant="secondary">
                      Buka invoice
                    </LinkButton>
                  ) : row.eligible ? (
                    <Button
                      type="button"
                      variant="primary"
                      disabled={!row.eligible || pending !== null}
                      loading={pending === rowKey}
                      loadingLabel="Menerbitkan…"
                      onClick={() => void issueRow(row)}
                    >
                      Terbitkan invoice
                    </Button>
                  ) : (
                    <span className="subtle">Menunggu pemeriksaan</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : rows ? (
        <p className="subtle">Belum ada pool final yang siap diterbitkan.</p>
      ) : null}
      <AdminPagination
        {...pagination}
        rowCount={pageRows.length}
        isDone={rows?.isDone ?? true}
        continueCursor={rows?.continueCursor ?? ""}
      />
    </Card>
  );
}

function PersistentAdminInvoices() {
  const { adminInvoiceList } = useOperations();
  const searchParams = useSearchParams();
  const requestedCustomerId = searchParams.get("customerId");
  const [invoiceSearch, setInvoiceSearch] = useState("");
  const searchedInvoice = useQuery(
    api.invoices.getByInvoiceNumberForAdmin,
    invoiceSearch.trim() ? { invoiceNumber: invoiceSearch.trim() } : "skip",
  );
  const invoices = adminInvoiceList?.page || [];
  if (!adminInvoiceList) {
    return (
      <LoadingRegion label="Memuat invoice">
        <SkeletonCard variant="invoice" />
        <SkeletonCard variant="invoice" />
      </LoadingRegion>
    );
  }
  const visibleInvoices = invoiceSearch.trim() ? (searchedInvoice ? [searchedInvoice] : []) : invoices;
  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi invoice dan deposit"
        title="Jaga status keuangan tetap jelas."
        description="Invoice memakai snapshot pesanan. Deposit memakai ledger append-only; alokasi, pelepasan, dan pembalikan tetap terpisah."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content">
          <Card>
            <Field label="Cari referensi invoice">
              <input
                className="input"
                value={invoiceSearch}
                onChange={(event) => setInvoiceSearch(event.target.value)}
                placeholder="BFG-INV-YYMMDD-XXXX"
                inputMode="search"
              />
            </Field>
            {invoiceSearch.trim() && searchedInvoice === undefined ? (
              <p className="subtle" role="status">
                Mencari invoice…
              </p>
            ) : null}
            {invoiceSearch.trim() && searchedInvoice === null ? (
              <p className="subtle" role="status">
                Invoice dengan referensi tersebut tidak ditemukan.
              </p>
            ) : null}
          </Card>
          <CustomerBatchInvoiceQueue customerId={requestedCustomerId} />
          {visibleInvoices.length ? (
            <div className="content-stack">
              {visibleInvoices.map((invoice) => (
                <Card key={invoice.invoiceId}>
                  <div className="split-heading">
                    <div>
                      <span className="card-kicker">{invoiceReference(invoice.invoiceNumber)}</span>
                      <h2>{formatIdr(invoice.totalAmount)}</h2>
                    </div>
                    <StatusBadge>{invoiceStatusLabel(invoice.status)}</StatusBadge>
                  </div>
                  <div className="summary-line">
                    <span>Pelanggan</span>
                    <strong>{invoice.customerName}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Referensi pesanan</span>
                    <span>{invoice.orderCode || `BFG-ORD-LEGACY-${invoice.orderId.slice(-8).toUpperCase()}`}</span>
                  </div>
                  <div className="summary-line">
                    <span>Sisa tagihan</span>
                    <strong>{formatIdr(invoice.outstandingAmount)}</strong>
                  </div>
                  <div className="summary-line">
                    <span>Status pembayaran</span>
                    <strong>{invoicePaymentStatusLabel(invoice.paymentStatus)}</strong>
                  </div>
                  <ActionGroup variant="responsive">
                    <LinkButton href={`/admin/invoices/${invoice.invoiceId}`} variant="secondary">
                      Buka operasi invoice
                    </LinkButton>
                    {invoice.status === "draft" ? <IssueInvoiceButton invoiceId={invoice.invoiceId} /> : null}
                  </ActionGroup>
                </Card>
              ))}
            </div>
          ) : (
            <EmptyState
              title="Belum ada invoice"
              description="Buat invoice dari pesanan yang sudah tercatat saat tagihan siap diterbitkan."
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AdminInvoices() {
  return <PersistentAdminInvoices />;
}

export default function AdminInvoicesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminInvoices />
      </ProductAccessGuard>
    </SiteShell>
  );
}
