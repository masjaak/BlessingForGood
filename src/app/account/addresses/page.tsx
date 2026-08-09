"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { SiteShell } from "@/components/site-shell";
import { Button, Card, Field, PageHeader } from "@/components/ui";

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

function AddressForm() {
  const addresses = useQuery(api.customerAddresses.listMine, {});
  const create = useMutation(api.customerAddresses.create);
  const remove = useMutation(api.customerAddresses.remove);
  const [form, setForm] = useState(emptyForm);
  const [message, setMessage] = useState("");
  const update = (key: keyof typeof emptyForm, value: string | boolean) =>
    setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage("");
    try {
      await create({ ...form, addressLine2: form.addressLine2 || undefined });
      setForm(emptyForm);
      setMessage("Alamat tersimpan.");
    } catch {
      setMessage("Alamat belum dapat disimpan.");
    }
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
            <Field key={key} label={key}>
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
          <Button type="submit">Tambah alamat</Button>
          {message ? (
            <span className="subtle" role="status">
              {message}
            </span>
          ) : null}
        </form>
      </Card>
      <div className="content-stack">
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
              onClick={() => void remove({ addressId: address.addressId as Id<"customerAddresses"> })}
            >
              Hapus
            </Button>
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function AddressesPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="customer">
        <div className="page narrow-page">
          <PageHeader
            eyebrow="Account"
            title="Alamat pengiriman"
            description="Simpan alamat untuk fulfillment tanpa data dummy."
          />
          <AddressForm />
        </div>
      </PrototypeModeGuard>
    </SiteShell>
  );
}
