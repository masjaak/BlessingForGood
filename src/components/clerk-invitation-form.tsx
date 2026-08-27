"use client";

import { useAuth } from "@clerk/nextjs";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { Button } from "@/components/ui";

export function ClerkInvitationForm({ redirectUrl }: { redirectUrl: string }) {
  const { isLoaded, isSignedIn, signOut } = useAuth();

  if (!isLoaded) {
    return <div className="state-panel">Memuat undangan…</div>;
  }
  if (isSignedIn) {
    return (
      <div className="guard-card">
        <span className="eyebrow">Undangan BFG</span>
        <h1>Undangan ini ditujukan untuk email lain.</h1>
        <p>Keluar dari akun saat ini dan lanjutkan menggunakan email yang menerima undangan.</p>
        <Button
          type="button"
          onClick={() => void signOut({ redirectUrl: `${window.location.pathname}${window.location.search}` })}
        >
          Gunakan akun yang diundang
        </Button>
      </div>
    );
  }
  return <ClerkAuthForm mode="sign-up" redirectUrl={redirectUrl} />;
}
