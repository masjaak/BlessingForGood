"use client";

import { useAuth, useUser } from "@clerk/nextjs";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { Button } from "@/components/ui";

export function normalizeInvitationEmail(value: string | null | undefined) {
  const normalized = value?.trim().toLowerCase() || null;
  return normalized && normalized.includes("@") ? normalized : null;
}

export function maskInvitationEmail(email: string | null) {
  if (!email) return null;
  const [local, domain] = email.split("@", 2);
  return domain ? `${local.slice(0, 1)}***@${domain}` : "***";
}

export function ClerkInvitationForm({
  redirectUrl,
  invitedEmail,
}: {
  redirectUrl: string;
  invitedEmail?: string | null;
}) {
  const { isLoaded, isSignedIn, signOut } = useAuth();
  const { isLoaded: isUserLoaded, user } = useUser();

  if (!isLoaded || !isUserLoaded) {
    return <div className="state-panel">Memuat undangan…</div>;
  }
  if (isSignedIn) {
    const currentEmail = normalizeInvitationEmail(
      user?.primaryEmailAddress?.verification?.status === "verified" ? user.primaryEmailAddress.emailAddress : null,
    );
    const targetEmail = normalizeInvitationEmail(invitedEmail);
    const emailsMatch = Boolean(currentEmail && targetEmail && currentEmail === targetEmail);
    const emailMismatch = Boolean(currentEmail && targetEmail && currentEmail !== targetEmail);
    return (
      <div className="guard-card">
        <span className="eyebrow">Undangan BFG</span>
        <h1>
          {emailsMatch
            ? "Undangan cocok dengan akun BFG ini."
            : emailMismatch
              ? "Undangan ini ditujukan untuk akun lain."
              : "Akun penerima undangan belum dapat dipastikan."}
        </h1>
        {currentEmail ? <p>Saat ini kamu masuk sebagai: {maskInvitationEmail(currentEmail)}</p> : null}
        {targetEmail ? <p>Undangan ditujukan untuk: {maskInvitationEmail(targetEmail)}</p> : null}
        <p>
          {emailsMatch
            ? "Lanjutkan dari halaman penerimaan undangan untuk mengaktifkan aksesmu."
            : emailMismatch
              ? "Keluar dari akun saat ini dan lanjutkan menggunakan akun yang menerima undangan."
              : "Buka tautan undangan terbaru dari BFG dan gunakan akun dengan email terverifikasi yang sesuai."}
        </p>
        <Button
          type="button"
          onClick={() => void signOut({ redirectUrl: `${window.location.pathname}${window.location.search}` })}
        >
          {emailMismatch ? "Gunakan akun yang diundang" : "Ganti akun"}
        </Button>
      </div>
    );
  }
  return <ClerkAuthForm mode="sign-up" redirectUrl={redirectUrl} />;
}
