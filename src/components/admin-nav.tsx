"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useContext } from "react";
import { ProductContext } from "@/domain/prototype/context";

const links = [
  ["/admin", "Ringkasan"],
  ["/admin/catalogs", "Katalog"],
  ["/admin/books", "Buku"],
  ["/admin/orders", "Pesanan"],
  ["/admin/exceptions", "Masalah"],
  ["/admin/batches", "Batch PO"],
  ["/admin/customers", "Customer"],
  ["/admin/join-requests", "Penerimaan"],
  ["/admin/invoices", "Invoice & Deposit"],
  ["/admin/payments", "Pembayaran"],
  ["/catalog", "Lihat sisi customer"],
] as const;

export function AdminNav() {
  const pathname = usePathname() || "/admin";
  const sessionRole = useContext(ProductContext)?.sessionRole;
  const visibleLinks = sessionRole === "owner" ? [...links, ["/admin/users", "Pengguna"] as const] : links;
  return (
    <nav className="admin-nav" aria-label="Navigasi admin">
      {visibleLinks.map(([href, label]) => (
        <Link
          className={pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "is-current" : ""}
          aria-current={
            pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`)) ? "page" : undefined
          }
          key={label}
          href={href}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
