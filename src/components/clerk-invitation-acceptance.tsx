"use client";

import { useAuth, useSignIn, useSignUp, useUser } from "@clerk/nextjs";
import { executeProtectCheck } from "@clerk/shared/internal/clerk-js/protectCheck";
import { useRouter } from "next/navigation";
import { type FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { ClerkInvitationForm, maskInvitationEmail, normalizeInvitationEmail } from "@/components/clerk-invitation-form";
import { Button, Card } from "@/components/ui";
import { BFG_MEMBERSHIP_CORRELATION_KEY } from "@/config/clerk";
import { useProduct } from "@/domain/prototype/store";

const ACCOUNT_REDIRECT = "/account";
const TICKET_ERROR = "Undangan tidak valid atau sudah kedaluwarsa.";
const ACTIVATION_ERROR =
  "Aktivasi belum selesai. Coba lagi menggunakan undangan terbaru atau masuk dengan akun yang menerima undangan.";
const TECHNICAL_ERROR = "Data belum dapat disimpan. Periksa koneksi lalu coba lagi.";
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
type ClerkTicketStatus = "sign_in" | "sign_up" | "complete";
type SafeTraceValue = boolean | number | string | null | readonly string[];
type InvitationField =
  | "firstName"
  | "lastName"
  | "emailAddress"
  | "emailOrPhone"
  | "phoneNumber"
  | "username"
  | "password"
  | "legalAccepted";
type VerificationMethod = {
  field: "email_address" | "phone_number";
  mode: "code" | "link";
  key: string;
};

type ClerkErrorLike = {
  code?: unknown;
  name?: unknown;
  longMessage?: unknown;
  meta?: { paramName?: unknown; param_name?: unknown };
  errors?: readonly ClerkErrorLike[];
};

function getClerkErrorDetails(error: unknown) {
  const root = error && typeof error === "object" ? (error as ClerkErrorLike) : null;
  const nested = root?.errors?.[0] || root;
  const code = typeof nested?.code === "string" ? nested.code : null;
  const type = typeof nested?.name === "string" ? nested.name : null;
  const paramName =
    typeof nested?.meta?.paramName === "string"
      ? nested.meta.paramName
      : typeof nested?.meta?.param_name === "string"
        ? nested.meta.param_name
        : null;
  return { code, paramName, type };
}

function mapClerkField(value: string | null): InvitationField | null {
  switch (value?.replace(/[- ]/g, "_")) {
    case "first_name":
      return "firstName";
    case "last_name":
      return "lastName";
    case "email_address":
      return "emailAddress";
    case "email_address_or_phone_number":
    case "identifier":
      return "emailOrPhone";
    case "phone_number":
      return "phoneNumber";
    case "username":
      return "username";
    case "password":
      return "password";
    case "legal_accepted":
      return "legalAccepted";
    default:
      return null;
  }
}

function getClerkErrorField(error: unknown, missingFields: readonly string[] = []) {
  const { code, paramName } = getClerkErrorDetails(error);
  const explicitField = mapClerkField(paramName);
  if (explicitField) return explicitField;

  if (code?.includes("password")) return "password";
  if (code?.includes("username")) return "username";
  if (code?.includes("email")) return "emailAddress";
  if (code?.includes("phone")) return "phoneNumber";
  if (code?.includes("identifier")) {
    if (missingFields.includes("username")) return "username";
    if (missingFields.includes("email_address")) return "emailAddress";
    if (missingFields.includes("email_address_or_phone_number")) return "emailOrPhone";
    if (missingFields.includes("phone_number")) return "phoneNumber";
  }
  return null;
}

function getClerkFieldErrorMessage(error: unknown, field: InvitationField | null) {
  if (!field) return null;
  const { code } = getClerkErrorDetails(error);
  if (
    field === "username" &&
    ["form_identifier_exists", "form_identifier_exists__username", "username_exists", "username_exists_code"].includes(
      code || "",
    )
  ) {
    return "Username ini sudah digunakan. Pilih username lain.";
  }
  if (
    field === "password" &&
    [
      "form_password_length_too_short",
      "form_password_not_strong_enough",
      "form_password_pwned",
      "form_password_compromised",
      "form_password_validation_failed",
      "form_password_size_in_bytes_exceeded",
    ].includes(code || "")
  ) {
    return "Password belum memenuhi persyaratan keamanan Clerk.";
  }
  if (
    field === "username" &&
    ["form_username_invalid_character", "form_username_needs_non_number_char"].includes(code || "")
  ) {
    return "Username berisi karakter yang tidak didukung Clerk.";
  }
  if (field === "username" && code === "form_username_invalid_length") {
    return "Panjang username belum sesuai persyaratan Clerk.";
  }
  if (field === "emailAddress" && code === "form_email_address_blocked") {
    return "Email ini tidak dapat digunakan untuk membuat akun.";
  }
  return "Periksa nilai ini lalu coba lagi.";
}

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
  console.info("bfg_invitation_stage", { correlationId: traceId, traceId, stage, ...fields });
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

function getInvitationContinuationUrl(authMode: "sign-in" | "sign-up") {
  const url = new URL(window.location.href);
  if (authMode === "sign-in") url.searchParams.set("__clerk_status", "complete");
  return `${url.pathname}${url.search}${url.hash}`;
}

export function ClerkInvitationAcceptance({
  ticket,
  clerkStatus,
}: {
  ticket?: string;
  clerkStatus?: ClerkTicketStatus;
}) {
  const { isLoaded, isSignedIn, sessionId, userId } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();
  const { signIn } = useSignIn();
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
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<InvitationField, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [invitedEmail, setInvitedEmail] = useState<string | null>(null);
  const [inspectedTicket, setInspectedTicket] = useState<string | null>(null);
  const [authMode, setAuthMode] = useState<"sign-in" | "sign-up">(clerkStatus === "sign_in" ? "sign-in" : "sign-up");
  const signInRef = useRef(signIn);
  const startedTicket = useRef<string | null>(null);
  const traceId = useRef(createInvitationTraceId());
  const routeLogged = useRef(false);
  const sessionLogged = useRef(false);
  const lastAuthStage = useRef<string | null>(null);
  const mounted = useRef(true);
  const ticketRun = useRef<{ ticket: string } | null>(null);
  const signInTicketStarted = useRef<string | null>(null);
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
  const currentVerifiedEmail = normalizeInvitationEmail(
    user?.primaryEmailAddress?.verification?.status === "verified" ? user.primaryEmailAddress.emailAddress : null,
  );

  useEffect(() => {
    signInRef.current = signIn;
  }, [signIn]);

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
      finalizeStarted: true,
      status: currentSignUp.status,
      createdSessionIdPresent: Boolean(currentSignUp.createdSessionId),
    });
    setPhase("finishing");
    try {
      const { error: finalizeError } = await withInvitationTimeout(currentSignUp.finalize());
      logInvitationStage(traceId.current, "FINALIZE_DONE", {
        success: !finalizeError,
        finalizeCompleted: !finalizeError,
        status: signUpRef.current?.status || currentSignUp.status,
        clerkErrorCode: getClerkErrorDetails(finalizeError).code,
        clerkErrorField: getClerkErrorField(finalizeError),
      });
      if (finalizeError) {
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    } catch (finalizeError) {
      logInvitationStage(traceId.current, "FINALIZE_DONE", {
        success: false,
        finalizeCompleted: false,
        clerkErrorCode: getClerkErrorDetails(finalizeError).code,
        clerkErrorField: getClerkErrorField(finalizeError),
      });
      logInvitationStage(traceId.current, "ERROR", {
        stage: "finalize",
        reason: "request_failed",
        clerkErrorCode: getClerkErrorDetails(finalizeError).code,
        clerkErrorField: getClerkErrorField(finalizeError),
      });
      throw finalizeError;
    }
  }, []);

  const finalizeSignIn = useCallback(async (signInResource = signInRef.current) => {
    const currentSignIn = signInResource;
    if (!currentSignIn || finalizeStarted.current) return;
    finalizeStarted.current = true;
    logInvitationStage(traceId.current, "SIGNIN_FINALIZE_START", {
      finalizeStarted: true,
      status: currentSignIn.status,
      createdSessionIdPresent: Boolean(currentSignIn.createdSessionId),
      supportedFirstFactors: (currentSignIn.supportedFirstFactors || []).map((factor) => factor.strategy),
      supportedSecondFactors: (currentSignIn.supportedSecondFactors || []).map((factor) => factor.strategy),
    });
    setPhase("finishing");
    try {
      const { error: finalizeError } = await withInvitationTimeout(
        currentSignIn.finalize({
          navigate: ({ session }) => {
            if (session?.currentTask) {
              logInvitationStage(traceId.current, "SESSION_PENDING", {
                sessionTask: session.currentTask.key,
              });
              setError(null);
              setPhase("form");
              return;
            }
            logInvitationStage(traceId.current, "SESSION_ACTIVE", { sessionTask: null });
          },
        }),
      );
      logInvitationStage(traceId.current, "SIGNIN_FINALIZE_DONE", {
        success: !finalizeError,
        finalizeCompleted: !finalizeError,
        status: currentSignIn.status,
        clerkErrorCode: getClerkErrorDetails(finalizeError).code,
      });
      if (finalizeError) {
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    } catch (finalizeError) {
      logInvitationStage(traceId.current, "SIGNIN_FINALIZE_DONE", {
        success: false,
        finalizeCompleted: false,
        clerkErrorCode: getClerkErrorDetails(finalizeError).code,
      });
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
      missingFields,
      unverifiedFields,
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
    if (
      isLoaded &&
      isUserLoaded &&
      isSignedIn &&
      sessionId &&
      userId &&
      currentVerifiedEmail &&
      authState === "authenticated" &&
      sessionRole === "customer"
    ) {
      redirected.current = true;
      logInvitationStage(traceId.current, "CUSTOMER_ACTIVE");
      logInvitationStage(traceId.current, "REDIRECT_ACCOUNT");
      window.sessionStorage.removeItem(BFG_MEMBERSHIP_CORRELATION_KEY);
      router.replace(ACCOUNT_REDIRECT);
    }
  }, [
    authState,
    currentVerifiedEmail,
    isLoaded,
    isSignedIn,
    isUserLoaded,
    phase,
    router,
    sameSessionInvite,
    sessionId,
    sessionRole,
    userId,
  ]);

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
    if (!ticket || !isLoaded || clerkStatus !== "complete") return;
    startedTicket.current = ticket;
    ticketRun.current = { ticket };
    queueMicrotask(() => {
      if (!mounted.current || ticketRun.current?.ticket !== ticket) return;
      setInspectedTicket(ticket);
      setAuthMode("sign-in");
      setError(null);
      setPhase("finishing");
    });
  }, [clerkStatus, isLoaded, ticket]);

  useEffect(() => {
    const currentSignIn = signInRef.current;
    const signInTicketRequested = clerkStatus === "sign_in" || (authMode === "sign-in" && inspectedTicket === ticket);
    if (
      !ticket ||
      !isLoaded ||
      !currentSignIn ||
      !signInTicketRequested ||
      clerkStatus === "complete" ||
      (isSignedIn && !isUserLoaded) ||
      signInTicketStarted.current === ticket
    )
      return;
    signInTicketStarted.current = ticket;
    startedTicket.current = ticket;
    const run = { ticket };
    ticketRun.current = run;
    timedOut.current = false;
    setPhase("loading");
    setAuthMode("sign-in");
    setError(null);
    const wasSignedIn = isSignedIn;

    void (async () => {
      try {
        logInvitationStage(traceId.current, "SIGNIN_TICKET_START", {
          statusFromUrl: clerkStatus ?? null,
          signInTicketStarted: true,
        });
        const { error: ticketError } = await withInvitationTimeout(currentSignIn.ticket({ ticket }));
        if (!mounted.current || ticketRun.current !== run || timedOut.current) return;
        const updatedSignIn = currentSignIn;
        const nextInvitedEmail = normalizeInvitationEmail(updatedSignIn.identifier);
        if (nextInvitedEmail) setInvitedEmail(nextInvitedEmail);
        setInspectedTicket(ticket);
        const emailsMatch = Boolean(
          wasSignedIn && nextInvitedEmail && currentVerifiedEmail && nextInvitedEmail === currentVerifiedEmail,
        );
        logInvitationStage(traceId.current, "SIGNIN_TICKET_RESULT", {
          statusFromUrl: clerkStatus ?? null,
          signInTicketResolved: true,
          returnedSignInStatus: updatedSignIn.status,
          hookSignInStatus: signInRef.current?.status || null,
          currentTaskPresent: false,
          selectedRenderState: ticketError ? "error" : updatedSignIn.status === "complete" ? "finishing" : "form",
          identifier: maskInvitationEmail(nextInvitedEmail),
          currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
          currentClerkSubjectSuffix: userId?.slice(-8) || null,
          emailsMatch,
          createdSessionIdPresent: Boolean(updatedSignIn.createdSessionId),
          supportedFirstFactors: (updatedSignIn.supportedFirstFactors || []).map((factor) => factor.strategy),
          supportedSecondFactors: (updatedSignIn.supportedSecondFactors || []).map((factor) => factor.strategy),
          safeClerkErrorCode: getClerkErrorDetails(ticketError).code,
          safeClerkErrorType: getClerkErrorDetails(ticketError).type,
        });
        if (wasSignedIn && nextInvitedEmail && currentVerifiedEmail && !emailsMatch) {
          logInvitationStage(traceId.current, "INVITATION_EMAIL_MISMATCH", {
            invitedEmail: maskInvitationEmail(nextInvitedEmail),
            currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
            currentClerkSubjectSuffix: userId?.slice(-8) || null,
            emailsMatch: false,
          });
          setPhase("form");
          return;
        }
        if (ticketError) {
          const ticketErrorCode = getClerkErrorDetails(ticketError).code;
          if (wasSignedIn && emailsMatch && ticketErrorCode?.includes("session")) {
            setPhase("finishing");
            return;
          }
          logInvitationStage(traceId.current, "ERROR", { stage: "sign_in_ticket", reason: "provider_rejected" });
          setError(TICKET_ERROR);
          setPhase("error");
          return;
        }
        if (updatedSignIn.status === "complete") {
          logInvitationStage(traceId.current, "SIGNIN_COMPLETE", {
            createdSessionIdPresent: Boolean(updatedSignIn.createdSessionId),
          });
          await finalizeSignIn(currentSignIn);
          return;
        }
        logInvitationStage(traceId.current, "SIGNIN_TICKET_ACCEPTED", { status: updatedSignIn.status });
        setPhase("form");
      } catch (signInFailure) {
        if (!mounted.current || ticketRun.current !== run || timedOut.current) return;
        logInvitationStage(traceId.current, "ERROR", {
          stage: "sign_in_ticket",
          reason: timedOut.current ? "timeout" : "request_failed",
          clerkErrorCode: getClerkErrorDetails(signInFailure).code,
          safeClerkErrorType: getClerkErrorDetails(signInFailure).type,
        });
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    })();
  }, [
    authMode,
    clerkStatus,
    currentVerifiedEmail,
    finalizeSignIn,
    inspectedTicket,
    isLoaded,
    isSignedIn,
    isUserLoaded,
    ticket,
    userId,
  ]);

  useEffect(() => {
    const currentSignUp = signUpRef.current;
    if (
      !ticket ||
      !isLoaded ||
      !currentSignUp ||
      (isSignedIn && !isUserLoaded) ||
      clerkStatus === "sign_in" ||
      clerkStatus === "complete"
    ) {
      if (!ticket) ticketRun.current = null;
      return;
    }
    if (sameSessionInvite || startedTicket.current === ticket) return;
    startedTicket.current = ticket;
    const run = { ticket };
    ticketRun.current = run;
    timedOut.current = false;
    setPhase("loading");
    setError(null);
    const wasSignedIn = isSignedIn;

    void (async () => {
      try {
        logInvitationStage(traceId.current, "SIGNUP_TICKET_START");
        const { error: ticketError } = await withInvitationTimeout(currentSignUp.ticket({ ticket }));
        if (!mounted.current || ticketRun.current !== run || timedOut.current) return;
        const updatedSignUp = signUpRef.current;
        if (!updatedSignUp) return;
        const nextInvitedEmail = normalizeInvitationEmail(updatedSignUp.emailAddress);
        setInvitedEmail(nextInvitedEmail);
        setInspectedTicket(ticket);
        const emailsMatch = Boolean(
          wasSignedIn && nextInvitedEmail && currentVerifiedEmail && nextInvitedEmail === currentVerifiedEmail,
        );
        logInvitationStage(traceId.current, "SIGNUP_TICKET_RESULT", {
          status: updatedSignUp.status,
          missingFields: updatedSignUp.missingFields || [],
          unverifiedFields: updatedSignUp.unverifiedFields || [],
          createdSessionIdPresent: Boolean(updatedSignUp.createdSessionId),
          existingSessionPresent: Boolean(updatedSignUp.existingSession),
          invitedEmail: maskInvitationEmail(nextInvitedEmail),
          currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
          currentClerkSubjectSuffix: userId?.slice(-8) || null,
          emailsMatch,
        });
        if (wasSignedIn && nextInvitedEmail && currentVerifiedEmail && !emailsMatch) {
          logInvitationStage(traceId.current, "INVITATION_EMAIL_MISMATCH", {
            invitedEmail: maskInvitationEmail(nextInvitedEmail),
            currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
            currentClerkSubjectSuffix: userId?.slice(-8) || null,
            emailsMatch: false,
          });
          setPhase("form");
          return;
        }
        if (ticketError) {
          const ticketErrorCode = getClerkErrorDetails(ticketError).code;
          if (wasSignedIn && emailsMatch) {
            logInvitationStage(traceId.current, "INVITATION_EMAIL_MATCH", {
              invitedEmail: maskInvitationEmail(nextInvitedEmail),
              currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
              currentClerkSubjectSuffix: userId?.slice(-8) || null,
              emailsMatch: true,
            });
            setPhase("finishing");
            return;
          }
          if (ticketErrorCode?.includes("exists") || ticketErrorCode === "user_exists") {
            logInvitationStage(traceId.current, "EXISTING_IDENTITY_SIGNIN_REQUIRED");
            setAuthMode("sign-in");
            setError(null);
            setPhase("loading");
            return;
          }
          logInvitationStage(traceId.current, "ERROR", { stage: "ticket", reason: "provider_rejected" });
          setError(TICKET_ERROR);
          setPhase("error");
          return;
        }
        if (wasSignedIn) {
          if (emailsMatch) {
            logInvitationStage(traceId.current, "INVITATION_EMAIL_MATCH", {
              invitedEmail: maskInvitationEmail(nextInvitedEmail),
              currentVerifiedEmail: maskInvitationEmail(currentVerifiedEmail),
              currentClerkSubjectSuffix: userId?.slice(-8) || null,
              emailsMatch: true,
            });
            setPhase("finishing");
          } else {
            setPhase("form");
          }
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
  }, [
    advanceFromSignUpState,
    currentVerifiedEmail,
    clerkStatus,
    isLoaded,
    isSignedIn,
    isUserLoaded,
    sameSessionInvite,
    signUpReady,
    ticket,
    userId,
  ]);

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

  useEffect(() => {
    if (
      authMode !== "sign-in" ||
      !ticket ||
      inspectedTicket !== ticket ||
      !invitedEmail ||
      !isUserLoaded ||
      !isSignedIn ||
      invitedEmail !== currentVerifiedEmail ||
      authState !== "authenticated" ||
      sessionRole !== "customer"
    )
      return;
    queueMicrotask(() => {
      if (mounted.current && !redirected.current) setPhase("finishing");
    });
  }, [
    authMode,
    authState,
    currentVerifiedEmail,
    inspectedTicket,
    invitedEmail,
    isSignedIn,
    isUserLoaded,
    sessionRole,
    ticket,
  ]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;
    const currentSignUp = signUpRef.current;
    if (!currentSignUp) return;
    setSubmitting(true);
    setError(null);
    setFieldErrors({});
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
        submitStarted: true,
        submittedFieldNames: missingFields,
        updateStarted: true,
        statusBefore: currentSignUp.status,
      });
      let updateResult: { error: unknown };
      try {
        updateResult = await withInvitationTimeout(
          missingFields.includes("password")
            ? currentSignUp.password({ ...params, password })
            : currentSignUp.update(params),
        );
      } catch (updateFailure) {
        const updateFailureDetails = getClerkErrorDetails(updateFailure);
        logInvitationStage(traceId.current, "SIGNUP_UPDATE_DONE", {
          success: false,
          updateFinished: false,
          status: currentSignUp.status,
          statusAfter: currentSignUp.status,
          missingFields: currentSignUp.missingFields || [],
          unverifiedFields: currentSignUp.unverifiedFields || [],
          createdSessionIdPresent: Boolean(currentSignUp.createdSessionId),
          clerkErrorCode: updateFailureDetails.code,
          clerkErrorField: getClerkErrorField(updateFailure, missingFields),
        });
        logInvitationStage(traceId.current, "ERROR", {
          stage: "signup_update",
          reason: "request_failed",
          clerkErrorCode: updateFailureDetails.code,
          clerkErrorField: getClerkErrorField(updateFailure, missingFields),
        });
        const field = getClerkErrorField(updateFailure, missingFields);
        const message = getClerkFieldErrorMessage(updateFailure, field);
        if (field && message) setFieldErrors({ [field]: message });
        else setError(TECHNICAL_ERROR);
        setPhase("form");
        return;
      }
      const { error: updateError } = updateResult;
      const updatedSignUp = signUpRef.current;
      const updateErrorDetails = getClerkErrorDetails(updateError);
      logInvitationStage(traceId.current, "SIGNUP_UPDATE_DONE", {
        success: !updateError,
        updateFinished: true,
        status: updatedSignUp?.status || currentSignUp.status,
        statusAfter: updatedSignUp?.status || currentSignUp.status,
        missingFields: updatedSignUp?.missingFields || currentSignUp.missingFields || [],
        unverifiedFields: updatedSignUp?.unverifiedFields || currentSignUp.unverifiedFields || [],
        createdSessionIdPresent: Boolean(updatedSignUp?.createdSessionId),
        clerkErrorCode: updateErrorDetails.code,
        clerkErrorField: getClerkErrorField(updateError, missingFields),
      });
      if (updateError) {
        const field = getClerkErrorField(updateError, missingFields);
        logInvitationStage(traceId.current, "ERROR", {
          stage: "signup_update",
          reason: "provider_rejected",
          clerkErrorCode: updateErrorDetails.code,
          clerkErrorField: field,
        });
        const message = getClerkFieldErrorMessage(updateError, field);
        if (field && message) {
          setFieldErrors({ [field]: message });
          setPhase("form");
        } else {
          setError(TECHNICAL_ERROR);
          setPhase("form");
        }
        return;
      }
      try {
        await advanceFromSignUpState();
      } catch (progressFailure) {
        const progressFailureDetails = getClerkErrorDetails(progressFailure);
        logInvitationStage(traceId.current, "ERROR", {
          stage: "post_signup_update",
          reason: "request_failed",
          clerkErrorCode: progressFailureDetails.code,
          clerkErrorField: getClerkErrorField(progressFailure),
        });
        setError(ACTIVATION_ERROR);
        setPhase("error");
      }
    } catch (submitFailure) {
      const submitFailureDetails = getClerkErrorDetails(submitFailure);
      logInvitationStage(traceId.current, "ERROR", {
        stage: "signup_submit",
        reason: "request_failed",
        clerkErrorCode: submitFailureDetails.code,
        clerkErrorField: getClerkErrorField(submitFailure),
      });
      setError(TECHNICAL_ERROR);
      setPhase("form");
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
    isUserLoaded &&
    Boolean(currentVerifiedEmail) &&
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
    return (
      <ClerkInvitationForm
        authMode={authMode}
        redirectUrl={getInvitationContinuationUrl(authMode)}
        invitedEmail={inspectedTicket === ticket ? invitedEmail : null}
      />
    );
  }

  if (authMode === "sign-in") {
    return (
      <ClerkInvitationForm
        authMode="sign-in"
        redirectUrl={getInvitationContinuationUrl("sign-in")}
        invitedEmail={inspectedTicket === ticket ? invitedEmail : null}
      />
    );
  }

  const unsupportedFields = liveMissingFields.filter((field) => !SUPPORTED_INVITATION_FIELDS.has(field));
  const verificationMethod = liveSignUp ? getVerificationMethod(liveSignUp) : null;
  const verificationSent = verificationMethod?.key === verificationSentKey;
  const usePhoneVerification = verificationMethod?.field === "phone_number";
  const renderFieldError = (field: InvitationField) => {
    const message = fieldErrors[field];
    return message ? (
      <p id={`invitation-${field}-error`} className="error-text" role="alert">
        {message}
      </p>
    ) : null;
  };

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
            <>
              <label className="field" htmlFor="invitation-first-name">
                <span className="field-label">Nama depan</span>
                <input
                  id="invitation-first-name"
                  className="input"
                  value={firstName}
                  onChange={(event) => setFirstName(event.target.value)}
                  autoComplete="given-name"
                  aria-invalid={Boolean(fieldErrors.firstName)}
                  aria-describedby={fieldErrors.firstName ? "invitation-firstName-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("firstName")}
            </>
          ) : null}
          {liveMissingFields.includes("last_name") ? (
            <>
              <label className="field" htmlFor="invitation-last-name">
                <span className="field-label">Nama belakang</span>
                <input
                  id="invitation-last-name"
                  className="input"
                  value={lastName}
                  onChange={(event) => setLastName(event.target.value)}
                  autoComplete="family-name"
                  aria-invalid={Boolean(fieldErrors.lastName)}
                  aria-describedby={fieldErrors.lastName ? "invitation-lastName-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("lastName")}
            </>
          ) : null}
          {liveMissingFields.includes("email_address") ? (
            <>
              <label className="field" htmlFor="invitation-email">
                <span className="field-label">Email</span>
                <input
                  id="invitation-email"
                  className="input"
                  type="email"
                  value={emailAddress}
                  onChange={(event) => setEmailAddress(event.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.emailAddress)}
                  aria-describedby={fieldErrors.emailAddress ? "invitation-emailAddress-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("emailAddress")}
            </>
          ) : null}
          {liveMissingFields.includes("email_address_or_phone_number") ? (
            <>
              <label className="field" htmlFor="invitation-email-or-phone">
                <span className="field-label">Email atau nomor telepon</span>
                <input
                  id="invitation-email-or-phone"
                  className="input"
                  value={emailOrPhone}
                  onChange={(event) => setEmailOrPhone(event.target.value)}
                  autoComplete="email"
                  aria-invalid={Boolean(fieldErrors.emailOrPhone)}
                  aria-describedby={fieldErrors.emailOrPhone ? "invitation-emailOrPhone-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("emailOrPhone")}
            </>
          ) : null}
          {liveMissingFields.includes("phone_number") ? (
            <>
              <label className="field" htmlFor="invitation-phone">
                <span className="field-label">Nomor telepon</span>
                <input
                  id="invitation-phone"
                  className="input"
                  type="tel"
                  value={phoneNumber}
                  onChange={(event) => setPhoneNumber(event.target.value)}
                  autoComplete="tel"
                  aria-invalid={Boolean(fieldErrors.phoneNumber)}
                  aria-describedby={fieldErrors.phoneNumber ? "invitation-phoneNumber-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("phoneNumber")}
            </>
          ) : null}
          {liveMissingFields.includes("username") ? (
            <>
              <label className="field" htmlFor="invitation-username">
                <span className="field-label">Username</span>
                <input
                  id="invitation-username"
                  className="input"
                  value={username}
                  onChange={(event) => setUsername(event.target.value)}
                  autoComplete="username"
                  aria-invalid={Boolean(fieldErrors.username)}
                  aria-describedby={fieldErrors.username ? "invitation-username-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("username")}
            </>
          ) : null}
          {liveMissingFields.includes("password") ? (
            <>
              <label className="field" htmlFor="invitation-password">
                <span className="field-label">Password</span>
                <input
                  id="invitation-password"
                  className="input"
                  type="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  autoComplete="new-password"
                  aria-invalid={Boolean(fieldErrors.password)}
                  aria-describedby={fieldErrors.password ? "invitation-password-error" : undefined}
                  required
                />
              </label>
              {renderFieldError("password")}
            </>
          ) : null}
          {liveMissingFields.includes("legal_accepted") ? (
            <>
              <label className="field" htmlFor="invitation-legal-accepted">
                <span className="field-label">Persetujuan</span>
                <input
                  id="invitation-legal-accepted"
                  type="checkbox"
                  checked={legalAccepted}
                  onChange={(event) => setLegalAccepted(event.target.checked)}
                  aria-invalid={Boolean(fieldErrors.legalAccepted)}
                  aria-describedby={fieldErrors.legalAccepted ? "invitation-legalAccepted-error" : undefined}
                  required
                />
                <span>Saya menyetujui ketentuan yang berlaku.</span>
              </label>
              {renderFieldError("legalAccepted")}
            </>
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
