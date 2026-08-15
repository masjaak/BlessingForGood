"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field } from "@/components/ui";

function SettingsEditor() {
  const settings = useQuery(api.settings.getForAdmin, {});
  const update = useMutation(api.settings.update);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  return (
    <AdminOperationalPage
      eyebrow="Kontrol Owner"
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
              await update({
                storeName: String(data.get("storeName")),
                whatsappNumber: String(data.get("whatsappNumber")),
                paymentInstructions: String(data.get("paymentInstructions")),
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
          <Field label="Instruksi pembayaran">
            <textarea
              className="textarea"
              name="paymentInstructions"
              defaultValue={settings?.paymentInstructions || ""}
              required
            />
          </Field>
          <Button pending={pending} pendingLabel="Menyimpan…">
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
      <ProductAccessGuard requiredRole="owner">
        <SettingsEditor />
      </ProductAccessGuard>
    </SiteShell>
  );
}
