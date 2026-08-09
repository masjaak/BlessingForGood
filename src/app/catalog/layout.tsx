import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Fcatalog");
  return children;
}
