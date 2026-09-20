"use client";

import { useQuery_experimental } from "convex/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { useProduct } from "@/domain/prototype/store";
import styles from "./cart.module.css";

function CartIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M4 5h2l1.5 10.5h9.75L19 8H7"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
      />
      <circle cx="9" cy="19" r="1" fill="currentColor" />
      <circle cx="17" cy="19" r="1" fill="currentColor" />
    </svg>
  );
}

export function CustomerMiniCart() {
  const pathname = usePathname() || "/";
  const { authState, dataSource, sessionRole } = useProduct();
  const onCartPage = pathname === "/account/cart" || pathname.startsWith("/account/cart/");
  const enabled = dataSource === "convex" && authState === "authenticated" && sessionRole === "customer" && !onCartPage;
  if (!enabled) return null;
  return <CustomerMiniCartQuery />;
}

function CustomerMiniCartQuery() {
  const result = useQuery_experimental({ query: api.carts.getMineSummary, args: {} });

  if (result.status !== "success" || result.data.retainedQuantity === 0) return null;

  const quantity = result.data.retainedQuantity;
  return (
    <div className={styles.miniCartRegion} data-testid="customer-mini-cart">
      <Link className={styles.miniCart} href="/account/cart" aria-label={`Buka keranjang, ${quantity} buku tersimpan`}>
        <span className={styles.miniCartIcon}>
          <CartIcon />
        </span>
        <span className={styles.miniCartCopy}>
          <strong>Keranjang</strong>
          <span>{quantity} buku</span>
        </span>
        <span className={styles.miniCartArrow} aria-hidden="true">
          →
        </span>
      </Link>
    </div>
  );
}
