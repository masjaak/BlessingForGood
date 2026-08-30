"use client";

import { useMutation, useQuery } from "convex/react";
import { useState } from "react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { BFGSelect } from "@/components/bfg-select";
import { productErrorMessage } from "@/domain/prototype/errors";
import { calendarDateToEndTimestamp, formatBfgCalendarDate } from "@/lib/calendar-date";
import { ActionGroup, Button, Card, Field, StatusBadge } from "@/components/ui";

type PeriodStatus = "active" | "inactive" | "expired";

type CatalogPeriod = {
  periodId: string;
  label: string;
  status: PeriodStatus;
  startsAt: number | null;
  endsAt: number | null;
  catalogs: Array<{ catalogId: string; name: string; status: string }>;
};

function periodStatusLabel(status: PeriodStatus) {
  return status === "active" ? "Aktif" : status === "expired" ? "Kedaluwarsa" : "Tidak aktif";
}

function periodStatusTone(status: PeriodStatus) {
  return status === "active" ? "positive" : status === "expired" ? "neutral" : "warning";
}

export function AdminCatalogPeriod({
  catalogId,
  currentPeriod,
}: {
  catalogId: string;
  currentPeriod: CatalogPeriod | null;
}) {
  const id = catalogId as Id<"secretCatalogs">;
  const periods = useQuery(api.catalogAccess.listPeriodsForAdmin, {});
  const create = useMutation(api.catalogAccess.createPeriod);
  const attach = useMutation(api.catalogAccess.attachPeriod);
  const detach = useMutation(api.catalogAccess.detachPeriod);
  const revoke = useMutation(api.catalogAccess.revokePeriod);
  const [label, setLabel] = useState("");
  const [code, setCode] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [selectedPeriodId, setSelectedPeriodId] = useState("");
  const [oneTimeCode, setOneTimeCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageIsError, setMessageIsError] = useState(false);
  const [pending, setPending] = useState("");

  const availablePeriods = (periods || []).filter(
    (period) => period.status === "active" && !period.catalogs.some((catalog) => catalog.catalogId === catalogId),
  );

  async function run(key: string, action: () => Promise<unknown>, success: string) {
    setPending(key);
    setMessage("");
    setMessageIsError(false);
    try {
      const result = await action();
      setMessage(success);
      return result;
    } catch (reason) {
      setMessageIsError(true);
      setMessage(productErrorMessage(reason, "Periode akses belum dapat diubah."));
    } finally {
      setPending("");
    }
  }

  if (currentPeriod) {
    return (
      <Card frame="form" className="catalog-period-card">
        <div className="split-heading">
          <div>
            <span className="card-kicker">Periode akses bersama</span>
            <h2>{currentPeriod.label}</h2>
          </div>
          <StatusBadge tone={periodStatusTone(currentPeriod.status)}>
            {periodStatusLabel(currentPeriod.status)}
          </StatusBadge>
        </div>
        <p className="subtle">
          Satu kode akses berlaku untuk Catalog yang terhubung. Kode mentah hanya ditampilkan saat dibuat; server
          menyimpan digest.
        </p>
        <dl className="catalog-period-meta">
          <div>
            <dt>Mulai</dt>
            <dd>{currentPeriod.startsAt ? formatBfgCalendarDate(currentPeriod.startsAt) : "Sekarang"}</dd>
          </div>
          <div>
            <dt>Berakhir</dt>
            <dd>{currentPeriod.endsAt ? formatBfgCalendarDate(currentPeriod.endsAt) : "Tanpa batas"}</dd>
          </div>
        </dl>
        <div className="catalog-period-catalogs">
          <strong>Catalog menggunakan periode ini</strong>
          <ul>
            {currentPeriod.catalogs.map((catalog) => (
              <li key={catalog.catalogId}>
                {catalog.name} · {catalog.status === "open" ? "Terbuka" : catalog.status}
              </li>
            ))}
          </ul>
        </div>
        <ActionGroup variant="responsive">
          <Button
            type="button"
            variant="secondary"
            loading={pending === "detach"}
            onClick={() =>
              void run(
                "detach",
                () => detach({ catalogId: id, periodId: currentPeriod.periodId as Id<"catalogAccessPeriods"> }),
                "Catalog dilepas dari periode akses.",
              )
            }
          >
            Lepas Catalog dari periode
          </Button>
          {currentPeriod.status === "active" ? (
            <Button
              type="button"
              variant="danger"
              loading={pending === "revoke"}
              onClick={() =>
                void run(
                  "revoke",
                  () => revoke({ periodId: currentPeriod.periodId as Id<"catalogAccessPeriods"> }),
                  "Periode akses dicabut.",
                )
              }
            >
              Cabut periode
            </Button>
          ) : null}
        </ActionGroup>
        {oneTimeCode ? <PeriodCodeResult code={oneTimeCode} /> : null}
        {message ? <PeriodMessage error={messageIsError}>{message}</PeriodMessage> : null}
      </Card>
    );
  }

  return (
    <Card frame="form" className="catalog-period-card">
      <span className="card-kicker">Periode akses bersama</span>
      <h2>Satu kode untuk beberapa Catalog</h2>
      <p className="subtle">
        Buat kode periode untuk Catalog ini, lalu hubungkan Catalog terbuka lain yang boleh memakai kode yang sama.
      </p>
      <form
        className="form-card"
        onSubmit={(event) => {
          event.preventDefault();
          void run(
            "create",
            async () => {
              const result = await create({
                catalogId: id,
                label,
                accessCode: code,
                endsAt: endsAt ? calendarDateToEndTimestamp(endsAt) : undefined,
              });
              setOneTimeCode(result.code);
              setLabel("");
              setCode("");
              setEndsAt("");
              return result;
            },
            "Periode dibuat. Salin kode sekarang.",
          );
        }}
      >
        <div className="form-grid">
          <Field label="Nama periode">
            <input className="input" value={label} onChange={(event) => setLabel(event.target.value)} required />
          </Field>
          <Field label="Kode akses" hint="Gunakan kode yang mudah dibagikan kepada Customer yang dituju.">
            <input
              className="input"
              value={code}
              onChange={(event) => setCode(event.target.value)}
              autoComplete="off"
              required
            />
          </Field>
          <Field label="Periode berakhir (opsional)">
            <input className="input" type="date" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
          </Field>
        </div>
        <Button loading={pending === "create"} loadingLabel="Membuat periode…">
          Buat periode dan kode
        </Button>
      </form>
      {availablePeriods.length ? (
        <form
          className="form-actions catalog-period-attach"
          onSubmit={(event) => {
            event.preventDefault();
            if (!selectedPeriodId) return;
            void run(
              "attach",
              () => attach({ catalogId: id, periodId: selectedPeriodId as Id<"catalogAccessPeriods"> }),
              "Catalog ditambahkan ke periode akses.",
            );
          }}
        >
          <Field label="Pakai periode aktif yang sudah ada">
            <BFGSelect
              aria-label="Periode akses yang sudah ada"
              value={selectedPeriodId}
              onChange={(event) => setSelectedPeriodId(event.target.value)}
              required
            >
              <option value="">Pilih periode</option>
              {availablePeriods.map((period) => (
                <option key={period.periodId} value={period.periodId}>
                  {period.label} · {period.catalogs.length} Catalog
                </option>
              ))}
            </BFGSelect>
          </Field>
          <Button type="submit" variant="secondary" loading={pending === "attach"} loadingLabel="Menghubungkan…">
            Hubungkan Catalog
          </Button>
        </form>
      ) : null}
      {oneTimeCode ? <PeriodCodeResult code={oneTimeCode} /> : null}
      {message ? <PeriodMessage error={messageIsError}>{message}</PeriodMessage> : null}
    </Card>
  );
}

function PeriodCodeResult({ code }: { code: string }) {
  return (
    <div className="catalog-code-result" role="status">
      <strong>Kode periode — tampil sekali</strong>
      <code>{code}</code>
      <Button type="button" variant="secondary" onClick={() => void navigator.clipboard.writeText(code)}>
        Salin kode
      </Button>
    </div>
  );
}

function PeriodMessage({ error, children }: { error: boolean; children: string }) {
  return (
    <p className={error ? "error-text" : "success-banner"} role={error ? "alert" : "status"}>
      {children}
    </p>
  );
}
