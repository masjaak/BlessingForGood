"use client";

import Link from "next/link";
import { useContext } from "react";
import { ProductContext } from "@/domain/prototype/context";
import { roleCanAccess } from "@/domain/prototype/session";

export function AdminShellLink() {
  const role = useContext(ProductContext)?.sessionRole;
  if (!roleCanAccess(role || null, "admin")) return null;
  return (
    <Link className="workspace-switch-link" href="/admin">
      Buka ruang kerja Admin
    </Link>
  );
}
