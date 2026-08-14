"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { Button, Card, EmptyState, Field, LinkButton, LoadingRegion, SkeletonCard, StatusBadge } from "@/components/ui";

export function AdminCatalogAccess({ catalogId }: { catalogId: string }) {
  const id = catalogId as Id<"secretCatalogs">;
  const catalog = useQuery(api.secretCatalogs.getForAdmin, { catalogId: id });
  const access = useQuery(api.catalogAccess.listForAdmin, { catalogId: id });
  const customers = useQuery(api.orders.listEligibleCustomers, {});
  const generate = useMutation(api.catalogAccess.generateCode);
  const revokeCode = useMutation(api.catalogAccess.revokeCode);
  const grant = useMutation(api.catalogAccess.grantMember);
  const revokeGrant = useMutation(api.catalogAccess.revokeGrant);
  const [codeExpiry, setCodeExpiry] = useState("");
  const [memberId, setMemberId] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState("");

  if (catalog === undefined || access === undefined || customers === undefined)
    return (
      <LoadingRegion label="Memuat akses katalog">
        <SkeletonCard />
        <SkeletonCard />
      </LoadingRegion>
    );
  if (!catalog) return <div className="state-panel">Katalog tidak ditemukan.</div>;

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setMessage("");
    try {
      const result = await action();
      setMessage(success);
      return result;
    } catch {
      setMessage("Aksi akses ditolak. Periksa status katalog, customer, dan tanggal berakhir.");
    } finally {
      setPending("");
    }
  }

  return (
    <AdminOperationalPage
      eyebrow="Secret Catalog"
      title={`Access Management · ${catalog.name}`}
      description="Kode mentah hanya ditampilkan sekali. Server menyimpan digest, status, masa berlaku, dan metadata grant."
      actions={
        <LinkButton href={`/admin/catalogs/${catalogId}`} variant="secondary">
          Kembali ke katalog
        </LinkButton>
      }
    >
      <Card>
        <span className="card-kicker">Kode akses aman</span>
        <h2>Generate, salin, lalu bagikan secara manual</h2>
        <div className="form-actions">
          <Field label="Kode berakhir (opsional)">
            <input
              className="input"
              type="datetime-local"
              value={codeExpiry}
              onChange={(event) => setCodeExpiry(event.target.value)}
            />
          </Field>
          <Button
            pending={pending === "generate"}
            pendingLabel="Membuat…"
            onClick={() =>
              void run(
                "generate",
                () => generate({ catalogId: id, expiresAt: codeExpiry ? Date.parse(codeExpiry) : undefined }),
                "Kode baru dibuat. Salin sekarang.",
              ).then((result) => {
                if (result) setOneTimeCode((result as { code: string }).code);
              })
            }
          >
            Generate Access
          </Button>
          <Button
            variant="danger"
            pending={pending === "revoke-code"}
            pendingLabel="Mencabut…"
            onClick={() => void run("revoke-code", () => revokeCode({ catalogId: id }), "Kode aktif dicabut.")}
          >
            Revoke active code
          </Button>
        </div>
        {oneTimeCode ? (
          <div className="catalog-code-result" role="status">
            <strong>Kode baru — tampil sekali</strong>
            <code>{oneTimeCode}</code>
            <Button
              variant="secondary"
              onClick={() => void navigator.clipboard.writeText(oneTimeCode).then(() => setMessage("Kode disalin."))}
            >
              Salin kode
            </Button>
          </div>
        ) : null}
        <div className="content-stack">
          {access.codes.map((code) => (
            <div className="summary-line" key={code.codeId}>
              <span>
                {new Date(code.createdAt).toLocaleString("id-ID")} ·{" "}
                {code.expiresAt
                  ? `berakhir ${new Date(code.expiresAt).toLocaleString("id-ID")}`
                  : "tanpa expiry eksplisit"}
              </span>
              <StatusBadge tone={code.status === "active" ? "positive" : "neutral"}>{code.status}</StatusBadge>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <span className="card-kicker">Akses member</span>
        <h2>Grant atau revoke customer aktif</h2>
        <form
          className="form-actions"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              "grant",
              () => grant({ catalogId: id, appUserId: memberId as Id<"appUsers">, expiresAt: Date.parse(grantExpiry) }),
              "Akses member diberikan.",
            );
          }}
        >
          <Field label="Customer">
            <select className="select" value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
              <option value="">Pilih customer</option>
              {customers.map((customer) => (
                <option key={customer.customerUserId} value={customer.customerUserId}>
                  {customer.displayName} · {customer.email || "tanpa email"}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Berlaku sampai">
            <input
              className="input"
              type="datetime-local"
              value={grantExpiry}
              onChange={(event) => setGrantExpiry(event.target.value)}
              required
            />
          </Field>
          <Button pending={pending === "grant"} pendingLabel="Memberi akses…">
            Grant access
          </Button>
        </form>
        {access.grants.length ? (
          <div className="content-stack">
            {access.grants.map((item) => (
              <div className="summary-line" key={item.grantId}>
                <span>
                  <strong>{item.customerName}</strong>
                  <br />
                  <small>
                    {item.customerEmail || "—"} · sampai {new Date(item.expiresAt).toLocaleString("id-ID")}
                  </small>
                </span>
                <span className="form-actions">
                  <StatusBadge tone={item.status === "active" ? "positive" : "neutral"}>{item.status}</StatusBadge>
                  {item.status === "active" ? (
                    <Button
                      variant="danger"
                      pending={pending === `grant-${item.grantId}`}
                      onClick={() =>
                        void run(
                          `grant-${item.grantId}`,
                          () => revokeGrant({ grantId: item.grantId }),
                          "Akses member dicabut.",
                        )
                      }
                    >
                      Revoke
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada member grant"
            description="Customer dapat memakai kode atau menerima grant langsung."
            mascotVariant={false}
          />
        )}
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}
