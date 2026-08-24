import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export default async function SignUpPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[]; __clerk_ticket?: string | string[] }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  if (!params.__clerk_ticket) redirect("/");
  const redirectUrl = safeAuthRedirect(params.redirect_url);
  if (userId) redirect(redirectUrl);
  return (
    <main className="auth-page">
      <BackButton fallback="/" />
      <div className="auth-shell">
        <BrandLogo linkToHome={false} />
        <p className="auth-invite-note">Pembuatan akun hanya tersedia melalui undangan BFG yang masih berlaku.</p>
        <ClerkAuthForm mode="sign-up" redirectUrl={redirectUrl} />
      </div>
    </main>
  );
}
