import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";

export default async function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId } = await auth();
  if (!userId) redirect("/sign-in?redirect_url=%2Faccount%2Forders");
  return children;
}
