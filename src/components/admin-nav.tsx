"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { ProductContext } from "@/domain/prototype/context";

type AdminIconName =
  | "dashboard"
  | "join"
  | "customers"
  | "books"
  | "catalog"
  | "stock"
  | "orders"
  | "batch"
  | "exception"
  | "invoice"
  | "payment"
  | "refund"
  | "users";

type AdminNavLink = { href: string; label: string; icon: AdminIconName };
type AdminNavGroup = { label: string; links: AdminNavLink[] };

const groups: AdminNavGroup[] = [
  { label: "Overview", links: [{ href: "/admin", label: "Dashboard", icon: "dashboard" }] },
  {
    label: "Customers",
    links: [
      { href: "/admin/join-requests", label: "Join Requests", icon: "join" },
      { href: "/admin/customers", label: "Customers", icon: "customers" },
    ],
  },
  {
    label: "Catalog",
    links: [
      { href: "/admin/books", label: "Books", icon: "books" },
      { href: "/admin/catalogs", label: "Catalogs", icon: "catalog" },
      { href: "/admin/ready-stock", label: "Ready Stock", icon: "stock" },
    ],
  },
  {
    label: "Operations",
    links: [
      { href: "/admin/orders", label: "Orders", icon: "orders" },
      { href: "/admin/batches", label: "Batch PO", icon: "batch" },
      { href: "/admin/exceptions", label: "Exceptions", icon: "exception" },
    ],
  },
  {
    label: "Finance",
    links: [
      { href: "/admin/invoices", label: "Invoices & Deposit", icon: "invoice" },
      { href: "/admin/payments", label: "Payments", icon: "payment" },
      { href: "/admin/refunds", label: "Refunds", icon: "refund" },
    ],
  },
];

function AdminNavIcon({ name }: { name: AdminIconName }) {
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  const paths: Record<AdminIconName, React.ReactNode> = {
    dashboard: (
      <>
        <rect {...common} x="4" y="4" width="6" height="6" rx="1" />
        <rect {...common} x="14" y="4" width="6" height="6" rx="1" />
        <rect {...common} x="4" y="14" width="6" height="6" rx="1" />
        <rect {...common} x="14" y="14" width="6" height="6" rx="1" />
      </>
    ),
    join: (
      <>
        <path {...common} d="M5 6.5h14v11H5z" />
        <path {...common} d="M8 4.5v4M16 4.5v4M8 12h8M8 15h5" />
      </>
    ),
    customers: (
      <>
        <circle {...common} cx="9" cy="8" r="3" />
        <path {...common} d="M3.5 19a5.5 5.5 0 0 1 11 0M16 5.5a3 3 0 0 1 0 5.8M16 14a5 5 0 0 1 4.5 5" />
      </>
    ),
    books: (
      <>
        <path {...common} d="M5 4h4v16H5zM10 3h4v17h-4zM15 5h4v15h-4z" />
        <path {...common} d="M4 20h16" />
      </>
    ),
    catalog: (
      <>
        <path {...common} d="M4 5a2 2 0 0 1 2-2h5v17H6a2 2 0 0 0-2 2zM20 5a2 2 0 0 0-2-2h-5v17h5a2 2 0 0 1 2 2z" />
        <path {...common} d="M8 7h1M15 7h1" />
      </>
    ),
    stock: (
      <>
        <path {...common} d="m4 8 8-4 8 4-8 4zM4 8v8l8 4 8-4V8M8 10v7M16 10v7" />
      </>
    ),
    orders: (
      <>
        <path {...common} d="M5 4h14v16H5z" />
        <path {...common} d="M8 8h8M8 12h8M8 16h5" />
      </>
    ),
    batch: (
      <>
        <path {...common} d="M4 7h16v13H4zM7 4h10v3H7z" />
        <path {...common} d="M8 11h8M8 15h5" />
      </>
    ),
    exception: (
      <>
        <path {...common} d="m12 4 8 15H4z" />
        <path {...common} d="M12 9v5M12 17h.01" />
      </>
    ),
    invoice: (
      <>
        <path {...common} d="M6 3h12v18l-2-1.5L14 21l-2-1.5L10 21l-2-1.5L6 21z" />
        <path {...common} d="M9 8h6M9 12h6M9 16h3" />
      </>
    ),
    payment: (
      <>
        <rect {...common} x="3" y="5" width="18" height="14" rx="2" />
        <path {...common} d="M3 10h18M7 15h3" />
      </>
    ),
    refund: (
      <>
        <path {...common} d="M7 8H4l4-4M4 8a8 8 0 1 1 1 8" />
        <path {...common} d="M12 9v6M9.5 12h5" />
      </>
    ),
    users: (
      <>
        <circle {...common} cx="9" cy="8" r="3" />
        <path {...common} d="M3.5 20a5.5 5.5 0 0 1 11 0M16 11a3 3 0 1 0 0-6M16 14a5 5 0 0 1 4.5 6" />
      </>
    ),
  };
  return (
    <svg className="admin-nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {paths[name]}
    </svg>
  );
}

function isCurrent(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export function AdminNav() {
  const pathname = usePathname() || "/admin";
  const sessionRole = useContext(ProductContext)?.sessionRole;
  const visibleGroups: AdminNavGroup[] =
    sessionRole === "owner"
      ? [...groups, { label: "System", links: [{ href: "/admin/users", label: "Users", icon: "users" }] }]
      : groups;

  return (
    <nav className="admin-nav" aria-label="Navigasi admin">
      {visibleGroups.map((group) => (
        <div className="admin-nav-group" key={group.label}>
          <span className="admin-nav-group-label">{group.label}</span>
          {group.links.map((link) => {
            const current = isCurrent(pathname, link.href);
            return (
              <Link
                className={`admin-nav-link${current ? " is-current" : ""}`}
                aria-current={current ? "page" : undefined}
                key={link.href}
                href={link.href}
              >
                <AdminNavIcon name={link.icon} />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
      <Link className="admin-nav-external" href="/catalog">
        Lihat sisi customer →
      </Link>
    </nav>
  );
}
