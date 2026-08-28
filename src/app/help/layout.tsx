import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Bantuan BFG | Blessing For Goods",
  description: "Temukan panduan katalog, pesanan, akun, dan bantuan dari Blessing For Goods.",
  path: "/help",
});

export default function HelpLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
