"use client";

import { useAuth, useSignUp } from "@clerk/nextjs";
import { executeProtectCheck } from "@clerk/shared/internal/clerk-js/protectCheck";
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
const SECURITY_CHECK_ERROR = "Lengkapi pemeriksaan keamanan Clerk untuk melanjutkan.";
const INVITATION_TIMEOUT_MS = 15_000;
const SUPPORTED_INVITATION_FIELDS = new Set([
  "email_address",
  "email_address_or_phone_number",
  "first_name",
  "last_name",
  "legal_accepted",
  "password",
  "phone_number",
  "username",
]);

type AcceptancePhase = "loading" | "form" | "verification" | "finishing" | "error";
type SafeTraceValue = boolean | number | string | null;
type VerificationMethod = {
  field: "email_address" | "phone_number";
  mode: "code" | "link";
  key: string;
};

function getVerificationMethod(signUp: {
  unverifiedFields?: readonly string[];
  verifications?: {
    emailAddress?: { supportedStrategies?: readonly string[] };
    phoneNumber?: { supportedStrategies?: readonly string[] };
  };
}): VerificationMethod | null {
  const unverifiedFields = signUp.unverifiedFields || [];
  const field = unverifiedFields.includes("email_address")
    ? "email_address"
    : unverifiedFields.includes("phone_number")
      ? "phone_number"
      : null;
  if (!field) return null;
  const resource = field === "email_address" ? signUp.verifications?.emailAddress : signUp.verifications?.phoneNumber;
  const strategies = resource?.supportedStrategies || [];
  const codeStrategy = field === "email_address" ? "email_code" : "phone_code";
  const mode = strategies.includes(codeStrategy)
    ? "code"
    : field === "email_address" && strategies.includes("email_link")
      ? "link"
      : null;
  return mode ? { field, mode, key: `${field}:${mode}` } : null;
}

function createInvitationTraceId() {
  return globalThis.crypto?.randomUUID?.() || `invite-${Date.now().toString(36)}`;
}

function logInvitationStage(traceId: string, stage: string, fields: Record<string, SafeTraceValue> = {}) {
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
  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  const { signUp } = useSignUp();
  const { authState, sessionRole } = useProduct();
  const router = useRouter();
  const signUpRef = useRef(signUp);
  const [phase, setPhase] = useState<AcceptancePhase>("loading");
  const [error, setError] = useState<string | null>(null);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [emailAddress, setEmailAddress] = useState("");
  const [emailOrPhone, setEmailOrPhone] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [legalAccepted, setLegalAccepted] = useState(false);
  const [verificationCode, setVerificationCode] = useState("");
  const [verificationSentKey, setVerificationSentKey] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const startedTicket = useRef<string | null>(null);
  const traceId = useRef(createInvitationTraceId());
  const routeLogged = useRef(false);
  const sessionLogged = useRef(false);
  const lastAuthStage = useRef<string | null>(null);
  const mounted = useRef(true);
  const ticketRun = useRef<{ ticket: string } | null>(null);
  const redirected = useRef(false);
  const finalizeStarted = useRef(false);
  const timedOut = useRef(false);
  const emailLinkWaitStarted = useRef<string | null>(null);
  const protectCheckContainer = useRef<HTMLDivElement>(null);
  const liveSignUp = signUp;
  const signUpReady = Boolean(liveSignUp);
  const liveMissingFields = liveSignUp?.missingFields || [];
  const liveProtectCheck = liveSignUp?.protectCheck;
  const protectCheckToken = liveProtectCheck?.token;
  const sameSessionInvite = Boolean(
    isSignedIn &&
    sessionId &&
    (liveSignUp?.existingSession?.sessionId === sessionId ||
      (liveSignUp?.status === "complete" && liveSignUp.createdUserId && liveSignUp.createdUserId === userId)),
  );

  useEffect(() => {
    signUpRef.current = signUp;
  }, [signUp]);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (routeLogged.current) return;
    routeLogged.current = true;
    logInvitationStage(traceId.current, "BFG_ACCEPT_ROUTE_REACHED", { ticketPresent: Boolean(ticket) });
    if (ticket) {
      window.sessionStorage.setItem(BFG_MEMBERSHIP_CORRELATION_KEY, traceId.current);
      logInvitationStage(traceId.current, "TICKET_PRESENT");
      logInvitationStage(traceId.current, "INVITATION_OPENED");
    }
  }, [ticket]);

  const finalize = useCallback(async () => {
    const currentSignUp = signUpRef.current;
    if (!currentSignUp || finalizeStarted.current) return;
    finalizeStarted.current = true;
    logInvitationStage(traceId.current, "FINALIZE_START", {
      status: currentSignUp.status,
      createdSessionIdPresent: Boolean(currentSignUp.createdSessionId),
    });
    setPhase("finishing");
    try {
      const { error: finalizeError } = await withInvitationTimeout(currentSignUp.finalize());
      logInvitationStage(traceId.current, "FINALIZE_DONE", {
        success: !finalizeError,
        status: signUpRef.current?.status || currentSignUp.status,
      });
      if (finalizeError) {
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    } catch (finalizeError) {
      logInvitationStage(traceId.current, "FINALIZE_DONE", { success: false });
      logInvitationStage(traceId.current, "ERROR", { stage: "finalize", reason: "request_failed" });
      throw finalizeError;
    }
  }, []);

  const advanceFromSignUpState = useCallback(async () => {
    const currentSignUp = signUpRef.current;
    if (!currentSignUp) return;
    const missingFields = currentSignUp.missingFields || [];
    const unverifiedFields = currentSignUp.unverifiedFields || [];
    logInvitationStage(traceId.current, "SIGNUP_STATE", {
      status: currentSignUp.status,
      missingFieldCount: missingFields.length,
      unverifiedFieldCount: unverifiedFields.length,
      createdSessionIdPresent: Boolean(currentSignUp.createdSessionId),
      existingSessionPresent: Boolean(currentSignUp.existingSession),
    });

    if (currentSignUp.status === "abandoned") {
      logInvitationStage(traceId.current, "ERROR", { stage: "signup", reason: "abandoned" });
      setError(TICKET_ERROR);
      setPhase("error");
      return;
    }
    if (currentSignUp.status === "complete") {
      logInvitationStage(traceId.current, "SIGNUP_COMPLETE", {
        createdSessionIdPresent: Boolean(currentSignUp.createdSessionId),
      });
      await finalize();
      return;
    }
    if (currentSignUp.protectCheck || missingFields.includes("protect_check")) {
      logInvitationStage(traceId.current, "ERROR", { stage: "protect_check", reason: "interactive_check_required" });
      setError(SECURITY_CHECK_ERROR);
      setPhase("form");
      return;
    }
    if (unverifiedFields.length > 0) {
      const verificationMethod = getVerificationMethod(currentSignUp);
      if (!verificationMethod) {
        logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "unsupported_strategy" });
        setError(ACTIVATION_ERROR);
        setPhase("error");
        return;
      }
      logInvitationStage(traceId.current, "VERIFICATION_REQUIRED", {
        email: unverifiedFields.includes("email_address"),
        phone: unverifiedFields.includes("phone_number"),
        strategy: verificationMethod.mode,
      });
      setError(null);
      setPhase("verification");
      return;
    }
    logInvitationStage(traceId.current, "MISSING_REQUIREMENTS", { fieldCount: missingFields.length });
    setError(null);
    setPhase("form");
  }, [finalize]);

  useEffect(() => {
    if ((phase !== "finishing" && !sameSessionInvite) || redirected.current) return;
    if (authState === "authenticated" && sessionRole === "customer") {
      redirected.current = true;
      logInvitationStage(traceId.current, "CUSTOMER_ACTIVE");
      logInvitationStage(traceId.current, "REDIRECT_ACCOUNT");
      window.sessionStorage.removeItem(BFG_MEMBERSHIP_CORRELATION_KEY);
      router.replace(ACCOUNT_REDIRECT);
    }
  }, [authState, phase, router, sameSessionInvite, sessionRole]);

  useEffect(() => {
    if ((phase !== "loading" && phase !== "finishing") || (isSignedIn && !sameSessionInvite && !ticketRun.current))
      return;
    timedOut.current = false;
    const timeoutId = window.setTimeout(() => {
      timedOut.current = true;
      logInvitationStage(traceId.current, "ERROR", { stage: phase, reason: "timeout" });
      setError(ACTIVATION_ERROR);
      setPhase("error");
    }, INVITATION_TIMEOUT_MS);
    return () => window.clearTimeout(timeoutId);
  }, [isSignedIn, phase, sameSessionInvite]);

  useEffect(() => {
    if (!isLoaded || !isSignedIn) {
      sessionLogged.current = false;
    } else if (!sessionLogged.current) {
      sessionLogged.current = true;
      logInvitationStage(traceId.current, "SESSION_ACTIVE", {
        sessionPresent: Boolean(sessionId),
        identityPresent: Boolean(userId),
      });
    }
  }, [isLoaded, isSignedIn, sessionId, userId]);

  useEffect(() => {
    const currentSignUp = signUpRef.current;
    if (!ticket || !isLoaded || !currentSignUp) {
      if (!ticket) ticketRun.current = null;
      return;
    }
    if (isSignedIn || startedTicket.current === ticket) return;
    startedTicket.current = ticket;
    const run = { ticket };
    ticketRun.current = run;
    timedOut.current = false;
    setPhase("loading");
    setError(null);

    void (async () => {
      try {
        logInvitationStage(traceId.current, "SIGNUP_TICKET_START");
        const { error: ticketError } = await withInvitationTimeout(currentSignUp.ticket({ ticket }));
        if (!mounted.current || ticketRun.current !== run || timedOut.current) return;
        const updatedSignUp = signUpRef.current;
        if (!updatedSignUp) return;
        logInvitationStage(traceId.current, "SIGNUP_TICKET_RESULT", {
          status: updatedSignUp.status,
          missingFieldCount: updatedSignUp.missingFields?.length || 0,
          unverifiedFieldCount: updatedSignUp.unverifiedFields?.length || 0,
          createdSessionIdPresent: Boolean(updatedSignUp.createdSessionId),
          existingSessionPresent: Boolean(updatedSignUp.existingSession),
        });
        if (ticketError) {
          logInvitationStage(traceId.current, "ERROR", { stage: "ticket", reason: "provider_rejected" });
          setError(TICKET_ERROR);
          setPhase("error");
          return;
        }
        logInvitationStage(traceId.current, "TICKET_ACCEPTED");
        await advanceFromSignUpState();
      } catch {
        if (!mounted.current || ticketRun.current !== run || timedOut.current) return;
        logInvitationStage(traceId.current, "ERROR", {
          stage: "ticket",
          reason: timedOut.current ? "timeout" : "request_failed",
        });
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    })();
  }, [advanceFromSignUpState, isLoaded, isSignedIn, signUpReady, ticket]);

  useEffect(() => {
    if (phase !== "form" && phase !== "verification") return;
    if (liveSignUp?.status === "complete") {
      void advanceFromSignUpState().catch(() => {
        setError(ACTIVATION_ERROR);
        setPhase("error");
      });
    }
  }, [advanceFromSignUpState, liveSignUp?.status, phase]);

  useEffect(() => {
    const challenge = signUpRef.current?.protectCheck;
    if (
      phase !== "form" ||
      !protectCheckToken ||
      !challenge ||
      challenge.token !== protectCheckToken ||
      !protectCheckContainer.current
    )
      return;
    const controller = new AbortController();
    logInvitationStage(traceId.current, "PROTECT_CHECK_START");
    void executeProtectCheck(challenge, protectCheckContainer.current, { signal: controller.signal })
      .then((proofToken) => {
        if (!mounted.current || controller.signal.aborted) return null;
        logInvitationStage(traceId.current, "PROTECT_CHECK_RESULT", { proofPresent: Boolean(proofToken) });
        const currentSignUp = signUpRef.current;
        return currentSignUp ? withInvitationTimeout(currentSignUp.submitProtectCheck({ proofToken })) : null;
      })
      .then((result) => {
        if (!result || !mounted.current || controller.signal.aborted) return;
        if (result.error) {
          logInvitationStage(traceId.current, "ERROR", { stage: "protect_check", reason: "provider_rejected" });
          setError(SECURITY_CHECK_ERROR);
          return;
        }
        logInvitationStage(traceId.current, "PROTECT_CHECK_DONE");
        void advanceFromSignUpState().catch(() => {
          setError(ACTIVATION_ERROR);
          setPhase("error");
        });
      })
      .catch(() => {
        if (!mounted.current || controller.signal.aborted) return;
        logInvitationStage(traceId.current, "ERROR", { stage: "protect_check", reason: "request_failed" });
        setError(SECURITY_CHECK_ERROR);
      });
    return () => controller.abort();
  }, [advanceFromSignUpState, phase, protectCheckToken]);

  useEffect(() => {
    if (phase !== "finishing" && !sameSessionInvite) {
      lastAuthStage.current = null;
      return;
    }
    const nextStage =
      authState === "convex-loading"
        ? "CONVEX_AUTH_WAIT"
        : authState === "provisioning"
          ? "CONVEX_AUTH_READY"
          : authState === "authenticated" && sessionRole === "customer"
            ? "MEMBERSHIP_ACTIVE"
            : null;
    if (!nextStage || lastAuthStage.current === nextStage) return;
    lastAuthStage.current = nextStage;
    logInvitationStage(traceId.current, nextStage);
    if (nextStage === "CONVEX_AUTH_READY") {
      logInvitationStage(traceId.current, "MEMBERSHIP_RECONCILE_START");
    }
  }, [authState, phase, sameSessionInvite, sessionRole]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSignUp = signUpRef.current;
    if (!currentSignUp) return;
    setSubmitting(true);
    setError(null);
    try {
      const missingFields = currentSignUp.missingFields || [];
      const params: {
        emailAddress?: string;
        firstName?: string;
        lastName?: string;
        legalAccepted?: boolean;
        phoneNumber?: string;
        username?: string;
      } = {};
      if (missingFields.includes("email_address")) params.emailAddress = emailAddress.trim();
      if (missingFields.includes("email_address_or_phone_number")) {
        const identifier = emailOrPhone.trim();
        if (identifier.includes("@")) params.emailAddress = identifier;
        else params.phoneNumber = identifier;
      }
      if (missingFields.includes("first_name")) params.firstName = firstName.trim();
      if (missingFields.includes("last_name")) params.lastName = lastName.trim();
      if (missingFields.includes("legal_accepted")) params.legalAccepted = legalAccepted;
      if (missingFields.includes("phone_number")) params.phoneNumber = phoneNumber.trim();
      if (missingFields.includes("username")) params.username = username.trim();

      logInvitationStage(traceId.current, "SIGNUP_UPDATE_START", {
        method: missingFields.includes("password") ? "password" : "update",
        fieldCount: missingFields.length,
      });
      const { error: updateError } = await withInvitationTimeout(
        missingFields.includes("password")
          ? currentSignUp.password({ ...params, password })
          : currentSignUp.update(params),
      );
      const updatedSignUp = signUpRef.current;
      logInvitationStage(traceId.current, "SIGNUP_UPDATE_DONE", {
        success: !updateError,
        status: updatedSignUp?.status || currentSignUp.status,
        missingFieldCount: updatedSignUp?.missingFields?.length || 0,
        unverifiedFieldCount: updatedSignUp?.unverifiedFields?.length || 0,
      });
      if (updateError) {
        logInvitationStage(traceId.current, "ERROR", { stage: "signup_update", reason: "provider_rejected" });
        setError(ACTIVATION_ERROR);
        setPhase("error");
        return;
      }
      await advanceFromSignUpState();
    } catch {
      logInvitationStage(traceId.current, "ERROR", { stage: "signup_update", reason: "request_failed" });
      setError(ACTIVATION_ERROR);
      setPhase("error");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleVerification(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const currentSignUp = signUpRef.current;
    const verificationMethod = currentSignUp ? getVerificationMethod(currentSignUp) : null;
    if (!currentSignUp || !verificationMethod) {
      logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "unsupported_strategy" });
      setError(ACTIVATION_ERROR);
      setPhase("error");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const verificationSent = verificationSentKey === verificationMethod.key;
      if (!verificationSent || verificationMethod.mode === "link") {
        logInvitationStage(traceId.current, "VERIFICATION_REQUIRED", {
          channel: verificationMethod.field === "phone_number" ? "phone" : "email",
          strategy: verificationMethod.mode,
        });
        const { error: sendError } = await withInvitationTimeout(
          verificationMethod.mode === "link"
            ? currentSignUp.verifications.sendEmailLink({ verificationUrl: window.location.href })
            : verificationMethod.field === "phone_number"
              ? currentSignUp.verifications.sendPhoneCode()
              : currentSignUp.verifications.sendEmailCode(),
        );
        if (sendError) {
          logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "send_rejected" });
          setError(ACTIVATION_ERROR);
          return;
        }
        setVerificationSentKey(verificationMethod.key);
        if (verificationMethod.mode === "link" && emailLinkWaitStarted.current !== verificationMethod.key) {
          emailLinkWaitStarted.current = verificationMethod.key;
          void currentSignUp.verifications
            .waitForEmailLinkVerification()
            .then(({ error: waitError }) => {
              if (!mounted.current) return;
              if (waitError) {
                logInvitationStage(traceId.current, "ERROR", {
                  stage: "verification",
                  reason: "link_wait_failed",
                });
                setError(ACTIVATION_ERROR);
                return;
              }
              logInvitationStage(traceId.current, "VERIFICATION_DONE", { channel: "email", strategy: "link" });
              return advanceFromSignUpState();
            })
            .catch(() => {
              if (!mounted.current) return;
              logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "link_wait_failed" });
              setError(ACTIVATION_ERROR);
            });
        }
        return;
      }

      logInvitationStage(traceId.current, "VERIFICATION_SUBMIT", {
        channel: verificationMethod.field === "phone_number" ? "phone" : "email",
        strategy: verificationMethod.mode,
      });
      const { error: verifyError } = await withInvitationTimeout(
        verificationMethod.field === "phone_number"
          ? currentSignUp.verifications.verifyPhoneCode({ code: verificationCode.trim() })
          : currentSignUp.verifications.verifyEmailCode({ code: verificationCode.trim() }),
      );
      if (verifyError) {
        logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "verify_rejected" });
        setError(ACTIVATION_ERROR);
        return;
      }
      logInvitationStage(traceId.current, "VERIFICATION_DONE", {
        channel: verificationMethod.field === "phone_number" ? "phone" : "email",
        strategy: verificationMethod.mode,
      });
      await advanceFromSignUpState();
    } catch {
      logInvitationStage(traceId.current, "ERROR", { stage: "verification", reason: "request_failed" });
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
    (phase === "finishing" || sameSessionInvite) &&
    (authState === "admission-required" ||
      authState === "suspended" ||
      authState === "removed" ||
      authState === "configuration-missing");

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

  if (phase === "finishing" || sameSessionInvite) {
    return <div className="state-panel auth-invitation-state">Mengaktifkan akun BFG…</div>;
  }

  if (isSignedIn) {
    return <ClerkInvitationForm redirectUrl={ACCOUNT_REDIRECT} />;
  }

  const unsupportedFields = liveMissingFields.filter((field) => !SUPPORTED_INVITATION_FIELDS.has(field));
  const verificationMethod = liveSignUp ? getVerificationMethod(liveSignUp) : null;
  const verificationSent = verificationMethod?.key === verificationSentKey;
  const usePhoneVerification = verificationMethod?.field === "phone_number";

  if (phase === "verification") {
    return (
      <Card frame="form" className="auth-invitation-card">
        <form className="form-card" onSubmit={handleVerification}>
          <div>
            <span className="eyebrow">Undangan BFG</span>
            <h1>Verifikasi akun</h1>
            <p className="lede">
              {usePhoneVerification
                ? "Clerk memerlukan kode verifikasi nomor teleponmu."
                : "Clerk memerlukan kode verifikasi emailmu."}
            </p>
          </div>
          {verificationMethod?.mode === "link" ? (
            <p className="lede">Periksa emailmu dan buka tautan verifikasi. Halaman ini akan melanjutkan otomatis.</p>
          ) : verificationSent ? (
            <label className="field" htmlFor="invitation-verification-code">
              <span className="field-label">Kode verifikasi</span>
              <input
                id="invitation-verification-code"
                className="input"
                value={verificationCode}
                onChange={(event) => setVerificationCode(event.target.value)}
                inputMode="numeric"
                autoComplete="one-time-code"
                required
              />
            </label>
          ) : null}
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <Button type="submit" loading={submitting} loadingLabel="Memproses…">
              {verificationMethod?.mode === "link"
                ? verificationSent
                  ? "Kirim ulang tautan verifikasi"
                  : "Kirim tautan verifikasi"
                : verificationSent
                  ? "Verifikasi kode"
                  : "Kirim kode verifikasi"}
            </Button>
          </div>
          <div id="clerk-captcha" />
        </form>
      </Card>
    );
  }

  if (phase === "form") {
    if (liveProtectCheck || liveMissingFields.includes("protect_check")) {
      return (
        <Card frame="form" className="auth-invitation-card">
          <div className="form-card">
            <div>
              <span className="eyebrow">Undangan BFG</span>
              <h1>Verifikasi keamanan</h1>
              <p className="lede">{SECURITY_CHECK_ERROR}</p>
            </div>
            <div id="clerk-captcha" ref={protectCheckContainer} />
          </div>
        </Card>
      );
    }

    return (
      <Card frame="form" className="auth-invitation-card">
        <form className="form-card" onSubmit={handleSubmit}>
          <div>
            <span className="eyebrow">Undangan BFG</span>
            <h1>Lengkapi akun</h1>
            <p className="lede">Lengkapi akunmu untuk mengaktifkan akses Blessfriend.</p>
          </div>
          {liveMissingFields.includes("first_name") ? (
            <label className="field" htmlFor="invitation-first-name">
              <span className="field-label">Nama depan</span>
              <input
                id="invitation-first-name"
                className="input"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                autoComplete="given-name"
                required
              />
            </label>
          ) : null}
          {liveMissingFields.includes("last_name") ? (
            <label className="field" htmlFor="invitation-last-name">
              <span className="field-label">Nama belakang</span>
              <input
                id="invitation-last-name"
                className="input"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                autoComplete="family-name"
                required
              />
            </label>
          ) : null}
          {liveMissingFields.includes("email_address") ? (
            <label className="field" htmlFor="invitation-email">
              <span className="field-label">Email</span>
              <input
                id="invitation-email"
                className="input"
                type="email"
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          ) : null}
          {liveMissingFields.includes("email_address_or_phone_number") ? (
            <label className="field" htmlFor="invitation-email-or-phone">
              <span className="field-label">Email atau nomor telepon</span>
              <input
                id="invitation-email-or-phone"
                className="input"
                value={emailOrPhone}
                onChange={(event) => setEmailOrPhone(event.target.value)}
                autoComplete="email"
                required
              />
            </label>
          ) : null}
          {liveMissingFields.includes("phone_number") ? (
            <label className="field" htmlFor="invitation-phone">
              <span className="field-label">Nomor telepon</span>
              <input
                id="invitation-phone"
                className="input"
                type="tel"
                value={phoneNumber}
                onChange={(event) => setPhoneNumber(event.target.value)}
                autoComplete="tel"
                required
              />
            </label>
          ) : null}
          {liveMissingFields.includes("username") ? (
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
          ) : null}
          {liveMissingFields.includes("password") ? (
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
          ) : null}
          {liveMissingFields.includes("legal_accepted") ? (
            <label className="field" htmlFor="invitation-legal-accepted">
              <span className="field-label">Persetujuan</span>
              <input
                id="invitation-legal-accepted"
                type="checkbox"
                checked={legalAccepted}
                onChange={(event) => setLegalAccepted(event.target.checked)}
                required
              />
              <span>Saya menyetujui ketentuan yang berlaku.</span>
            </label>
          ) : null}
          {unsupportedFields.length > 0 ? (
            <p className="error-text" role="alert">
              Clerk masih memerlukan verifikasi akun tambahan yang belum tersedia di halaman ini. Muat ulang atau
              hubungi Admin BFG.
            </p>
          ) : null}
          {error ? (
            <p className="error-text" role="alert">
              {error}
            </p>
          ) : null}
          <div className="form-actions">
            <Button
              type="submit"
              loading={submitting}
              loadingLabel="Menyimpan…"
              disabled={unsupportedFields.length > 0}
            >
              Simpan dan lanjutkan
            </Button>
          </div>
          <div id="clerk-captcha" />
        </form>
      </Card>
    );
  }

  return (
    <>
      <div className="state-panel auth-invitation-state">Memeriksa undangan…</div>
      <div id="clerk-captcha" />
    </>
  );
}
