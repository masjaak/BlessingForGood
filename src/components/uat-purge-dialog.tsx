"use client";

import { ConfirmationDialog } from "./confirmation-dialog";

type ImpactRow = {
  key: string;
  label: string;
  count: number;
  amount?: number;
};

export type UatImpact = {
  entityType: "catalog" | "batch" | "invoice" | "order";
  entityId: string;
  entityName: string;
  reference?: string | null;
  status: string;
  safe: boolean;
  blocker: string | null;
  delete: ImpactRow[];
  detach: ImpactRow[];
  preserve: ImpactRow[];
};

function formatAmount(amount: number) {
  return `Rp${amount.toLocaleString("id-ID")}`;
}

function ImpactList({ rows }: { rows: ImpactRow[] }) {
  return (
    <ul className="bfg-uat-impact-list">
      {rows.map((item) => (
        <li key={item.key}>
          <span>
            {item.count.toLocaleString("id-ID")} {item.label}
          </span>
          {item.amount !== undefined ? <span>{formatAmount(item.amount)}</span> : null}
        </li>
      ))}
    </ul>
  );
}

function ImpactSection({ title, rows }: { title: string; rows: ImpactRow[] }) {
  return (
    <section className="bfg-uat-impact-section">
      <h3>{title}</h3>
      <ImpactList rows={rows} />
    </section>
  );
}

export function UatPurgeDialog({
  open,
  impact,
  loading = false,
  error = "",
  onConfirm,
  onCancel,
}: {
  open: boolean;
  impact: UatImpact | null | undefined;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const phrase =
    impact?.entityType === "catalog"
      ? "HAPUS KATALOG"
      : impact?.entityType === "batch"
        ? "HAPUS BATCH"
        : impact?.entityType === "order"
          ? "HAPUS PESANAN"
          : "HAPUS INVOICE";
  const entityLabel =
    impact?.entityType === "catalog"
      ? "KATALOG"
      : impact?.entityType === "batch"
        ? "BATCH"
        : impact?.entityType === "order"
          ? "PESANAN"
          : "INVOICE";
  const description =
    "Tindakan ini akan menghapus data dummy beserta data turunannya dari sistem dan tidak dapat dibatalkan. Pastikan record ini bukan data transaksi Customer yang sedang digunakan.";

  return (
    <ConfirmationDialog
      key={open ? "open" : "closed"}
      open={open}
      className="bfg-uat-purge-dialog"
      title="Hapus data UAT permanen?"
      description={description}
      confirmLabel="Hapus permanen"
      danger
      confirmationPhrase={phrase}
      checkboxLabel="Saya memastikan data ini adalah data dummy / UAT dan memang ingin menghapusnya permanen."
      checkboxRequired
      disabled={loading || !impact || !impact.safe}
      onConfirm={onConfirm}
      onCancel={onCancel}
    >
      <div className="bfg-uat-impact" aria-live="polite">
        <div className="bfg-uat-identity">
          <strong>{entityLabel}</strong>
          <span>{impact?.entityName || "Menghitung dampak…"}</span>
          {impact?.reference ? <span>Referensi: {impact.reference}</span> : null}
          {impact ? <span>Status saat ini: {impact.status}</span> : null}
        </div>
        {loading && !impact ? <p className="subtle">Menghitung dampak terbaru…</p> : null}
        {impact ? (
          <>
            <ImpactSection title="Data yang akan dibersihkan" rows={impact.delete} />
            <ImpactSection title="Relasi yang hanya akan dilepas" rows={impact.detach} />
            <ImpactSection title="Tetap disimpan" rows={impact.preserve} />
            {impact.blocker ? (
              <p className="error-text">
                Data UAT belum dapat dihapus karena ditemukan relasi yang belum bisa dibersihkan otomatis:{" "}
                {impact.blocker}
              </p>
            ) : null}
          </>
        ) : null}
        {error ? <p className="error-text">{error}</p> : null}
      </div>
    </ConfirmationDialog>
  );
}
