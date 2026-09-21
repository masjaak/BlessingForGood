import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Akun | Blessing For Good",
  description: "Ruang akun pribadi Blessing For Good.",
  path: "/account",
  index: false,
});

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
