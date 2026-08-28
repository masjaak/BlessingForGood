import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkInvitationAcceptance } from "@/components/clerk-invitation-acceptance";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Aktivasi Undangan | Blessing For Goods",
  description: "Selesaikan aktivasi akun Blessing For Goods melalui undangan yang masih berlaku.",
  path: "/sign-up",
  index: false,
});

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ __clerk_status?: string | string[]; __clerk_ticket?: string | string[] }>;
}) {
  const params = await searchParams;
  const ticket = Array.isArray(params.__clerk_ticket) ? params.__clerk_ticket[0] : params.__clerk_ticket;
  const status = Array.isArray(params.__clerk_status) ? params.__clerk_status[0] : params.__clerk_status;
  const clerkStatus = status === "sign_in" || status === "sign_up" || status === "complete" ? status : undefined;
  if (!ticket) redirect("/");
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
