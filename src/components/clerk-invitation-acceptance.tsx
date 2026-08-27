"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ClerkInvitationForm } from "@/components/clerk-invitation-form";
import { Button, Card } from "@/components/ui";
import { BFG_MEMBERSHIP_CORRELATION_KEY } from "@/config/clerk";
import { useProduct } from "@/domain/prototype/store";

const ACCOUNT_REDIRECT = "/account";
const TICKET_ERROR = "Undangan tidak valid atau sudah kedaluwarsa.";
const ACTIVATION_ERROR =
  "Aktivasi belum selesai. Coba lagi menggunakan undangan terbaru atau masuk dengan akun yang menerima undangan.";
const INVITATION_TIMEOUT_MS = 15_000;

type AcceptancePhase = "loading" | "form" | "finishing" | "error";

function createInvitationTraceId() {
  return globalThis.crypto?.randomUUID?.() || `invite-${Date.now().toString(36)}`;
}

function logInvitationStage(traceId: string, stage: string, fields: Record<string, boolean> = {}) {
  console.info("bfg_invitation_stage", { traceId, stage, ...fields });
}

function withInvitationTimeout<T>(operation: Promise<T>) {
  return new Promise<T>((resolve, reject) => {
    const timeoutId = window.setTimeout(() => reject(new Error("invitation-timeout")), INVITATION_TIMEOUT_MS);
    operation.then(
      (value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      },
      (reason) => {
        window.clearTimeout(timeoutId);
        reject(reason);
      },
    );
  });
}

export function ClerkInvitationAcceptance({ ticket }: { ticket?: string }) {
  const { isLoaded, isSignedIn } = useAuth();
  const { signUp } = useSignUp();
  const { authState, sessionRole } = useProduct();
  const router = useRouter();
  const [phase, setPhase] = useState<AcceptancePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const startedTicket = useRef<string | null>(null);
  const traceId = useRef(createInvitationTraceId());
  const routeLogged = useRef(false);
  const redirected = useRef(false);
  const timedOut = useRef(false);

  useEffect(() => {
    if (routeLogged.current) return;
    routeLogged.current = true;
    logInvitationStage(traceId.current, "BFG_ACCEPT_ROUTE_REACHED", { ticketPresent: Boolean(ticket) });
    if (ticket) {
      window.sessionStorage.setItem(BFG_MEMBERSHIP_CORRELATION_KEY, traceId.current);
      logInvitationStage(traceId.current, "INVITATION_OPENED");
    }
  }, [ticket]);

  const finalize = useCallback(async () => {
    if (!signUp) return;
    logInvitationStage(traceId.current, "TICKET_FINALIZE_STARTED");
    setPhase("finishing");
    const { error: finalizeError } = await withInvitationTimeout(signUp.finalize());
    if (finalizeError) {
      setError(ACTIVATION_ERROR);
      setPhase("error");
    }
  }, [signUp]);

  useEffect(() => {
    if (phase !== "finishing" || redirected.current) return;
    if (authState === "authenticated" && sessionRole === "customer") {
      redirected.current = true;
      logInvitationStage(traceId.current, "CUSTOMER_ACTIVE");
      logInvitationStage(traceId.current, "REDIRECT_ACCOUNT");
      window.sessionStorage.removeItem(BFG_MEMBERSHIP_CORRELATION_KEY);
      router.replace(ACCOUNT_REDIRECT);
    }
  }, [authState, phase, router, sessionRole]);

  useEffect(() => {
    if (phase !== "loading" && phase !== "finishing") return;
    timedOut.current = false;
    const timeoutId = window.setTimeout(() => {
      timedOut.current = true;
      setError(ACTIVATION_ERROR);
      setPhase("error");
    }, INVITATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [phase]);

  useEffect(() => {
    if (isLoaded && isSignedIn) logInvitationStage(traceId.current, "CLERK_SESSION_ACTIVE");
    if (!ticket || !isLoaded || isSignedIn || !signUp || startedTicket.current === ticket) return;
    startedTicket.current = ticket;
    let active = true;
    timedOut.current = false;
    setPhase("loading");
    setError(null);

    void (async () => {
      try {
        logInvitationStage(traceId.current, "TICKET_FLOW_STARTED");
        const { error: ticketError } = await withInvitationTimeout(signUp.ticket({ ticket }));
        if (!active || timedOut.current) return;
        if (ticketError) {
          setError(TICKET_ERROR);
          setPhase("error");
          return;
        }
        logInvitationStage(traceId.current, "TICKET_ACCEPTED");
        if (signUp.status === "complete") {
          await finalize();
          return;
        }
        setPhase("form");
      } catch {
        if (!active || timedOut.current) return;
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
      const { error: passwordError } = await withInvitationTimeout(
        signUp.password({
          password,
          username: username.trim(),
        }),
      );
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

  const terminalAuthError =
    phase === "finishing" &&
    (authState === "admission-required" || authState === "suspended" || authState === "configuration-missing");

  if (phase === "error" || terminalAuthError) {
    return (
      <Card frame="attention" className="auth-invitation-card" role="alert">
        <span className="eyebrow">Undangan BFG</span>
        <h1>Aktivasi belum selesai.</h1>
        <p>{error || ACTIVATION_ERROR}</p>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={() => window.location.reload()}>
            Coba lagi
          </Button>
        </div>
      </Card>
    );
  }

  if (phase === "finishing") {
    return <div className="state-panel auth-invitation-state">Mengaktifkan akun BFG…</div>;
  }

  if (isSignedIn) {
    return <ClerkInvitationForm redirectUrl={ACCOUNT_REDIRECT} />;
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
