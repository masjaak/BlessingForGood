"use client";

import { useAction, useQuery } from "convex/react";
import { useAuth } from "@clerk/nextjs";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { BFGFilePicker } from "@/components/bfg-file-picker";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { uploadBfgFile } from "@/lib/upload-file";
import { SiteShell } from "@/components/site-shell";
import {
  Button,
  Card,
  EmptyState,
  Field,
  LoadingRegion,
  Money,
  PageHeader,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";

function DepositPage() {
  const account = useQuery(api.depositAccounts.getMine, {});
  const transactions = useQuery(api.depositTransactions.listMine, { paginationOpts: { numItems: 100, cursor: null } });
  const topUps = useQuery(api.depositTopUps.listMine, {});
  const submit = useAction(api.depositTopUps.submit);
  const { getToken } = useAuth();
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setMessage("");
    try {
      if (
        !file ||
        !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(file.type) ||
        file.size > 5_000_000
      )
        throw new Error();
      const storageId = await uploadBfgFile(file, "deposit-proof", getToken);
      await submit({
        amount: Number(amount),
        bankReference: reference || undefined,
        storageId,
        fileName: file.name,
        mimeType: file.type,
      });
      setAmount("");
      setReference("");
      setFile(null);
      setMessage("Top-up dikirim untuk verifikasi Admin.");
    } catch {
      setMessage("Top-up ditolak. Gunakan jumlah IDR valid dan bukti JPG, PNG, WebP, atau PDF maksimal 5 MB.");
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="page">
      <PageHeader
        eyebrow="Deposit"
        title="Saldo dan top-up"
        description="Top-up baru menambah saldo hanya setelah bukti transfer diverifikasi Admin."
      />
      {account === undefined || transactions === undefined || topUps === undefined ? (
        <LoadingRegion label="Memuat deposit">
          <SkeletonCard />
          <SkeletonCard />
        </LoadingRegion>
      ) : (
        <div className="two-column">
          <div className="content-stack">
            <Card>
              <span className="card-kicker">Saldo tersedia</span>
              <strong className="metric-value metric-money">
                <Money amount={account.account?.availableAmount || 0} />
              </strong>
              <p className="subtle">
                <Money amount={account.account?.reservedAmount || 0} /> sedang direservasi.
              </p>
            </Card>
            <Card>
              <span className="card-kicker">Riwayat ledger</span>
              <h2>Transaksi deposit</h2>
              {transactions.page.length ? (
                transactions.page.map((row) => (
                  <div className="summary-line" key={row.transactionId}>
                    <span>
                      {row.type} · {new Date(row.createdAt).toLocaleString("id-ID")}
                    </span>
                    <Money amount={row.amount} />
                  </div>
                ))
              ) : (
                <p className="subtle">Belum ada transaksi deposit.</p>
              )}
            </Card>
          </div>
          <div className="content-stack">
            <Card>
              <span className="card-kicker">Top-up</span>
              <h2>Kirim bukti transfer</h2>
              <form className="form-card" onSubmit={send}>
                <Field label="Jumlah IDR">
                  <input
                    className="input"
                    type="number"
                    min="1"
                    step="1"
                    value={amount}
                    onChange={(event) => setAmount(event.target.value)}
                    required
                  />
                </Field>
                <Field label="Referensi bank (opsional)">
                  <input className="input" value={reference} onChange={(event) => setReference(event.target.value)} />
                </Field>
                <BFGFilePicker
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  ariaLabel="Pilih bukti transfer"
                  buttonLabel="Pilih bukti transfer"
                  changeLabel="Ganti bukti transfer"
                  file={file}
                  helper="JPG, PNG, WebP, atau PDF. Maksimal 5 MB."
                  label="Bukti transfer"
                  onFileChange={setFile}
                  required
                />
                <Button pending={pending} pendingLabel="Mengunggah…">
                  Kirim top-up
                </Button>
              </form>
              {message ? (
                <p className="success-banner" role="status">
                  {message}
                </p>
              ) : null}
            </Card>
            <Card>
              <span className="card-kicker">Riwayat top-up</span>
              {topUps.length ? (
                topUps.map((row) => (
                  <div className="summary-line" key={row.topUpId}>
                    <span>
                      <Money amount={row.amount} /> · {new Date(row.createdAt).toLocaleDateString("id-ID")}
                      {row.rejectionReason ? <small>{row.rejectionReason}</small> : null}
                    </span>
                    <StatusBadge
                      tone={row.status === "approved" ? "positive" : row.status === "rejected" ? "warning" : "neutral"}
                    >
                      {row.status}
                    </StatusBadge>
                  </div>
                ))
              ) : (
                <EmptyState
                  title="Belum ada top-up"
                  description="Permintaan top-up akan tampil di sini."
                  mascotVariant={false}
                />
              )}
            </Card>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomerDepositPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer">
        <DepositPage />
      </ProductAccessGuard>
    </SiteShell>
  );
}
