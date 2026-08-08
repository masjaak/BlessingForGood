import Link from "next/link";
import type { ReactNode } from "react";
import { Show, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { BrandLogo } from "@/components/brand";

const customerLinks = [
  { href: "/", label: "Home" },
  { href: "/catalog", label: "Catalog" },
  { href: "/ready-stock", label: "Ready Stock" },
  { href: "/account/orders", label: "Orders" },
  { href: "/account/invoices", label: "Account" },
];

const supportLinks = [
  { href: "/community", label: "Community" },
  { href: "/how-to-order", label: "How to order" },
  { href: "/help", label: "Help" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <BrandLogo />
        <nav className="site-nav" aria-label="Primary navigation">
          {customerLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
        </nav>
        <div className="site-auth" aria-label="Account access">
          <Show when="signed-out">
            <SignInButton mode="modal">Sign in</SignInButton>
            <SignUpButton mode="modal">Accept invitation</SignUpButton>
          </Show>
          <Show when="signed-in">
            <UserButton />
          </Show>
        </div>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <div>
          <span>Prototype v0.1 · zero business data</span>
          <span>Built for Blessfriends</span>
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
