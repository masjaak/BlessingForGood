import Link from "next/link";
import type { ReactNode } from "react";
import { Show, SignInButton, UserButton } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand";
import { AdminShellLink } from "@/components/admin-shell-link";

const customerLinks = [
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/catalog", label: "Secret Catalog" },
  { href: "/account/orders", label: "Pesanan" },
  { href: "/account", label: "Akun" },
];

const publicLinks = [
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/community", label: "Komunitas" },
  { href: "/how-to-order", label: "Cara memesan" },
];

const supportLinks = [
  { href: "/community", label: "Komunitas" },
  { href: "/join", label: "Gabung Blessfriends" },
  { href: "/how-to-order", label: "Cara memesan" },
  { href: "/help", label: "Bantuan" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <BrandLogo />
        <nav className="site-nav" aria-label="Primary navigation">
          <Show when="signed-out">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </Show>
          <Show when="signed-in">
            <AdminShellLink />
            {customerLinks.map((link) => (
              <Link key={link.href} href={link.href}>
                {link.label}
              </Link>
            ))}
          </Show>
        </nav>
        <div className="site-auth" aria-label="Account access">
          <Show when="signed-out">
            <SignInButton mode="redirect">Masuk</SignInButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <span>Blessing For Goods</span>
          <span>Buku pilihan untuk Blessfriends</span>
        </div>
        <nav className="footer-nav" aria-label="Support navigation">
          {supportLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
      </footer>
    </div>
  );
}
