import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Gabung Blessfriends | Blessing For Good",
  description: "Kirim permintaan untuk bergabung dengan komunitas Blessfriends di Blessing For Good.",
  path: "/join",
  index: false,
});

export default function JoinLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
