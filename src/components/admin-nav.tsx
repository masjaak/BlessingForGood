"use client";

import Link from "next/link";
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
  const sessionRole = useContext(ProductContext)?.sessionRole;
  const visibleLinks = sessionRole === "owner" ? [...links, ["/admin/users", "Pengguna"] as const] : links;
  return (
    <nav className="admin-nav" aria-label="Navigasi admin">
      {visibleLinks.map(([href, label]) => (
        <Link key={label} href={href}>
          {label}
        </Link>
      ))}
    </nav>
  );
}
