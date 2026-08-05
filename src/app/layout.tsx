import type { Metadata } from "next";
import { PrototypeProvider } from "@/domain/prototype/store";
import "./globals.css";

export const metadata: Metadata = {
  title: "Blessing For Goods",
  description: "A community-led imported bookstore prototype for Blessfriends.",
  icons: {
    icon: "/brand/logos/Logo-2.png",
    apple: "/brand/logos/Logo-2.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <PrototypeProvider>{children}</PrototypeProvider>
      </body>
    </html>
  );
}
