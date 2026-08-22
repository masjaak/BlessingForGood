"use client";

import { useContext } from "react";
import { LinkButton } from "@/components/ui";
import { ProductContext } from "@/domain/prototype/context";
import { roleCanAccess } from "@/domain/prototype/session";

export function AdminShellLink() {
  const role = useContext(ProductContext)?.sessionRole;
  if (!roleCanAccess(role || null, "admin")) return null;
  return (
    <LinkButton href="/admin" variant="secondary">
      Buka ruang kerja Admin
    </LinkButton>
  );
}
