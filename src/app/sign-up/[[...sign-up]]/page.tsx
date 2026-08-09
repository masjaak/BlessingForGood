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
      <p className="auth-invite-note">Account creation is available only through a valid BFG invitation.</p>
      <SignUp path="/sign-up" routing="path" fallbackRedirectUrl="/catalog" />
    </main>
  );
}
