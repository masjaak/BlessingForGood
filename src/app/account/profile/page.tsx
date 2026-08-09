"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, PageHeader } from "@/components/ui";

function ProfileForm() {
  const profile = useQuery(api.customerProfiles.getMine, {});
  const save = useMutation(api.customerProfiles.upsertMine);
  const [displayName, setDisplayName] = useState("");
  const [phone, setPhone] = useState("");
  const [whatsappNumber, setWhatsappNumber] = useState("");
  const [message, setMessage] = useState("");

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
    try {
      await save({ displayName, phone: phone || undefined, whatsappNumber: whatsappNumber || undefined });
      setMessage("Profil tersimpan.");
    } catch {
      setMessage("Profil belum dapat disimpan.");
    }
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
        <Button type="submit" disabled={profile === undefined}>
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

export default function ProfilePage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="customer">
        <div className="page narrow-page">
          <PageHeader eyebrow="Account" title="Profil Blessfriend" description="Kelola metadata profil BFG Anda." />
          <ProfileForm />
        </div>
      </PrototypeModeGuard>
    </SiteShell>
  );
}
