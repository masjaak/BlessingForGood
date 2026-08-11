import { SignIn } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { BrandLogo } from "@/components/brand";

export default async function SignInPage() {
  const { userId } = await auth();
  if (userId) redirect("/catalog");
  return (
    <main className="auth-page">
      <BrandLogo linkToHome={false} />
      <p className="auth-invite-note">Blessing For Goods khusus untuk anggota yang telah menerima undangan.</p>
      <SignIn path="/sign-in" routing="path" fallbackRedirectUrl="/catalog" />
    </main>
  );
}
