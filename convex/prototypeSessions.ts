import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { fail } from "./lib/errors";

const legacyRole = v.union(v.literal("customer"), v.literal("admin"));

function disabled(): never {
  return fail("LEGACY_IDENTITY_DISABLED");
}

export const createCustomer = mutation({
  args: { token: v.string() },
  returns: v.object({ role: legacyRole, expiresAt: v.number() }),
  handler: async () => disabled(),
});

export const claimAdmin = mutation({
  args: { token: v.string(), accessCode: v.string() },
  returns: v.object({
    ok: v.boolean(),
    role: v.optional(legacyRole),
    expiresAt: v.optional(v.number()),
    code: v.optional(v.string()),
  }),
  handler: async () => disabled(),
});

export const me = query({
  args: { token: v.string() },
  returns: v.union(v.object({ role: legacyRole, expiresAt: v.number() }), v.null()),
  handler: async () => disabled(),
});

export const cleanupTest = mutation({
  args: {
    sessionToken: v.string(),
    customerSessionToken: v.optional(v.string()),
    testId: v.string(),
    catalogId: v.optional(v.id("secretCatalogs")),
    orphanBookIds: v.optional(v.array(v.id("books"))),
  },
  returns: v.object({ ok: v.literal(true) }),
  handler: async () => disabled(),
});
