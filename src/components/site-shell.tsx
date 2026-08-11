"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { SignInButton, UserButton, useAuth } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand";
import { AdminShellLink } from "@/components/admin-shell-link";

const customerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/catalog", label: "Secret Catalog" },
  { href: "/account/orders", label: "Pesanan" },
  { href: "/account/invoices", label: "Tagihan" },
  { href: "/account", label: "Akun" },
];

const publicLinks = [
  { href: "/", label: "Beranda" },
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/community", label: "Komunitas" },
  { href: "/how-to-order", label: "Cara memesan" },
  { href: "/catalog", label: "Secret Catalog" },
  { href: "/join", label: "Gabung" },
];

const supportLinks = [
  { href: "/community", label: "Komunitas" },
  { href: "/join", label: "Gabung Blessfriends" },
  { href: "/how-to-order", label: "Cara memesan" },
  { href: "/help", label: "Bantuan" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  const pathname = usePathname() || "/";
  const { isLoaded, isSignedIn } = useAuth();
  const signedIn = Boolean(isLoaded && isSignedIn);
  const isAdmin = pathname.startsWith("/admin");
  const current = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));

  if (isAdmin) {
    return (
      <div className="site-shell admin-shell">
        <header className="admin-topbar">
          <BrandLogo />
          <div className="admin-brand-copy">
            <strong>Operasional BFG</strong>
            <span>Kelola toko buku dan komunitas</span>
          </div>
          <div className="admin-account">
            <Link href="/">Lihat sisi customer</Link>
            <UserButton />
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className="site-shell">
      <header className="site-header">
        <details className="mobile-menu">
          <summary aria-label="Buka menu">
            <span aria-hidden="true" />
          </summary>
          <nav aria-label="Navigasi mobile">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
        </details>
        <BrandLogo />
        {!signedIn ? (
          <nav className="site-nav public-nav" aria-label="Primary navigation">
            {publicLinks.map((link) => (
              <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}>
                {link.label}
              </Link>
            ))}
          </nav>
        ) : (
          <nav className="site-nav customer-nav" aria-label="Primary navigation">
            <AdminShellLink />
            {customerLinks.map((link) => (
              <Link
                className={link.href === "/ready-stock" ? "customer-nav-extra" : undefined}
                key={link.href}
                href={link.href}
                aria-current={current(link.href) ? "page" : undefined}
              >
                {link.label}
              </Link>
            ))}
          </nav>
        )}
        <div className="site-auth" aria-label="Account access">
          {!signedIn ? <SignInButton mode="redirect">Masuk</SignInButton> : <UserButton />}
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
