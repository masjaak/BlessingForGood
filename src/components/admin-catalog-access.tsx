"use client";

import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { AdminOperationalPage } from "@/components/admin-operational-page";
import { BFGSelect } from "@/components/bfg-select";
import {
  ActionGroup,
  Button,
  Card,
  EmptyState,
  Field,
  LinkButton,
  LoadingRegion,
  SkeletonCard,
  StatusBadge,
} from "@/components/ui";

export function AdminCatalogAccess({ catalogId }: { catalogId: string }) {
  const id = catalogId as Id<"secretCatalogs">;
  const catalog = useQuery(api.secretCatalogs.getForAdmin, { catalogId: id });
  const access = useQuery(api.catalogAccess.listForAdmin, { catalogId: id });
  const customers = useQuery(api.orders.listEligibleCustomers, {
    paginationOpts: { numItems: 100, cursor: null },
  });
  const generate = useMutation(api.catalogAccess.generateCode);
  const revokeCode = useMutation(api.catalogAccess.revokeCode);
  const grant = useMutation(api.catalogAccess.grantMember);
  const revokeGrant = useMutation(api.catalogAccess.revokeGrant);
  const [codeExpiry, setCodeExpiry] = useState("");
  const [memberId, setMemberId] = useState("");
  const [grantExpiry, setGrantExpiry] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [message, setMessage] = useState("");
  const [copyFeedback, setCopyFeedback] = useState<{
    kind: "success" | "error";
    text: string;
  } | null>(null);
  const [pending, setPending] = useState("");
  const customerRows = Array.isArray(customers) ? customers : customers?.page || [];

  useEffect(() => {
    if (!copyFeedback) return;
    const timer = window.setTimeout(() => setCopyFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [copyFeedback]);

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
      setMessage("Aksi akses ditolak. Periksa status katalog, pelanggan, dan tanggal berakhir.");
    } finally {
      setPending("");
    }
  }

  async function copyCode() {
    setCopyFeedback(null);
    try {
      await navigator.clipboard.writeText(oneTimeCode);
      setCopyFeedback({ kind: "success", text: "Kode akses berhasil disalin." });
    } catch {
      setCopyFeedback({ kind: "error", text: "Kode akses gagal disalin. Coba salin secara manual." });
    }
  }

  return (
    <AdminOperationalPage
      eyebrow="Secret Catalog"
      title={`Kelola akses · ${catalog.name}`}
      description="Satu kode aman dapat membuka Secret Catalog yang sedang tersedia. Kode mentah hanya ditampilkan sekali; server menyimpan digest, status, dan masa berlaku."
      actions={
        <LinkButton href={`/admin/catalogs/${catalogId}`} variant="secondary">
          Kembali ke katalog
        </LinkButton>
      }
    >
      <Card frame="form">
        <span className="card-kicker">Kode akses Secret Catalog</span>
        <h2>Satu kode untuk Secret Catalog yang tersedia.</h2>
        <p className="subtle">
          Buat, salin, lalu bagikan ke pelanggan. Kode ini mengikuti akses Catalog yang sedang terbuka.
        </p>
        <div className="catalog-access-code-section">
          <div className="catalog-access-code-form">
            <Field label="Berlaku sampai (opsional)">
              <input
                className="input"
                type="datetime-local"
                value={codeExpiry}
                onChange={(event) => setCodeExpiry(event.target.value)}
              />
            </Field>
            <ActionGroup variant="responsive">
              <Button
                loading={pending === "generate"}
                loadingLabel="Membuat…"
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
                Buat kode akses
              </Button>
              <Button
                variant="danger"
                loading={pending === "revoke-code"}
                loadingLabel="Mencabut…"
                onClick={() => void run("revoke-code", () => revokeCode({ catalogId: id }), "Kode aktif dicabut.")}
              >
                Cabut kode aktif
              </Button>
            </ActionGroup>
          </div>
          {oneTimeCode ? (
            <div className="catalog-code-result" role="status">
              <strong>Kode baru — tampil sekali</strong>
              <code>{oneTimeCode}</code>
              <Button variant="secondary" onClick={() => void copyCode()}>
                Salin kode
              </Button>
            </div>
          ) : null}
        </div>
        {access.codes.length ? (
          <div className="content-stack">
            {access.codes.map((code) => (
              <div className="summary-line" key={code.codeId}>
                <span>
                  {new Date(code.createdAt).toLocaleString("id-ID")} ·{" "}
                  {code.expiresAt
                    ? `berakhir ${new Date(code.expiresAt).toLocaleString("id-ID")}`
                    : "tanpa masa berlaku eksplisit"}
                </span>
                <StatusBadge tone={code.status === "active" ? "positive" : "neutral"}>
                  {code.status === "active" ? "Aktif" : "Dicabut"}
                </StatusBadge>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada kode akses"
            description="Buat satu kode aman untuk Secret Catalog yang sedang tersedia."
            mascotVariant={false}
          />
        )}
      </Card>
      <Card frame="list">
        <span className="card-kicker">Akses anggota</span>
        <h2>Berikan atau cabut akses pelanggan aktif</h2>
        <form
          className="form-actions catalog-member-form"
          onSubmit={(event) => {
            event.preventDefault();
            void run(
              "grant",
              () => grant({ catalogId: id, appUserId: memberId as Id<"appUsers">, expiresAt: Date.parse(grantExpiry) }),
              "Akses anggota diberikan.",
            );
          }}
        >
          <Field label="Pelanggan">
            <BFGSelect value={memberId} onChange={(event) => setMemberId(event.target.value)} required>
              <option value="">Pilih pelanggan</option>
              {customerRows.map((customer) => (
                <option key={customer.customerUserId} value={customer.customerUserId}>
                  {customer.displayName} · {customer.email || "tanpa email"}
                </option>
              ))}
            </BFGSelect>
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
          <Button loading={pending === "grant"} loadingLabel="Memberi akses…">
            Berikan akses
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
                  <StatusBadge tone={item.status === "active" ? "positive" : "neutral"}>
                    {item.status === "active" ? "Aktif" : "Dicabut"}
                  </StatusBadge>
                  {item.status === "active" ? (
                    <Button
                      variant="danger"
                      loading={pending === `grant-${item.grantId}`}
                      onClick={() =>
                        void run(
                          `grant-${item.grantId}`,
                          () => revokeGrant({ grantId: item.grantId }),
                          "Akses member dicabut.",
                        )
                      }
                    >
                      Cabut akses
                    </Button>
                  ) : null}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="Belum ada pemberian akses anggota"
            description="Pelanggan dapat memakai kode atau menerima akses langsung."
            mascotVariant={false}
          />
        )}
      </Card>
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
      {copyFeedback ? (
        <p
          aria-live={copyFeedback.kind === "success" ? "polite" : "assertive"}
          className={`catalog-copy-toast catalog-copy-toast-${copyFeedback.kind}`}
          role={copyFeedback.kind === "success" ? "status" : "alert"}
        >
          {copyFeedback.text}
        </p>
      ) : null}
    </AdminOperationalPage>
  );
}
