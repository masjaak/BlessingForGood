"use client";

export type ProductRole = "customer" | "admin" | "owner";

export function roleCanAccess(role: ProductRole | null, requiredRole: ProductRole): boolean {
  if (requiredRole === "customer") return role !== null;
  if (requiredRole === "admin") return role === "admin" || role === "owner";
  return role === "owner";
}

const UNLOCKED_CATALOG_KEY = "bfg-unlocked-catalog";
const CATALOG_SESSION_KEY = "bfg-catalog-session";
const CATALOG_ATTEMPT_KEY = "bfg-catalog-attempt-key";

export interface StoredCatalogSession {
  catalogId: string;
  sessionToken: string;
  expiresAt: number;
}

function sessionStorageOrNull(): Storage | null {
  return typeof window === "undefined" ? null : window.sessionStorage;
}

export function getStoredUnlockedCatalogId(): string | null {
  return sessionStorageOrNull()?.getItem(UNLOCKED_CATALOG_KEY) || null;
}

export function setStoredUnlockedCatalogId(catalogId: string): void {
  sessionStorageOrNull()?.setItem(UNLOCKED_CATALOG_KEY, catalogId);
}

export function getStoredCatalogSession(): StoredCatalogSession | null {
  const value = sessionStorageOrNull()?.getItem(CATALOG_SESSION_KEY);
  if (!value) return null;
  try {
    const session = JSON.parse(value) as Partial<StoredCatalogSession>;
    if (
      typeof session.catalogId !== "string" ||
      typeof session.sessionToken !== "string" ||
      typeof session.expiresAt !== "number" ||
      session.expiresAt <= Date.now()
    ) {
      sessionStorageOrNull()?.removeItem(CATALOG_SESSION_KEY);
      return null;
    }
    return session as StoredCatalogSession;
  } catch {
    sessionStorageOrNull()?.removeItem(CATALOG_SESSION_KEY);
    return null;
  }
}

export function setStoredCatalogSession(session: StoredCatalogSession): void {
  sessionStorageOrNull()?.setItem(CATALOG_SESSION_KEY, JSON.stringify(session));
  sessionStorageOrNull()?.setItem(UNLOCKED_CATALOG_KEY, session.catalogId);
}

export function getCatalogAttemptKey(): string {
  const storage = sessionStorageOrNull();
  const existing = storage?.getItem(CATALOG_ATTEMPT_KEY);
  if (existing) return existing;
  const bytes = new Uint8Array(16);
  if (typeof globalThis.crypto !== "undefined") globalThis.crypto.getRandomValues(bytes);
  const key = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("") || "anonymous";
  storage?.setItem(CATALOG_ATTEMPT_KEY, key);
  return key;
}
