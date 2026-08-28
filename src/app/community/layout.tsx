import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Komunitas Blessfriends | Blessing For Goods",
  description: "Kenali komunitas Blessfriends dan cara BFG membantu menemukan buku impor pilihan.",
  path: "/community",
});

export default function CommunityLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
