"use client";

export type PrototypeRole = "customer" | "admin" | "owner";

const SESSION_TOKEN_KEY = "bfg-prototype-session-v0.1";
const UNLOCKED_CATALOG_KEY = "bfg-prototype-unlocked-catalog-v0.1";
const ROLE_KEY = "bfg-prototype-role-v0.1";

function sessionStorageOrNull(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

function createToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

export function getOrCreatePrototypeSessionToken(): string | null {
  const storage = sessionStorageOrNull();
  if (!storage) return null;
  const existing = storage.getItem(SESSION_TOKEN_KEY);
  if (existing) return existing;
  const token = createToken();
  storage.setItem(SESSION_TOKEN_KEY, token);
  return token;
}

export function getStoredUnlockedCatalogId(): string | null {
  return sessionStorageOrNull()?.getItem(UNLOCKED_CATALOG_KEY) || null;
}

export function setStoredUnlockedCatalogId(catalogId: string): void {
  sessionStorageOrNull()?.setItem(UNLOCKED_CATALOG_KEY, catalogId);
}

export function getStoredPrototypeRole(): PrototypeRole | null {
  const role = sessionStorageOrNull()?.getItem(ROLE_KEY);
  return role === "customer" || role === "admin" || role === "owner" ? role : null;
}

export function setStoredPrototypeRole(role: PrototypeRole): void {
  sessionStorageOrNull()?.setItem(ROLE_KEY, role);
}
