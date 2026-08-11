"use client";

export type ProductRole = "customer" | "admin" | "owner";

const UNLOCKED_CATALOG_KEY = "bfg-unlocked-catalog";

function sessionStorageOrNull(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getStoredUnlockedCatalogId(): string | null {
  return sessionStorageOrNull()?.getItem(UNLOCKED_CATALOG_KEY) || null;
}

export function setStoredUnlockedCatalogId(catalogId: string): void {
  sessionStorageOrNull()?.setItem(UNLOCKED_CATALOG_KEY, catalogId);
}
