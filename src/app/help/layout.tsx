import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Bantuan BFG | Blessing For Good",
  description: "Temukan panduan katalog, pesanan, akun, dan bantuan dari Blessing For Good.",
  path: "/help",
});

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
