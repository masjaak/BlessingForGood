export const customerLinks = [
  { href: "/", label: "Beranda" },
  { href: "/catalog", label: "Katalog" },
  { href: "/account/orders", label: "Buku Saya" },
  { href: "/account/invoices", label: "Tagihan" },
  { href: "/account", label: "Akun" },
] as const;

export const customerBottomLinks = [
  { href: "/", label: "Beranda", icon: "home", context: "home" },
  { href: "/catalog", label: "Katalog", icon: "catalog", context: "catalog" },
  { href: "/account/orders", label: "Buku Saya", icon: "books", context: "orders" },
  { href: "/account/invoices", label: "Tagihan", icon: "invoice", context: "invoices" },
  { href: "/account", label: "Akun", icon: "account", context: "account" },
] as const;

export type CustomerNavContext = (typeof customerBottomLinks)[number]["context"];

export function resolveCustomerNavContext(pathname: string): CustomerNavContext {
  const match = [...customerBottomLinks]
    .sort((a, b) => b.href.length - a.href.length)
    .find(({ href }) => (href === "/" ? pathname === href : pathname === href || pathname.startsWith(`${href}/`)));

  return match?.context || "home";
}
