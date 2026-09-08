export type SiteNavigationContext =
  "home" | "ready-stock" | "community" | "how-to-order" | "catalog" | "join" | "orders" | "invoices" | "account";

type NavigationEntry = { href: string; label: string; context: SiteNavigationContext };

export const publicLinks = [
  { href: "/", label: "Beranda", context: "home" },
  { href: "/ready-stock", label: "Ready Stock", context: "ready-stock" },
  { href: "/community", label: "Komunitas", context: "community" },
  { href: "/how-to-order", label: "Cara memesan", context: "how-to-order" },
  { href: "/catalog", label: "Secret Catalog", context: "catalog" },
  { href: "/join", label: "Gabung", context: "join" },
] as const satisfies readonly NavigationEntry[];

const customerNavigationEntries = [
  { href: "/", label: "Beranda", icon: "home", context: "home" },
  { href: "/catalog", label: "Katalog", icon: "catalog", context: "catalog" },
  { href: "/account/orders", label: "Buku Saya", icon: "books", context: "orders" },
  { href: "/account/invoices", label: "Tagihan", icon: "invoice", context: "invoices" },
  { href: "/account", label: "Akun", icon: "account", context: "account" },
] as const satisfies readonly (NavigationEntry & { icon: string })[];

export const customerLinks = customerNavigationEntries.map(({ href, label }) => ({ href, label }));
export const customerBottomLinks = customerNavigationEntries;

const secondaryNavigationLinks = [{ href: "/help", label: "Bantuan", context: "how-to-order" }] as const;

export const primaryNavigationLinks = [...publicLinks, ...customerBottomLinks];

export function resolveSiteNavigationContext(pathname: string): SiteNavigationContext | null {
  const match = [...primaryNavigationLinks, ...secondaryNavigationLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find(({ href }) => (href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)));

  return match?.context || null;
}
