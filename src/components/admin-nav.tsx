import Link from "next/link";

const links = [
  ["/admin", "Overview"],
  ["/admin/catalogs", "Catalogs"],
  ["/admin/orders", "Orders"],
  ["/admin/invoices", "Invoices"],
  ["/catalog", "Customer preview"],
] as const;

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin prototype navigation">
      {links.map(([href, label]) => (
        <Link key={href} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
