import { auth } from "@clerk/nextjs/server";
import { AdminLayoutShell } from "@/components/admin-layout-shell";
import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Admin | Blessing For Goods",
  description: "Ruang kerja operasional Blessing For Goods.",
  path: "/admin",
  index: false,
});

export default async function AdminLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  return <AdminLayoutShell>{children}</AdminLayoutShell>;
}
