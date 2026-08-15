"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { BFGSelect } from "@/components/bfg-select";
import { ProductAccessGuard } from "@/components/product-access-guard";
import { Button, Card, EmptyState, Field, LoadingRegion, PageHeader, SkeletonCard, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { useProduct } from "@/domain/prototype/store";

type JoinRequestStatus = "submitted" | "under_review" | "approved" | "rejected";
type JoinRequest = FunctionReturnType<typeof api.joinRequests.listForAdmin>[number];

function useJoinRequests(status: JoinRequestStatus | undefined) {
  return useQuery(api.joinRequests.listForAdmin, { status });
}

const statusLabels: Record<JoinRequestStatus, string> = {
  submitted: "Dikirim",
  under_review: "Sedang ditinjau",
  approved: "Disetujui",
  rejected: "Ditolak",
};

function statusTone(status: JoinRequestStatus): "neutral" | "positive" | "warning" {
  if (status === "approved") return "positive";
  if (status === "rejected") return "warning";
  return "neutral";
}

function JoinRequestCard({
  request,
  startReview,
  approve,
  reject,
  retryAdmission,
}: {
  request: JoinRequest;
  startReview: (joinRequestId: Id<"joinRequests">) => Promise<unknown>;
  approve: (joinRequestId: Id<"joinRequests">, reviewNote?: string) => Promise<unknown>;
  reject: (joinRequestId: Id<"joinRequests">, rejectionReason: string, reviewNote?: string) => Promise<unknown>;
  retryAdmission: (joinRequestId: Id<"joinRequests">) => Promise<unknown>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const requestId = request.joinRequestId as Id<"joinRequests">;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    setError("");
    setPendingAction(success);
    try {
      await action();
      setMessage(success);
    } catch {
      setError("Tindakan tinjauan itu sudah tidak tersedia. Muat ulang antrian lalu coba lagi.");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{request.city || "Lokasi belum diisi"}</span>
          <h2>{request.name}</h2>
          <p className="subtle">{request.email}</p>
        </div>
        <StatusBadge tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>WhatsApp / telepon</span>
        <span>{request.contact}</span>
      </div>
      <div className="summary-line">
        <span>Minat buku</span>
        <span>{request.bookInterest || "Belum diisi"}</span>
      </div>
      <div className="summary-line">
        <span>Dikirim</span>
        <span>{new Date(request.submittedAt).toLocaleString("id-ID")}</span>
      </div>
      {request.note ? <p className="subtle">Catatan pendaftar: {request.note}</p> : null}
      {request.status === "submitted" ? (
        <Button
          type="button"
          variant="secondary"
          pending={pendingAction === "Tinjauan dimulai."}
          pendingLabel="Memulai…"
          onClick={() => void run(() => startReview(requestId), "Tinjauan dimulai.")}
        >
          Tinjau
        </Button>
      ) : null}
      {request.status === "under_review" ? (
        <div className="content-stack">
          <Field label="Catatan tinjauan (opsional)">
            <textarea className="textarea" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </Field>
          <Field label="Alasan penolakan (wajib untuk menolak)">
            <textarea
              className="textarea"
              value={rejectionReason}
              onChange={(event) => setRejectionReason(event.target.value)}
              maxLength={500}
            />
          </Field>
          <div className="form-actions">
            <Button
              type="button"
              pending={pendingAction === "Disetujui; proses admission dimulai."}
              pendingLabel="Menyetujui…"
              onClick={() =>
                void run(() => approve(requestId, reviewNote || undefined), "Disetujui; proses admission dimulai.")
              }
            >
              Setujui
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!rejectionReason.trim()}
              pending={pendingAction === "Permintaan ditolak."}
              pendingLabel="Menolak…"
              onClick={() =>
                void run(() => reject(requestId, rejectionReason, reviewNote || undefined), "Permintaan ditolak.")
              }
            >
              Tolak
            </Button>
          </div>
        </div>
      ) : null}
      {request.status === "approved" ? (
        <div className="content-stack">
          <p className="success-banner" role="status">
            {request.admissionStatus === "active"
              ? "Blessfriend aktif. Akses pelanggan sudah terbuka."
              : request.admissionStatus === "invitation_pending"
                ? "Disetujui. Buat undangan Clerk secara manual untuk identitas baru."
                : "Disetujui, tetapi admission masih perlu diselesaikan."}
          </p>
          {request.admissionError ? (
            <div className="form-actions">
              <span className="error-text">Proses penerimaan anggota perlu dicoba lagi.</span>
              <Button
                type="button"
                variant="secondary"
                pending={pendingAction === "Proses admission dicoba kembali."}
                pendingLabel="Mencoba lagi…"
                onClick={() => void run(() => retryAdmission(requestId), "Proses admission dicoba kembali.")}
              >
                Coba lagi
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}
      {request.status === "rejected" ? <p className="subtle">Alasan: {request.rejectionReason}</p> : null}
      {request.reviewedAt ? (
        <p className="subtle">Ditinjau {new Date(request.reviewedAt).toLocaleString("id-ID")}</p>
      ) : null}
      {message ? (
        <p className="success-banner" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="error-text" role="alert">
          {error}
        </p>
      ) : null}
    </Card>
  );
}

function ConnectedJoinRequests() {
  const [status, setStatus] = useState<JoinRequestStatus | "">("");
  const [search, setSearch] = useState("");
  const requests = useJoinRequests(status || undefined);
  const startReviewMutation = useMutation(api.joinRequests.startReview);
  const approveMutation = useMutation(api.joinRequests.approve);
  const rejectMutation = useMutation(api.joinRequests.reject);
  const retryAdmissionMutation = useMutation(api.joinRequests.retryAdmission);
  const filteredRequests = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!requests || !query) return requests;
    return requests.filter((request) =>
      [request.name, request.email, request.contact, request.city || ""].some((value) =>
        value.toLowerCase().includes(query),
      ),
    );
  }, [requests, search]);

  return (
    <div className="page admin-page">
      <PageHeader
        eyebrow="Operasi admission"
        title="Tinjau permintaan Blessfriends."
        description="Persetujuan adalah peristiwa admission BFG. Identitas Clerk yang sudah terhubung diaktifkan tanpa duplikasi; identitas baru dilanjutkan melalui undangan manual."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content content-stack">
          <Card className="form-actions">
            <Field label="Status">
              <BFGSelect
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as JoinRequestStatus | "")}
              >
                <option value="">Semua permintaan</option>
                <option value="submitted">Dikirim</option>
                <option value="under_review">Sedang ditinjau</option>
                <option value="approved">Disetujui</option>
                <option value="rejected">Ditolak</option>
              </BFGSelect>
            </Field>
            <Field label="Cari">
              <input
                className="input"
                type="search"
                placeholder="Nama, email, atau kontak"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
          </Card>
          {filteredRequests === undefined ? (
            <LoadingRegion label="Memuat permintaan join">
              <SkeletonCard />
              <SkeletonCard />
            </LoadingRegion>
          ) : null}
          {filteredRequests?.length ? (
            filteredRequests.map((request) => (
              <JoinRequestCard
                key={request.joinRequestId}
                request={request}
                startReview={(joinRequestId) => startReviewMutation({ joinRequestId })}
                approve={(joinRequestId, reviewNote) => approveMutation({ joinRequestId, reviewNote })}
                reject={(joinRequestId, rejectionReason, reviewNote) =>
                  rejectMutation({ joinRequestId, rejectionReason, reviewNote })
                }
                retryAdmission={(joinRequestId) => retryAdmissionMutation({ joinRequestId })}
              />
            ))
          ) : filteredRequests ? (
            <EmptyState
              title={search ? "Tidak ada permintaan yang cocok" : "Belum ada permintaan bergabung"}
              description={
                search
                  ? "Coba nama, email, kontak, atau kota lain."
                  : "Permintaan baru akan muncul setelah formulir Gabung dikirim."
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminJoinRequests() {
  const { dataSource } = useProduct();
  return dataSource === "convex" ? (
    <ConnectedJoinRequests />
  ) : (
    <div className="state-panel">Antrian penerimaan belum tersedia.</div>
  );
}

export default function AdminJoinRequestsPage() {
  return (
    <SiteShell>
      <ProductAccessGuard requiredRole="admin">
        <AdminJoinRequests />
      </ProductAccessGuard>
    </SiteShell>
  );
}
