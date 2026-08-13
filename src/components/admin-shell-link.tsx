"use client";

import Link from "next/link";
import { useContext } from "react";
import { ProductContext } from "@/domain/prototype/context";

export function AdminShellLink() {
  const role = useContext(ProductContext)?.sessionRole;
  if (role !== "admin" && role !== "owner") return null;
  return (
    <Link className="workspace-switch-link" href="/admin">
      Buka Workspace Admin
    </Link>
  );
}
