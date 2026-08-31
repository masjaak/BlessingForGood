"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { useContext, useEffect } from "react";
import { api } from "../../convex/_generated/api";
import { AdminShellContext } from "@/components/site-shell";
import { ProductContext } from "@/domain/prototype/context";
import { roleCanAccess, type ProductRole } from "@/domain/prototype/session";

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
  | "users"
  | "reports"
  | "audit"
  | "content"
  | "settings";

type AdminNavLink = { href: string; label: string; icon: AdminIconName; requiredRole?: ProductRole };
type AdminNavGroup = { label: string; links: AdminNavLink[] };

const groups: AdminNavGroup[] = [
  {
    label: "Ikhtisar",
    links: [
      { href: "/admin", label: "Dasbor", icon: "dashboard" },
      { href: "/admin/content", label: "Konten", icon: "content" },
    ],
  },
  {
    label: "Pelanggan",
    links: [
      { href: "/admin/join-requests", label: "Permintaan bergabung", icon: "join" },
      { href: "/admin/customers", label: "Pelanggan", icon: "customers" },
    ],
  },
  {
    label: "Katalog",
    links: [
      { href: "/admin/books", label: "Buku", icon: "books" },
      { href: "/admin/catalogs", label: "Katalog", icon: "catalog" },
      { href: "/admin/ready-stock", label: "Ready Stock", icon: "stock" },
    ],
  },
  {
    label: "Operasional",
    links: [
      { href: "/admin/orders", label: "Pesanan", icon: "orders" },
      { href: "/admin/batches", label: "Batch PO", icon: "batch" },
      { href: "/admin/exceptions", label: "Masalah pesanan", icon: "exception" },
    ],
  },
  {
    label: "Keuangan",
    links: [
      { href: "/admin/invoices", label: "Tagihan & Deposit", icon: "invoice" },
      { href: "/admin/deposits", label: "Deposit & Top-up", icon: "payment" },
      { href: "/admin/payments", label: "Pembayaran", icon: "payment" },
      { href: "/admin/refunds", label: "Pengembalian", icon: "refund" },
      { href: "/admin/reports", label: "Laporan & analitik", icon: "reports" },
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
    reports: (
      <>
        <path {...common} d="M5 20V10h4v10M10 20V4h4v16M15 20v-7h4v7M3 20h18" />
      </>
    ),
    audit: (
      <>
        <path {...common} d="M6 3h12v18H6zM9 8h6M9 12h6M9 16h4" />
        <path {...common} d="m15.5 16 1.5 1.5 3-3" />
      </>
    ),
    content: (
      <>
        <path {...common} d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5" />
      </>
    ),
    settings: (
      <>
        <circle {...common} cx="12" cy="12" r="3" />
        <path
          {...common}
          d="M12 3v3M12 18v3M3 12h3M18 12h3M5.6 5.6l2.1 2.1M16.3 16.3l2.1 2.1M18.4 5.6l-2.1 2.1M7.7 16.3l-2.1 2.1"
        />
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

export function AdminNav({ preview = false, persistent = false }: { preview?: boolean; persistent?: boolean }) {
  const pathname = usePathname() || "/admin";
  const inPersistentAdminShell = useContext(AdminShellContext);
  const product = useContext(ProductContext);
  const sessionRole = product?.sessionRole;
  const canReadAdminNav = product?.dataSource === "convex" && roleCanAccess(sessionRole || null, "admin");
  const pendingJoinRequests = useQuery(api.joinRequests.pendingCount, canReadAdminNav ? {} : "skip");
  const markReadByContext = useMutation(api.notifications.markReadByContext);
  useEffect(() => {
    if (!canReadAdminNav || product?.authState !== "authenticated") return;
    void markReadByContext({ destination: pathname }).catch(() => undefined);
  }, [canReadAdminNav, markReadByContext, pathname, product?.authState]);
  const systemLinks: AdminNavLink[] = [
    { href: "/admin/users", label: "Pengguna", icon: "users", requiredRole: "admin" },
    { href: "/admin/audit", label: "Log aktivitas", icon: "audit", requiredRole: "admin" },
    { href: "/admin/settings", label: "Pengaturan", icon: "settings", requiredRole: "admin" },
  ];
  const visibleSystemLinks = systemLinks.filter(
    (link) => preview || roleCanAccess(sessionRole || null, link.requiredRole || "admin"),
  );
  const visibleGroups: AdminNavGroup[] = visibleSystemLinks.length
    ? [...groups, { label: "System", links: visibleSystemLinks }]
    : groups;

  if (persistent && product?.authState === "authenticated" && !canReadAdminNav) return null;
  if (inPersistentAdminShell && !persistent) return null;

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
                <span className="admin-nav-icon-wrap">
                  <AdminNavIcon name={link.icon} />
                </span>
                <span className="admin-nav-label">{link.label}</span>
                {link.href === "/admin/join-requests" && pendingJoinRequests ? (
                  <span className="admin-nav-badge" aria-label={`${pendingJoinRequests} permintaan bergabung menunggu`}>
                    {pendingJoinRequests}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
      <Link className="admin-nav-external" href="/catalog">
        Lihat sisi pelanggan →
      </Link>
    </nav>
  );
}
