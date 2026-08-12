export function requireClerkIssuer(value: string | undefined): string {
  const issuer = value?.trim();
  if (!issuer) throw new Error("CLERK_JWT_ISSUER_DOMAIN is required for Convex authentication.");

  let parsed: URL;
  try {
    parsed = new URL(issuer);
  } catch {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN must be a valid HTTPS issuer URL.");
  }
  if (parsed.protocol !== "https:") {
    throw new Error("CLERK_JWT_ISSUER_DOMAIN must use HTTPS.");
  }
  return parsed.origin;
}
