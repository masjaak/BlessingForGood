import { createPageMetadata } from "@/lib/seo";

export const metadata = createPageMetadata({
  title: "Secret Catalog | Blessing For Goods",
  description: "Katalog privat Blessing For Goods untuk anggota dengan akses yang sesuai.",
  path: "/catalog",
  index: false,
});

export default function CatalogLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return children;
}
