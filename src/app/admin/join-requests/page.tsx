"use client";

import { useMutation, useQuery } from "convex/react";
import type { FunctionReturnType } from "convex/server";
import { useMemo, useState } from "react";
import { api } from "../../../../convex/_generated/api";
import type { Id } from "../../../../convex/_generated/dataModel";
import { AdminNav } from "@/components/admin-nav";
import { PrototypeModeGuard } from "@/components/prototype-mode-guard";
import { Button, Card, EmptyState, Field, PageHeader, StatusBadge } from "@/components/ui";
import { SiteShell } from "@/components/site-shell";
import { usePrototype } from "@/domain/prototype/store";

type JoinRequestStatus = "submitted" | "under_review" | "approved" | "rejected";
type JoinRequest = FunctionReturnType<typeof api.joinRequests.listForAdmin>[number];

function useJoinRequests(status: JoinRequestStatus | undefined) {
  return useQuery(api.joinRequests.listForAdmin, { status });
}

const statusLabels: Record<JoinRequestStatus, string> = {
  submitted: "Submitted",
  under_review: "Under review",
  approved: "Approved",
  rejected: "Rejected",
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
}: {
  request: JoinRequest;
  startReview: (joinRequestId: Id<"joinRequests">) => Promise<unknown>;
  approve: (joinRequestId: Id<"joinRequests">, reviewNote?: string) => Promise<unknown>;
  reject: (joinRequestId: Id<"joinRequests">, rejectionReason: string, reviewNote?: string) => Promise<unknown>;
}) {
  const [reviewNote, setReviewNote] = useState("");
  const [rejectionReason, setRejectionReason] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const requestId = request.joinRequestId as Id<"joinRequests">;

  async function run(action: () => Promise<unknown>, success: string) {
    setMessage("");
    setError("");
    try {
      await action();
      setMessage(success);
    } catch {
      setError("That review action is no longer available. Refresh the queue and try again.");
    }
  }

  return (
    <Card>
      <div className="split-heading">
        <div>
          <span className="card-kicker">{request.city || "Location not provided"}</span>
          <h2>{request.name}</h2>
          <p className="subtle">{request.email}</p>
        </div>
        <StatusBadge tone={statusTone(request.status)}>{statusLabels[request.status]}</StatusBadge>
      </div>
      <div className="summary-line">
        <span>WhatsApp / phone</span>
        <span>{request.contact}</span>
      </div>
      <div className="summary-line">
        <span>Submitted</span>
        <span>{new Date(request.submittedAt).toLocaleString("en-GB")}</span>
      </div>
      {request.note ? <p className="subtle">Applicant note: {request.note}</p> : null}
      {request.status === "submitted" ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() => void run(() => startReview(requestId), "Review started.")}
        >
          Start review
        </Button>
      ) : null}
      {request.status === "under_review" ? (
        <div className="content-stack">
          <Field label="Review note (optional)">
            <textarea className="textarea" value={reviewNote} onChange={(event) => setReviewNote(event.target.value)} />
          </Field>
          <Field label="Rejection reason (required to reject)">
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
              onClick={() =>
                void run(() => approve(requestId, reviewNote || undefined), "Approved; ready for manual invitation.")
              }
            >
              Approve
            </Button>
            <Button
              type="button"
              variant="danger"
              disabled={!rejectionReason.trim()}
              onClick={() =>
                void run(() => reject(requestId, rejectionReason, reviewNote || undefined), "Request rejected.")
              }
            >
              Reject
            </Button>
          </div>
        </div>
      ) : null}
      {request.status === "approved" ? (
        <p className="success-banner" role="status">
          Invitation handoff ready. Create the Clerk Development invitation manually; no invitation URL is stored here.
        </p>
      ) : null}
      {request.status === "rejected" ? <p className="subtle">Reason: {request.rejectionReason}</p> : null}
      {request.reviewedAt ? (
        <p className="subtle">Reviewed {new Date(request.reviewedAt).toLocaleString("en-GB")}</p>
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
        eyebrow="Admission operations"
        title="Review Blessfriends requests."
        description="Approval makes an applicant eligible for a manual Clerk invitation. It does not create an account or grant catalog access."
      />
      <div className="admin-workspace">
        <AdminNav />
        <div className="admin-content content-stack">
          <Card className="form-actions">
            <Field label="Status">
              <select
                className="select"
                value={status}
                onChange={(event) => setStatus(event.target.value as JoinRequestStatus | "")}
              >
                <option value="">All requests</option>
                <option value="submitted">Submitted</option>
                <option value="under_review">Under review</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
              </select>
            </Field>
            <Field label="Search">
              <input
                className="input"
                type="search"
                placeholder="Name, email, or contact"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
              />
            </Field>
          </Card>
          {filteredRequests === undefined ? <div className="state-panel">Loading join requests…</div> : null}
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
              />
            ))
          ) : filteredRequests ? (
            <EmptyState
              title={search ? "No matching requests" : "No join requests yet"}
              description={
                search
                  ? "Try a different name, email, contact, or city."
                  : "The queue starts empty and never seeds applicant records."
              }
            />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function AdminJoinRequests() {
  const { dataSource } = usePrototype();
  return dataSource === "convex" ? (
    <ConnectedJoinRequests />
  ) : (
    <div className="state-panel">Join request review requires the Convex data source.</div>
  );
}

export default function AdminJoinRequestsPage() {
  return (
    <SiteShell>
      <PrototypeModeGuard requiredRole="admin">
        <AdminJoinRequests />
      </PrototypeModeGuard>
    </SiteShell>
  );
}
