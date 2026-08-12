import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { BackButton } from "@/components/back-button";
import { ClerkAuthForm } from "@/components/clerk-auth-form";
import { safeAuthRedirect } from "@/lib/auth-redirect";

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_url?: string | string[] }>;
}) {
  const { userId } = await auth();
  const requestedRedirect = (await searchParams).redirect_url;
  const redirectUrl = safeAuthRedirect(requestedRedirect);
  const backFallback = requestedRedirect ? redirectUrl : "/";
  if (userId) redirect(redirectUrl);
  return (
    <main className="auth-page">
      <BackButton fallback={backFallback} />
      <BrandLogo linkToHome={false} />
      <p className="auth-invite-note">Blessing For Goods khusus untuk anggota yang telah menerima undangan.</p>
      <ClerkAuthForm mode="sign-in" redirectUrl={redirectUrl} />
    </main>
  );
}
