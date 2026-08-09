"use client";

import Link from "next/link";
import { useContext } from "react";
import { PrototypeContext } from "@/domain/prototype/context";

const links = [
  ["/admin", "Overview"],
  ["/admin/catalogs", "Catalog"],
  [null, "Books"],
  ["/admin/orders", "Orders"],
  ["/admin/batches", "Batches"],
  [null, "Customers"],
  ["/admin/invoices", "Invoices"],
  [null, "Content"],
  [null, "Settings"],
  ["/catalog", "Customer preview"],
] as const;

export function AdminNav() {
  const sessionRole = useContext(PrototypeContext)?.sessionRole;
  const visibleLinks = sessionRole === "owner" ? [...links, ["/admin/users", "Users"] as const] : links;
  return (
    <nav className="admin-nav" aria-label="Admin prototype navigation">
      {visibleLinks.map(([href, label]) =>
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
