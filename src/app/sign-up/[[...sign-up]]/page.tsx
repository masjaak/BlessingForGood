import { SignUp } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";

export default async function SignUpPage() {
  const { userId } = await auth();
  if (userId) redirect("/catalog");
  return (
    <main className="auth-page">
      <BrandLogo linkToHome={false} />
      <p className="auth-invite-note">Pembuatan akun hanya tersedia melalui undangan BFG yang masih berlaku.</p>
      <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/catalog" />
    </main>
  );
}
