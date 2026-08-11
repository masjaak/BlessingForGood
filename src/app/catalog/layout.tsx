import { auth } from "@clerk/nextjs/server";

export default async function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const { userId, redirectToSignIn } = await auth();
  if (!userId) redirectToSignIn();
  return children;
}
