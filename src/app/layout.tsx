import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { BfgSplash } from "@/components/bfg-splash";
import { bfgClerkAppearance, bfgClerkLocalization } from "@/config/clerk";
import { ProductProvider } from "@/domain/prototype/store";
import "./globals.css";

const SITE_TITLE = "Blessing For Goods — Imported Bookstore & Community";
const SITE_DESCRIPTION =
  "Blessing For Goods adalah community-led imported bookstore untuk menemukan Ready Stock, preorder, dan curated titles pilihan.";
const SOCIAL_IMAGE_ALT = "Blessing For Goods — Imported Bookstore & Community";

export const metadata: Metadata = {
  metadataBase: new URL("https://www.blessingforgood.com"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: "Blessing For Goods",
    type: "website",
    images: [
      {
        url: "/opengraphimageBFG.png",
        width: 1672,
        height: 941,
        alt: SOCIAL_IMAGE_ALT,
        type: "image/png",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    images: [{ url: "/opengraphimageBFG.png", alt: SOCIAL_IMAGE_ALT }],
  },
  icons: {
    icon: "/brand/logos/Logo-2.png",
    apple: "/brand/logos/Logo-2.png",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="id">
      <body>
        <ClerkProvider appearance={bfgClerkAppearance} localization={bfgClerkLocalization}>
          <ProductProvider>
            <BfgSplash />
            {children}
          </ProductProvider>
        </ClerkProvider>
      </body>
    </html>
  );
}
