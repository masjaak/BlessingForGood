"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, LinkButton, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";
import { BackButton } from "@/components/back-button";

function ProfileForm() {
  const profile = useQuery(api.customerProfiles.getMine, {});
  const save = useMutation(api.customerProfiles.upsertMine);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!profile) return;
    queueMicrotask(() => {
      setDisplayName(profile.displayName);
      setPhone(profile.phone || "");
      setWhatsappNumber(profile.whatsappNumber || "");
    });
  }, [profile]);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      await save({ displayName, phone: phone || undefined, whatsappNumber: whatsappNumber || undefined });
      setMessage("Profil tersimpan.");
    } catch {
      setMessage("Profil belum dapat disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  if (profile === undefined) {
    return (
      <LoadingRegion label="Memuat profil">
        <SkeletonCard />
      </LoadingRegion>
    );
  }

  return (
    <Card>
      <form className="form-card" onSubmit={submit}>
        <Field label="Nama tampilan">
          <input
            className="input"
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
            required
          />
        </Field>
        <Field label="Telepon">
          <input className="input" value={phone} onChange={(event) => setPhone(event.target.value)} />
        </Field>
        <Field label="WhatsApp">
          <input className="input" value={whatsappNumber} onChange={(event) => setWhatsappNumber(event.target.value)} />
        </Field>
        <Button type="submit" loading={isSaving} loadingLabel="Menyimpan…">
          Simpan profil
        </Button>
        {message ? (
          <span className="subtle" role="status">
            {message}
          </span>
        ) : null}
      </form>
    </Card>
  );
}

function SignedOutProfile() {
  return (
    <div className="route-with-back">
      <BackButton fallback="/account" />
      <div className="guard-card">
        <span className="eyebrow">Akun Blessfriend</span>
        <h1>Masuk lewat Akun untuk mengubah profil.</h1>
        <p>Masuk untuk melihat dan memperbarui informasi profilmu.</p>
        <LinkButton href="/account" variant="primary">
          Ke Akun
        </LinkButton>
      </div>
    </div>
  );
}

export default function ProfilePage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutProfile />}>
        <div className="page narrow-page">
          <BackButton fallback="/account" />
          <PageHeader
            eyebrow="Akun"
            title="Profil Blessfriend"
            description="Perbarui nama dan kontak yang digunakan BFG."
          />
          <ProfileForm />
        </div>
      </ProductAccessGuard>
    </SiteShell>
  );
}
