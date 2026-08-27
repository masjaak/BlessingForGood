"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ClerkInvitationForm } from "@/components/clerk-invitation-form";
import { Button, Card } from "@/components/ui";

const ACCOUNT_REDIRECT = "/account";
const TICKET_ERROR = "Undangan tidak valid atau sudah kedaluwarsa.";
const ACTIVATION_ERROR = "Aktivasi akun belum berhasil. Silakan buka kembali undangan terbaru dari BFG.";

type AcceptancePhase = "loading" | "form" | "finishing" | "error";

function createInvitationTraceId() {
  return globalThis.crypto?.randomUUID?.() || `invite-${Date.now().toString(36)}`;
}

function logInvitationStage(traceId: string, stage: string, fields: Record<string, boolean> = {}) {
  console.info("bfg_invitation_stage", { traceId, stage, ...fields });
}

export function ClerkInvitationAcceptance({ ticket }: { ticket?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signUp } = useSignUp();
  const router = useRouter();
  const [phase, setPhase] = useState<AcceptancePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedTicket = useRef<string | null>(null);
  const traceId = useRef(createInvitationTraceId());
  const routeLogged = useRef(false);

  useEffect(() => {
    if (routeLogged.current) return;
    routeLogged.current = true;
    logInvitationStage(traceId.current, "BFG_ACCEPT_ROUTE_REACHED", { ticketPresent: Boolean(ticket) });
    if (ticket) logInvitationStage(traceId.current, "TICKET_PRESENT");
  }, [ticket]);

  const finalize = useCallback(async () => {
    if (!signUp) return;
    logInvitationStage(traceId.current, "TICKET_FINALIZE_STARTED");
    setPhase("finishing");
    const { error: finalizeError } = await signUp.finalize({
      navigate: ({ session, decorateUrl }) => {
        if (session?.currentTask) {
          logInvitationStage(traceId.current, "REDIRECT_ACCOUNT");
          router.push(ACCOUNT_REDIRECT);
          return;
        }
        const url = decorateUrl(ACCOUNT_REDIRECT);
        logInvitationStage(traceId.current, "REDIRECT_ACCOUNT");
        if (url.startsWith("http")) window.location.href = url;
        else router.push(url);
      },
    });
    if (finalizeError) {
      setError(ACTIVATION_ERROR);
      setPhase("error");
    }
  }, [router, signUp]);

  useEffect(() => {
    if (isLoaded) logInvitationStage(traceId.current, "SESSION_PRESENT", { signedIn: Boolean(isSignedIn) });
    if (!ticket || !isLoaded || isSignedIn || !signUp || startedTicket.current === ticket) return;
    startedTicket.current = ticket;
    let active = true;
    setPhase("loading");
    setError(null);

    void (async () => {
      try {
        logInvitationStage(traceId.current, "TICKET_FLOW_STARTED");
        const { error: ticketError } = await signUp.ticket({ ticket });
        if (!active) return;
        if (ticketError) {
          setError(TICKET_ERROR);
          setPhase("error");
          return;
        }
        logInvitationStage(traceId.current, "TICKET_FLOW_COMPLETED");
        if (signUp.status === "complete") {
          await finalize();
          return;
        }
        setPhase("form");
      } catch {
        if (!active) return;
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    })();

    return () => {
      active = false;
    };
  }, [finalize, isLoaded, isSignedIn, signUp, ticket]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!signUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const { error: passwordError } = await signUp.password({
        password,
        username: username.trim(),
      });
      if (passwordError) {
        setError(ACTIVATION_ERROR);
        setPhase("error");
        return;
      }
      if (signUp.status !== "complete") {
        setError(ACTIVATION_ERROR);
        setPhase("error");
        return;
      }
      await finalize();
    } catch {
      setError(ACTIVATION_ERROR);
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  if (!ticket) {
    return (
      <Card frame="attention" className="auth-invitation-card" role="alert">
        <span className="eyebrow">Undangan BFG</span>
        <h1>Undangan tidak tersedia.</h1>
        <p>Silakan buka kembali undangan terbaru dari BFG.</p>
      </Card>
    );
  }

  if (!isLoaded) {
    return <div className="state-panel auth-invitation-state">Memuat undangan…</div>;
  }

  if (isSignedIn) {
    return <ClerkInvitationForm redirectUrl={ACCOUNT_REDIRECT} />;
  }

  if (phase === "error") {
    return (
      <Card frame="attention" className="auth-invitation-card" role="alert">
        <span className="eyebrow">Undangan BFG</span>
        <h1>Aktivasi belum selesai.</h1>
        <p>{error || ACTIVATION_ERROR}</p>
      </Card>
    );
  }

  if (phase === "form") {
    return (
      <Card frame="form" className="auth-invitation-card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Undangan BFG</span>
            <h1>Terima undangan BFG</h1>
            <p className="lede">Lengkapi akunmu untuk mengaktifkan akses Blessfriend.</p>
          </div>
          <label className="field" htmlFor="invitation-username">
            <span className="field-label">Username</span>
            <input
              id="invitation-username"
              className="input"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              autoComplete="username"
              minLength={4}
              required
            />
          </label>
          <label className="field" htmlFor="invitation-password">
            <span className="field-label">Password</span>
            <input
              id="invitation-password"
              className="input"
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="new-password"
              required
            />
          </label>
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <Button type="submit" loading={submitting} loadingLabel="Mengaktifkan…">
              Aktifkan akun
            </Button>
          </div>
          <div id="clerk-captcha" />
        </form>
      </Card>
    );
  }

  return <div className="state-panel auth-invitation-state">Memeriksa undangan…</div>;
}
