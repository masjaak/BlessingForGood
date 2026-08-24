"use client";

import { useAuth } from "@clerk/nextjs";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../convex/_generated/api";
import { BrandMascot } from "@/components/brand";
import { BFGSelect } from "@/components/bfg-select";
import { Button, Card, ErrorState, Field, LinkButton, PageHeader } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { productErrorMessage } from "@/domain/prototype/errors";
import { useProduct } from "@/domain/prototype/store";

const bookInterestOptions = [
  "Children & Picture Books",
  "Middle Grade",
  "Young Adult",
  "Fiction & Novel",
  "Non-fiction",
  "Art & Design",
  "Architecture & Interiors",
  "Photography",
  "Fashion",
  "Food & Cookbooks",
  "Travel",
  "Biography & Memoir",
  "Comics & Graphic Novels",
  "Collector & Special Editions",
  "Other",
  "Children Books",
  "Collector Books",
  "Novel",
] as const;

const initialForm = {
  name: "",
  email: "",
  contact: "",
  city: "",
  bookInterest: "Children Books" as const,
  note: "",
  acknowledged: false,
};

function ConnectedJoinForm() {
  const submit = useMutation(api.joinRequests.submit);
  const [form, setForm] = useState(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [whatsappGroupUrl, setWhatsappGroupUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  function update(field: keyof typeof initialForm, value: string | boolean) {
    setForm((current) => ({ ...current, [field]: value }));
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setIsSubmitting(true);
    try {
      const result = await submit({
        name: form.name,
        email: form.email,
        contact: form.contact,
        city: form.city,
        bookInterest: form.bookInterest,
        note: form.note || undefined,
        acknowledged: form.acknowledged,
      });
      setWhatsappGroupUrl(result.whatsappGroupUrl);
      setSubmitted(true);
    } catch (reason) {
      setError(productErrorMessage(reason, "Permintaan belum dapat dikirim. Coba lagi sebentar."));
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <Card className="success-card join-success-card">
        <BrandMascot variant="success" className="success-mascot" />
        <span className="card-kicker">Permintaan diterima</span>
        <h2>Permintaanmu sudah dikirim.</h2>
        <p>
          Tim BFG akan meninjaunya terlebih dahulu. Jika disetujui, undangan akan dikirim ke email yang kamu gunakan.
        </p>
        {whatsappGroupUrl ? (
          <LinkButton variant="primary" href={whatsappGroupUrl} target="_blank" rel="noreferrer">
            Gabung WhatsApp Group
          </LinkButton>
        ) : (
          <p className="success-banner" role="status">
            Permintaanmu sudah kami terima. Link grup sedang disiapkan.
          </p>
        )}
        <div className="actions">
          <LinkButton href="/community" variant="secondary">
            Kenali komunitas BFG
          </LinkButton>
          <LinkButton href="/" variant="tertiary">
            Kembali ke beranda
          </LinkButton>
        </div>
      </Card>
    );
  }

  return (
    <Card className="form-card">
      <div>
        <span className="card-kicker">Gabung Blessfriends</span>
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
          <Field label="Area domisili" hint="Cukup kota atau area, tanpa alamat lengkap.">
            <input
              className="input"
              value={form.city}
              onChange={(event) => update("city", event.target.value)}
              autoComplete="address-level2"
              maxLength={120}
              placeholder="Contoh: Jakarta Selatan"
              required
            />
          </Field>
          <Field label="Minat buku">
            <BFGSelect
              className="input"
              name="bookInterest"
              value={form.bookInterest}
              onChange={(event) => update("bookInterest", event.target.value)}
              required
            >
              {bookInterestOptions.map((interest) => (
                <option key={interest}>{interest}</option>
              ))}
            </BFGSelect>
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
        <Button type="submit" loading={isSubmitting} loadingLabel="Mengirim…">
          Kirim permintaan
        </Button>
      </form>
    </Card>
  );
}

function JoinPageContent() {
  const { dataSource, authState, retryAuth } = useProduct();
  const { isLoaded, isSignedIn } = useAuth();
  const joinRequests = useQuery(api.joinRequests.mine, isSignedIn && dataSource === "convex" ? {} : "skip");

  if (isSignedIn && (authState === "convex-error" || authState === "network-error")) {
    return (
      <ErrorState
        title="Sesi BFG belum siap."
        description="Kami belum dapat mengonfirmasi sesi akunmu. Coba lagi sebentar lagi."
        action={<Button onClick={retryAuth}>Coba lagi</Button>}
      />
    );
  }
  if (
    !isLoaded ||
    (isSignedIn && authState !== "authenticated" && authState !== "suspended" && authState !== "admission-required")
  ) {
    return <div className="state-panel">Memeriksa akses BFG…</div>;
  }
  if (isSignedIn && authState === "admission-required") {
    if (joinRequests === undefined) return <div className="state-panel">Memeriksa permintaan bergabung…</div>;
    const latestRequest = joinRequests[0];
    if (!latestRequest) return <ConnectedJoinForm />;
    if (latestRequest.status === "rejected") {
      return (
        <Card className="notice-card content-stack">
          <span className="card-kicker">Permintaan ditolak</span>
          <h2>Permintaan bergabung belum dapat disetujui.</h2>
          <p>{latestRequest.rejectionReason || "Tim BFG belum dapat melanjutkan permintaan ini."}</p>
        </Card>
      );
    }
    if (latestRequest.status === "approved" && latestRequest.admissionStatus === "active") {
      return (
        <Card className="notice-card content-stack">
          <span className="card-kicker">Blessfriend aktif</span>
          <h2>Akun BFG-mu sudah aktif.</h2>
          <p>Ruang kerja privatmu sudah terbuka. Lanjutkan ke akun atau katalog komunitas.</p>
          <div className="actions">
            <LinkButton href="/account">Buka akun</LinkButton>
            <LinkButton href="/catalog" variant="secondary">
              Buka katalog
            </LinkButton>
          </div>
        </Card>
      );
    }
    if (latestRequest.status === "approved" && latestRequest.admissionStatus === "invitation_pending") {
      return (
        <Card className="notice-card content-stack">
          <span className="card-kicker">Disetujui</span>
          <h2>Undangan Clerk diperlukan.</h2>
          <p>Admin BFG sudah menyetujui permintaanmu. Ikuti undangan Clerk untuk mengaktifkan akses BFG.</p>
        </Card>
      );
    }
    return (
      <Card className="notice-card content-stack">
        <span className="card-kicker">Dalam peninjauan</span>
        <h2>Permintaanmu sedang ditinjau.</h2>
        <p>Tim BFG akan mengabari setelah proses peninjauan selesai.</p>
      </Card>
    );
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
