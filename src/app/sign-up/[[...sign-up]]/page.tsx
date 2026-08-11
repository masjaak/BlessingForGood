import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";
import { ClerkAuthForm } from "@/components/clerk-auth-form";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/catalog");
  return (
    <main className="auth-page">
      <BrandLogo linkToHome={false} />
      <p className="auth-invite-note">Pembuatan akun hanya tersedia melalui undangan BFG yang masih berlaku.</p>
      <ClerkAuthForm mode="sign-up" />
    </main>
  );
}
