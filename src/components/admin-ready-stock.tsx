"use client";

import { useMutation, useQuery } from "convex/react";
import { useRef, useState } from "react";
import type { FunctionReturnType } from "convex/server";
import { api } from "../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, Money, StatusBadge } from "@/components/ui";
import { SkeletonSummaryGrid, SkeletonTableBlock } from "@/components/workspace-skeleton-primitives";
import { SiteShell } from "@/components/site-shell";

function number(value: number) {
  return value.toLocaleString("id-ID");
}

type ReadyStockRows = Awaited<FunctionReturnType<typeof api.readyStock.listForAdmin>>;

function PriceEditor({
  row,
  onClose,
  onSaved,
}: {
  row: ReadyStockRows[number];
  onClose: () => void;
  onSaved: (message: string) => void;
}) {
  const setPrice = useMutation(api.readyStock.setPriceOverride);
  const [price, setPriceInput] = useState(String(row.effectivePriceAmount));
  const [pending, setPending] = useState(false);
  const submitting = useRef(false);
  const [error, setError] = useState("");

  async function save(amount: number | null) {
    if (submitting.current) return;
    setError("");
    if (amount !== null && (!Number.isSafeInteger(amount) || amount <= 0)) {
      setError("Masukkan harga Rupiah bulat lebih dari 0.");
      return;
    }
    submitting.current = true;
    setPending(true);
    try {
      await setPrice({ bookVariantId: row.variantId, priceOverrideAmount: amount });
      onSaved(
        amount === null
          ? "Harga Ready Stock kembali mengikuti harga Master."
          : "Harga Ready Stock berhasil diperbarui.",
      );
    } catch {
      setError("Harga Ready Stock belum berhasil diperbarui. Coba lagi.");
    } finally {
      submitting.current = false;
      setPending(false);
    }
  }

  return (
    <form
      className="admin-ready-stock-price-editor"
      onSubmit={(event) => {
        event.preventDefault();
        void save(Number(price));
      }}
    >
      <Field label="Harga Ready Stock" hint={`${row.title} · ${row.format}`}>
        <input
          className="input"
          aria-label="Harga Ready Stock"
          type="number"
          min="1"
          step="1"
          required
          autoFocus
          value={price}
          disabled={pending}
          onChange={(event) => setPriceInput(event.target.value)}
        />
      </Field>
      <div className="form-actions">
        <Button type="submit" loading={pending} loadingLabel="Menyimpan…">
          Simpan harga
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onClose}>
          Batal
        </Button>
        {row.priceOverrideAmount !== null ? (
          <Button type="button" variant="tertiary" disabled={pending} onClick={() => void save(null)}>
            Gunakan harga Master
          </Button>
        ) : null}
      </div>
      {error ? (
        <span className="subtle" role="alert">
          {error}
        </span>
      ) : null}
    </form>
  );
}

const publicationLabels: Record<string, string> = {
  draft: "Draf",
  published: "Terbit",
  special: "Khusus / privat",
  archived: "Diarsipkan",
};

function ReadyStockContent({ rows }: { rows: ReadyStockRows }) {
  const [editing, setEditing] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const editingRow = rows.find((row) => row.variantId === editing);
  const totals = rows.reduce(
    (summary, row) => ({
      onHand: summary.onHand + row.onHandQuantity,
      reserved: summary.reserved + row.reservedQuantity,
      available: summary.available + row.availableQuantity,
    }),
    { onHand: 0, reserved: 0, available: 0 },
  );

  return (
    <>
      <Card className="admin-inventory-summary">
        <div>
          <span className="card-kicker">Stok fisik</span>
          <strong>{number(totals.onHand)}</strong>
          <span className="subtle">Jumlah fisik yang tercatat</span>
        </div>
        <div>
          <span className="card-kicker">Dipesan</span>
          <strong>{number(totals.reserved)}</strong>
          <span className="subtle">Sudah diklaim pesanan aktif</span>
        </div>
        <div>
          <span className="card-kicker">Tersedia</span>
          <strong>{number(totals.available)}</strong>
          <span className="subtle">Dapat dipesan sekarang</span>
        </div>
      </Card>
      {editingRow ? (
        <Card>
          <PriceEditor
            key={editing}
            row={editingRow}
            onClose={() => setEditing(null)}
            onSaved={(text) => {
              setMessage(text);
              setEditing(null);
            }}
          />
        </Card>
      ) : null}
      {message ? (
        <span className="subtle" role="status">
          {message}
        </span>
      ) : null}
      {rows.length ? (
        <div className="table-wrap">
          <table className="data-table admin-stock-table">
            <caption className="sr-only">Daftar Ready Stock per format</caption>
            <thead>
              <tr>
                <th>Buku / ISBN</th>
                <th>Format</th>
                <th>Harga Master</th>
                <th>Harga Ready Stock</th>
                <th>Status</th>
                <th>Stok fisik</th>
                <th>Dipesan</th>
                <th>Tersedia</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.variantId}>
                  <td>
                    <strong>{row.title}</strong>
                    <span className="subtle table-secondary">
                      {row.publisherName} · {row.isbn}
                    </span>
                  </td>
                  <td>{row.format}</td>
                  <td className="admin-ready-stock-price">
                    <Money amount={row.masterPriceAmount} />
                  </td>
                  <td className="admin-ready-stock-price">
                    <Money amount={row.effectivePriceAmount} />
                    <span className="subtle table-secondary">
                      {row.priceOverrideAmount === null ? "Mengikuti harga Master" : "Harga khusus Ready Stock"}
                    </span>
                  </td>
                  <td>
                    <StatusBadge
                      tone={row.publicationStatus === "published" && row.isAvailable ? "positive" : "neutral"}
                    >
                      {row.publicationStatus === "published" && row.isAvailable
                        ? "Tercantum"
                        : publicationLabels[row.publicationStatus] || row.publicationStatus}
                    </StatusBadge>
                  </td>
                  <td className="numeric-cell">{number(row.onHandQuantity)}</td>
                  <td className="numeric-cell">{number(row.reservedQuantity)}</td>
                  <td className="numeric-cell">
                    <strong>{number(row.availableQuantity)}</strong>
                  </td>
                  <td>
                    <div className="form-actions">
                      <Button
                        variant="secondary"
                        disabled={!row.hasInventory || editing !== null}
                        onClick={() => {
                          setMessage("");
                          setEditing(row.variantId);
                        }}
                      >
                        Atur harga
                      </Button>
                      <LinkButton href={`/admin/books/${row.bookId}`} variant="secondary">
                        Edit stok
                      </LinkButton>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <EmptyState
          title="Belum ada format Ready Stock."
          description="Tambahkan format buku dari Master Buku untuk mulai mencatat stok fisik."
          action={<LinkButton href="/admin/books">Buka Master Buku</LinkButton>}
        />
      )}
    </>
  );
}

function ConnectedAdminReadyStock() {
  const rows = useQuery(api.readyStock.listForAdmin, {});

  return (
    <AdminOperationalPage
      eyebrow="Ready Stock"
      title="Stok yang siap diproses."
      description="Stok fisik adalah jumlah yang tercatat. Dipesan berasal dari pesanan aktif. Tersedia selalu dihitung server."
      loading={rows === undefined}
      skeleton={{ titleWidth: "54%", descriptionWidths: ["92%", "56%"], actionWidths: ["142px"] }}
      actions={
        <LinkButton href="/admin/books" variant="secondary">
          Kelola Master Buku
        </LinkButton>
      }
    >
      {rows === undefined ? (
        <LoadingRegion label="Memuat Ready Stock">
          <SkeletonSummaryGrid />
          <SkeletonTableBlock
            rows={8}
            columnWidths={["1.8fr", "0.8fr", "1fr", "1.3fr", "0.85fr", "0.7fr", "0.7fr", "0.7fr", "1fr"]}
          />
        </LoadingRegion>
      ) : (
        <ReadyStockContent rows={rows} />
      )}
    </AdminOperationalPage>
  );
}

export function AdminReadyStock() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <ConnectedAdminReadyStock />
      </ProductAccessGuard>
    </SiteShell>
  );
}
