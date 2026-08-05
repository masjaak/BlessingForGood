import Link from "next/link";

const links = [
  ["/admin", "Overview"],
  ["/admin/catalogs", "Catalog"],
  [null, "Books"],
  ["/admin/orders", "Orders"],
  [null, "Customers"],
  ["/admin/invoices", "Invoices"],
  [null, "Tracking"],
  [null, "Content"],
  [null, "Settings"],
  ["/catalog", "Customer preview"],
] as const;

export function AdminNav() {
  return (
    <nav className="admin-nav" aria-label="Admin prototype navigation">
      {links.map(([href, label]) =>
        href ? (
          <Link key={label} href={href}>
            {label}
          </Link>
        ) : (
          <span className="admin-nav-unavailable" aria-disabled="true" key={label} title="Not implemented in prototype">
            {label}
            <small>Unavailable</small>
          </span>
        ),
      )}
    </nav>
  );
}
