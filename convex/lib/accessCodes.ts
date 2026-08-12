import { keyedDigest } from "./crypto";
import { requireConfiguredSecret } from "./previewCapability";
import { requiredText } from "./validation";

const codeAlphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export async function accessCodeDigests(catalogId: string, accessCode: string) {
  const code = requiredText(accessCode, "access code");
  const secret = requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER");
  return {
    codeDigest: await keyedDigest(secret, "catalog-access", `${catalogId}:${code}`),
    lookupDigest: await keyedDigest(secret, "catalog-access-lookup", code),
  };
}

export function randomAccessCode(): string {
  const bytes = new Uint8Array(12);
  globalThis.crypto.getRandomValues(bytes);
  const parts = [0, 1, 2].map((part) =>
    Array.from(bytes.slice(part * 4, part * 4 + 4), (byte) => codeAlphabet[byte % codeAlphabet.length]).join(""),
  );
  return `BFG-${parts.join("-")}`;
}

export function randomCatalogSessionToken(): string {
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function catalogSessionDigest(sessionToken: string): Promise<string> {
  return keyedDigest(requireConfiguredSecret("BFG_CATALOG_CODE_PEPPER"), "catalog-session", sessionToken);
}
