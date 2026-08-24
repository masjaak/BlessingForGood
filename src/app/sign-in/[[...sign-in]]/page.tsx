import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { safeAuthRedirect } from "@/lib/auth-redirect";
import { LinkButton } from "@/components/ui";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[]; account?: string | string[] }>;
}) {
  const { userId } = await auth();
  const params = await searchParams;
  const requestedRedirect = params.redirect_url;
  const redirectUrl = safeAuthRedirect(requestedRedirect);
  const backFallback = requestedRedirect ? redirectUrl : "/";
  if (userId) redirect(redirectUrl);
  return (
    <main className="auth-page">
      <BackButton fallback={backFallback} />
      <div className="auth-shell">
        <BrandLogo linkToHome={false} />
        <p className="auth-invite-note">Blessing For Goods khusus untuk anggota yang telah menerima undangan.</p>
        <ClerkAuthForm key={String(params.account ?? "default")} mode="sign-in" redirectUrl={redirectUrl} />
        <div className="auth-secondary-actions" aria-label="Pilihan akses BFG">
          <span>Belum terdaftar sebagai Blessfriend?</span>
          <div className="auth-secondary-links">
            <LinkButton href="/join">Ajukan bergabung</LinkButton>
            <LinkButton href="/sign-in?account=other" variant="secondary">
              Coba akun lain
            </LinkButton>
          </div>
        </div>
      </div>
    </main>
  );
}
