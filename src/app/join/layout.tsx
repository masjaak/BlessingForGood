import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Gabung Blessfriends | Blessing For Goods",
  description: "Kirim permintaan untuk bergabung dengan komunitas Blessfriends di Blessing For Goods.",
  path: "/join",
  index: false,
});

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
