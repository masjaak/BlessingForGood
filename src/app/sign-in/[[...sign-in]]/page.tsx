import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { ClerkAuthForm } from "@/components/clerk-auth-form";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/catalog");
  return (
    <main className="auth-page">
      <BrandLogo linkToHome={false} />
      <p className="auth-invite-note">Blessing For Goods khusus untuk anggota yang telah menerima undangan.</p>
      <ClerkAuthForm mode="sign-in" />
    </main>
  );
}
