import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkInvitationForm } from "@/components/clerk-invitation-form";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[]; __clerk_ticket?: string | string[] }>;
}) {
  const params = await searchParams;
  if (!params.__clerk_ticket) redirect("/");
  const redirectUrl = safeAuthRedirect(params.redirect_url);
  return (
    <main className="auth-page">
      <BackButton fallback="/" />
      <div className="auth-shell">
        <BrandLogo linkToHome={false} />
        <p className="auth-invite-note">Pembuatan akun hanya tersedia melalui undangan BFG yang masih berlaku.</p>
        <ClerkInvitationForm redirectUrl={redirectUrl} />
      </div>
    </main>
  );
}
