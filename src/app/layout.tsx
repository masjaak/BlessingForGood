import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { ProductProvider } from "@/domain/prototype/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blessing For Goods",
  description: "Toko buku impor berbasis komunitas untuk Blessfriends.",
  icons: {
    icon: "/brand/logos/Logo-2.png",
    apple: "/brand/logos/Logo-2.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <ClerkProvider>
          <ProductProvider>{children}</ProductProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
