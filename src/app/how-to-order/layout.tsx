import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Cara Memesan Buku | Blessing For Goods",
  description: "Pelajari alur memilih, memesan, dan mengikuti perjalanan buku di Blessing For Goods.",
  path: "/how-to-order",
});

export default function HowToOrderLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
