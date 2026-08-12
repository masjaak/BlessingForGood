"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { UserButton, useAuth } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand";
import { AdminShellLink } from "@/components/admin-shell-link";
import { bfgClerkAppearance } from "@/config/clerk";

const customerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/catalog", label: "Katalog" },
  { href: "/account/orders", label: "Buku Saya" },
  { href: "/account/invoices", label: "Tagihan" },
  { href: "/account", label: "Akun" },
];

const customerBottomLinks = [
  { href: "/", label: "Beranda", icon: "home" },
  { href: "/catalog", label: "Katalog", icon: "catalog" },
  { href: "/account/orders", label: "Buku Saya", icon: "books" },
  { href: "/account/invoices", label: "Tagihan", icon: "invoice" },
  { href: "/account", label: "Akun", icon: "account" },
] as const;

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

function CustomerNavIcon({ name }: { name: (typeof customerBottomLinks)[number]["icon"] }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const };
  if (name === "home") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="m3.5 10.5 8.5-7 8.5 7" />
        <path {...common} d="M5.5 9.5v10h13v-10M9.5 19.5v-6h5v6" />
      </svg>
    );
  }
  if (name === "catalog") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          {...common}
          d="M4 5.5a2 2 0 0 1 2-2h4.5v16H6a2 2 0 0 0-2 2zM20 5.5a2 2 0 0 0-2-2h-4.5v16H18a2 2 0 0 1 2 2z"
        />
        <path {...common} d="M10.5 5.5h3" />
      </svg>
    );
  }
  if (name === "books") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M5 4.5h3v15H5zM10.5 3.5h3v16h-3zM16 5h3v14h-3z" />
        <path {...common} d="M4 19.5h16" />
      </svg>
    );
  }
  if (name === "invoice") {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path {...common} d="M6 3.5h12v17l-2-1.5-2 1.5-2-1.5-2 1.5-2-1.5-2 1.5z" />
        <path {...common} d="M9 8h6M9 12h6M9 16h3" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle {...common} cx="12" cy="8" r="3.5" />
      <path {...common} d="M5 20a7 7 0 0 1 14 0" />
    </svg>
  );
}

function CustomerBottomNav({ pathname }: { pathname: string }) {
  const current = (href: string) => (href === "/" ? pathname === href : pathname.startsWith(href));
  return (
    <nav className="customer-bottom-nav" aria-label="Navigasi customer">
      {customerBottomLinks.map((link) => (
        <Link key={link.href} href={link.href} aria-current={current(link.href) ? "page" : undefined}>
          <CustomerNavIcon name={link.icon} />
          <span>{link.label}</span>
        </Link>
      ))}
    </nav>
  );
}

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
          <BrandLogo variant="admin" />
          <div className="admin-brand-copy">
            <strong>Operasional BFG</strong>
            <span>Kelola toko buku dan komunitas</span>
          </div>
          <div className="admin-account">
            <span className="admin-topbar-status">Workspace operasional</span>
            <Link href="/">Lihat sisi customer</Link>
            <UserButton appearance={bfgClerkAppearance} />
          </div>
        </header>
        <main>{children}</main>
      </div>
    );
  }

  return (
    <div className={`site-shell customer-shell${signedIn ? " customer-shell-signed-in" : ""}`}>
      <header className="site-header">
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
          {!signedIn ? (
            <Link className="site-auth-link" href="/sign-in">
              Masuk
            </Link>
          ) : (
            <UserButton appearance={bfgClerkAppearance} />
          )}
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
      <CustomerBottomNav pathname={pathname} />
    </div>
  );
}
