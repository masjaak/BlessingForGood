import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

function memberSlug(value: string | undefined): string {
  const slug = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return slug || "blessfriend";
}

export async function nextMemberCode(ctx: MutationCtx, displayName: string | undefined): Promise<string> {
  const slug = memberSlug(displayName);
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const bytes = new Uint8Array(2);
    globalThis.crypto.getRandomValues(bytes);
    const suffix = ((bytes[0] << 8) | bytes[1]) % 10_000;
    const memberCode = slug + "-" + suffix.toString().padStart(4, "0");
    const existing = await ctx.db
      .query("appUsers")
      .withIndex("by_member_code", (index) => index.eq("memberCode", memberCode))
      .unique();
    if (!existing) return memberCode;
  }
  fail("VALIDATION_FAILED", "member code could not be allocated");
}
