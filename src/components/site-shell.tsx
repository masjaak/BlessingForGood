import Link from "next/link";
import type { ReactNode } from "react";

const publicLinks = [
  { href: "/community", label: "Community" },
  { href: "/how-to-order", label: "How to order" },
  { href: "/catalog", label: "Secret catalog" },
  { href: "/account/orders", label: "Orders" },
];

export function SiteShell({ children }: { children: ReactNode }) {
  return (
    <div className="site-shell">
      <header className="site-header">
        <Link className="wordmark" href="/" aria-label="Blessing For Goods home">
          <span>Blessing For Goods</span>
        </Link>
        <nav className="site-nav" aria-label="Primary navigation">
          {publicLinks.map((link) => (
            <Link key={link.href} href={link.href}>
              {link.label}
            </Link>
          ))}
          <Link className="nav-admin" href="/admin">
            Admin prototype
          </Link>
        </nav>
      </header>
      <main>{children}</main>
      <footer className="site-footer">
        <span>Prototype v0.1 · zero business data</span>
        <span>Built for Blessfriends</span>
      </footer>
    </div>
  );
}
