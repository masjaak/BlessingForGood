import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { Doc } from "../_generated/dataModel";
import { keyedDigest } from "./crypto";
import { fail } from "./errors";
import { requirePreviewCapability, requirePreviewSecret } from "./previewCapability";

export const SESSION_TTL_MS = 24 * 60 * 60 * 1000;
export const OPEN_ENDED_TIMESTAMP_MS = 8_640_000_000_000_000;

type SessionCtx = QueryCtx | MutationCtx;

function validateToken(token: string): string {
  const normalized = token.trim();
  if (normalized.length < 32 || normalized.length > 256) fail("VALIDATION_FAILED", "session token is invalid");
  return normalized;
}

export async function sessionDigest(token: string): Promise<string> {
  const normalized = validateToken(token);
  return keyedDigest(requirePreviewSecret("BFG_SESSION_TOKEN_PEPPER"), "session", normalized);
}

export async function findSession(ctx: SessionCtx, token: string): Promise<Doc<"prototypeSessions"> | null> {
  const digest = await sessionDigest(token);
  return ctx.db
    .query("prototypeSessions")
    .withIndex("by_token_digest", (query) => query.eq("tokenDigest", digest))
    .unique();
}

export async function requireSession(
  ctx: SessionCtx,
  token: string,
  role?: "customer" | "admin",
): Promise<Doc<"prototypeSessions">> {
  requirePreviewCapability();
  const session = await findSession(ctx, token);
  const now = Date.now();
  if (!session) fail("SESSION_REQUIRED");
  if (session.revokedAt || session.expiresAt <= now) fail("SESSION_EXPIRED");
  if (role && session.role !== role) fail(role === "admin" ? "ADMIN_REQUIRED" : "CUSTOMER_REQUIRED");
  return session;
}
