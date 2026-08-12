"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, EmptyState, Field, LoadingRegion, PageHeader, SkeletonCard } from "@/components/ui";
import { BackButton } from "@/components/back-button";

const emptyForm = {
  label: "",
  recipientName: "",
  phone: "",
  addressLine1: "",
  addressLine2: "",
  city: "",
  province: "",
  postalCode: "",
  isDefault: true,
};

const fieldLabels: Record<Exclude<keyof typeof emptyForm, "isDefault">, string> = {
  label: "Label alamat",
  recipientName: "Nama penerima",
  phone: "Nomor telepon",
  addressLine1: "Alamat",
  addressLine2: "Detail tambahan",
  city: "Kota",
  province: "Provinsi",
  postalCode: "Kode pos",
};

function AddressForm() {
  const addresses = useQuery(api.customerAddresses.listMine, {});
  const create = useMutation(api.customerAddresses.create);
  const remove = useMutation(api.customerAddresses.remove);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [deletingAddressId, setDeletingAddressId] = useState<string | null>(null);
  const update = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    setIsSaving(true);
    try {
      await create({ ...form, addressLine2: form.addressLine2 || undefined });
      setForm(emptyForm);
      setMessage("Alamat tersimpan.");
    } catch {
      setMessage("Alamat belum dapat disimpan.");
    } finally {
      setIsSaving(false);
    }
  }

  if (addresses === undefined) {
    return (
      <LoadingRegion label="Memuat alamat">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  }

  return (
    <div className="content-stack">
      <Card>
        <form className="form-card" onSubmit={submit}>
          {(
            [
              "label",
              "recipientName",
              "phone",
              "addressLine1",
              "addressLine2",
              "city",
              "province",
              "postalCode",
            ] as const
          ).map((key) => (
            <Field key={key} label={fieldLabels[key]}>
              <input
                className="input"
                value={form[key]}
                onChange={(event) => update(key, event.target.value)}
                required={key !== "addressLine2"}
              />
            </Field>
          ))}
          <label className="field">
            <span className="field-label">Alamat utama</span>
            <input
              type="checkbox"
              checked={form.isDefault}
              onChange={(event) => update("isDefault", event.target.checked)}
            />
          </label>
          <Button type="submit" pending={isSaving} pendingLabel="Menyimpan…">
            Tambah alamat
          </Button>
          {message ? (
            <span className="subtle" role="status">
              {message}
            </span>
          ) : null}
        </form>
      </Card>
      <div className="content-stack">
        {addresses?.length === 0 ? (
          <EmptyState title="Belum ada alamat" description="Tambahkan alamat penerima untuk pesanan berikutnya." />
        ) : null}
        {addresses?.map((address) => (
          <Card key={address.addressId}>
            <div className="split-heading">
              <div>
                <span className="card-kicker">{address.label}</span>
                <h2>{address.recipientName}</h2>
              </div>
              {address.isDefault ? <span className="status-badge status-positive">Default</span> : null}
            </div>
            <p>
              {address.addressLine1}
              {address.addressLine2 ? `, ${address.addressLine2}` : ""}, {address.city}, {address.province}{" "}
              {address.postalCode}
            </p>
            <p className="subtle">{address.phone}</p>
            <Button
              variant="danger"
              pending={deletingAddressId === address.addressId}
              pendingLabel="Menghapus…"
              onClick={async () => {
                setDeletingAddressId(address.addressId);
                try {
                  await remove({ addressId: address.addressId as Id<"customerAddresses"> });
                  setMessage("Alamat dihapus.");
                } catch {
                  setMessage("Alamat belum dapat dihapus.");
                } finally {
                  setDeletingAddressId(null);
                }
              }}
            >
              Hapus
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

function SignedOutAddresses() {
  return (
    <div className="route-with-back">
      <BackButton fallback="/account" />
      <div className="guard-card">
        <span className="eyebrow">Akun Blessfriend</span>
        <h1>Masuk lewat Akun untuk mengatur alamat.</h1>
        <p>Masuk untuk melihat dan memperbarui alamat pengirimanmu.</p>
        <a className="button button-primary" href="/account">
          Ke Akun
        </a>
      </div>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="customer" signedOutContent={<SignedOutAddresses />}>
        <div className="page narrow-page">
          <BackButton fallback="/account" />
          <PageHeader
            eyebrow="Akun"
            title="Alamat pengiriman"
            description="Simpan alamat penerima untuk memudahkan pengiriman pesananmu."
          />
          <AddressForm />
        </div>
      </ProductAccessGuard>
    </SiteShell>
  );
}
