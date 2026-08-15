import { auth } from "@clerk/nextjs/server";
import { AdminLayoutShell } from "@/components/admin-layout-shell";

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
