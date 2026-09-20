"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";

function SettingsEditor() {
  const settings = useQuery(api.settings.getForAdmin, {});
  const update = useMutation(api.settings.update);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  if (settings === undefined) {
    return (
      <AdminOperationalPage
        eyebrow="Kontrol operasional"
        title="Pengaturan"
        description="Instruksi penting untuk toko, kontak, dan pembayaran. Ini tidak mengaktifkan otomasi WhatsApp API atau gateway pembayaran."
        loading
        skeleton={{ titleWidth: "38%", descriptionWidths: ["92%", "68%"] }}
      >
        <LoadingRegion label="Memuat pengaturan">
          <Card aria-hidden="true">
            <div className="form-card">
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-field" />
              <SkeletonText width="34%" />
              <div className="workspace-skeleton-form-grid">
                <Skeleton className="skeleton-field" />
                <Skeleton className="skeleton-field" />
              </div>
              <SkeletonText width="34%" />
              <div className="workspace-skeleton-form-grid">
                <Skeleton className="skeleton-field" />
                <Skeleton className="skeleton-field" />
                <Skeleton className="skeleton-field" />
              </div>
              <Skeleton className="skeleton-field" />
              <Skeleton className="skeleton-cta" />
            </div>
          </Card>
        </LoadingRegion>
      </AdminOperationalPage>
    );
  }
  return (
    <AdminOperationalPage
      eyebrow="Kontrol operasional"
      title="Pengaturan"
      description="Instruksi penting untuk toko, kontak, dan pembayaran. Ini tidak mengaktifkan otomasi WhatsApp API atau gateway pembayaran."
    >
      <Card>
        <form
          className="form-card"
          onSubmit={async (event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            setPending(true);
            setMessage("");
            try {
              const optionalValue = (name: string) => String(data.get(name) || "").trim() || undefined;
              await update({
                storeName: String(data.get("storeName")),
                whatsappNumber: String(data.get("whatsappNumber")),
                paymentInstructions: String(data.get("paymentInstructions")),
                supportEmail: optionalValue("supportEmail"),
                socialContact: optionalValue("socialContact"),
                bankName: optionalValue("bankName"),
                bankAccountNumber: optionalValue("bankAccountNumber"),
                bankAccountName: optionalValue("bankAccountName"),
              });
              setMessage("Pengaturan tersimpan dan dicatat di log aktivitas.");
            } catch {
              setMessage("Pengaturan ditolak.");
            } finally {
              setPending(false);
            }
          }}
          key={settings?.updatedAt || "empty"}
        >
          <Field label="Nama toko">
            <input className="input" name="storeName" defaultValue={settings?.storeName || ""} required />
          </Field>
          <Field label="Nomor WhatsApp manual">
            <input className="input" name="whatsappNumber" defaultValue={settings?.whatsappNumber || ""} required />
          </Field>
          <div className="section-heading">
            <div>
              <span className="card-kicker">Kontak operasional (opsional)</span>
              <p className="subtle">Tampil bersama informasi bantuan pembayaran pelanggan jika diisi.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Email bantuan">
              <input className="input" name="supportEmail" type="email" defaultValue={settings?.supportEmail || ""} />
            </Field>
            <Field label="Instagram / kontak sosial">
              <input className="input" name="socialContact" defaultValue={settings?.socialContact || ""} />
            </Field>
          </div>
          <div className="section-heading">
            <div>
              <span className="card-kicker">Pembayaran manual (opsional)</span>
              <p className="subtle">Detail ini membantu pelanggan membayar secara manual; bukan gateway pembayaran.</p>
            </div>
          </div>
          <div className="form-grid">
            <Field label="Nama bank">
              <input className="input" name="bankName" defaultValue={settings?.bankName || ""} />
            </Field>
            <Field label="Nomor rekening">
              <input className="input" name="bankAccountNumber" defaultValue={settings?.bankAccountNumber || ""} />
            </Field>
            <Field label="Nama pemilik rekening">
              <input className="input" name="bankAccountName" defaultValue={settings?.bankAccountName || ""} />
            </Field>
          </div>
          <Field label="Instruksi pembayaran">
            <textarea
              className="textarea"
              name="paymentInstructions"
              defaultValue={settings?.paymentInstructions || ""}
              required
            />
          </Field>
          <Button loading={pending} loadingLabel="Menyimpan…">
            Simpan pengaturan
          </Button>
        </form>
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}

export default function AdminSettingsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <SettingsEditor />
      </ProductAccessGuard>
    </SiteShell>
  );
}
