"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { Button, Card, EmptyState, Field, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";

const initialForm = { name: "", email: "", contact: "", city: "", note: "", acknowledged: false };

function ConnectedJoinForm() {
  const submit = useMutation(api.joinRequests.submit);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    try {
      await submit({
        name: form.name,
        email: form.email,
        contact: form.contact,
        city: form.city || undefined,
        note: form.note || undefined,
        acknowledged: form.acknowledged,
      });
      setSubmitted(true);
    } catch {
      setError("Permintaan belum dapat dikirim. Periksa kembali datamu lalu coba lagi.");
    }
  }

  if (submitted) {
    return (
      <EmptyState
        eyebrow="Permintaan diterima"
        mascotVariant="success"
        title="Terima kasih sudah ingin bergabung."
        description="Admin akan meninjau permintaanmu dan menghubungi melalui kontak yang kamu berikan. Permintaan ini belum otomatis membuat akun atau membuka Secret Catalog."
        primaryAction={<LinkButton href="/community">Kenali komunitas BFG</LinkButton>}
        secondaryAction={
          <LinkButton href="/" variant="secondary">
            Kembali ke beranda
          </LinkButton>
        }
      />
    );
  }

  return (
    <Card className="form-card">
      <div>
        <span className="card-kicker">Join Blessfriends</span>
        <h2>Ceritakan cara terbaik untuk menghubungimu.</h2>
        <p>Setiap permintaan ditinjau sebelum undangan dikirim. Bagikan hanya informasi yang diperlukan.</p>
      </div>
      <form onSubmit={handleSubmit} className="form-card">
        <div className="form-grid">
          <Field label="Nama">
            <input
              className="input"
              value={form.name}
              onChange={(event) => update("name", event.target.value)}
              autoComplete="name"
              maxLength={120}
              required
            />
          </Field>
          <Field label="Email" hint="Digunakan untuk proses undangan jika permintaanmu disetujui.">
            <input
              className="input"
              type="email"
              value={form.email}
              onChange={(event) => update("email", event.target.value)}
              autoComplete="email"
              maxLength={254}
              required
            />
          </Field>
          <Field label="WhatsApp atau telepon">
            <input
              className="input"
              value={form.contact}
              onChange={(event) => update("contact", event.target.value)}
              autoComplete="tel"
              maxLength={80}
              required
            />
          </Field>
          <Field label="Kota atau lokasi" hint="Opsional. Membantu admin saat menindaklanjuti permintaanmu.">
            <input
              className="input"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              autoComplete="address-level2"
              maxLength={120}
            />
          </Field>
        </div>
        <Field label="Catatan singkat" hint="Opsional. Maksimal 500 karakter.">
          <textarea
            className="textarea"
            value={form.note}
            onChange={(event) => update("note", event.target.value)}
            maxLength={500}
            rows={5}
          />
        </Field>
        <label className="check-row">
          <input
            type="checkbox"
            checked={form.acknowledged}
            onChange={(event) => update("acknowledged", event.target.checked)}
            required
          />
          <span>Saya memahami permintaan ini tidak langsung membuat akun atau membuka Secret Catalog.</span>
        </label>
        {error ? (
          <p className="error-text" role="alert">
            {error}
          </p>
        ) : null}
        <Button type="submit">Kirim permintaan</Button>
      </form>
    </Card>
  );
}

function JoinPageContent() {
  const { dataSource, authState } = useProduct();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded || (isSignedIn && authState !== "authenticated" && authState !== "suspended")) {
    return <div className="state-panel">Memeriksa akses BFG…</div>;
  }
  if (isSignedIn) {
    return (
      <Card className="notice-card content-stack">
        <span className="card-kicker">Sudah menjadi Blessfriend</span>
        <h2>Akun BFG-mu sudah aktif.</h2>
        <p>Lanjutkan ke akun atau buka katalog komunitas.</p>
        <div className="actions">
          <LinkButton href="/account">Buka akun</LinkButton>
          <LinkButton href="/catalog" variant="secondary">
            Buka katalog
          </LinkButton>
        </div>
      </Card>
    );
  }
  if (dataSource !== "convex") {
    return (
      <Card className="notice-card">
        <h2>Pendaftaran sedang tidak tersedia.</h2>
        <p>Formulir pendaftaran belum tersedia saat ini. Silakan coba lagi nanti.</p>
      </Card>
    );
  }
  return <ConnectedJoinForm />;
}

export default function JoinPage() {
  return (
    <SiteShell>
      <div className="page narrow-page">
        <PageHeader
          eyebrow="Gabung Blessfriends"
          title="Mulai perjalananmu bersama komunitas BFG."
          description="Kirim permintaan, tunggu tinjauan admin, lalu ikuti langkah undangan bila disetujui."
        />
        <JoinPageContent />
      </div>
    </SiteShell>
  );
}
