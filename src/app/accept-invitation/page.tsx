import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkInvitationAcceptance } from "@/components/clerk-invitation-acceptance";

export default async function AcceptInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ __clerk_status?: string | string[]; __clerk_ticket?: string | string[] }>;
}) {
  const params = await searchParams;
  const ticket = Array.isArray(params.__clerk_ticket) ? params.__clerk_ticket[0] : params.__clerk_ticket;
  const status = Array.isArray(params.__clerk_status) ? params.__clerk_status[0] : params.__clerk_status;
  const clerkStatus = status === "sign_in" || status === "sign_up" || status === "complete" ? status : undefined;

  return (
    <main className="auth-page">
      <BackButton fallback="/" />
      <div className="auth-shell">
        <BrandLogo linkToHome={false} />
        <p className="auth-invite-note">Pembuatan akun hanya tersedia melalui undangan BFG yang masih berlaku.</p>
        <ClerkInvitationAcceptance ticket={ticket} clerkStatus={clerkStatus} />
      </div>
    </main>
  );
}
