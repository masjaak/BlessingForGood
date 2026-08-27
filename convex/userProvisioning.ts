"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { action } from "./_generated/server";

function clerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not configured");
  return createClerkClient({ secretKey });
}

export const ensureCurrentUser = action({
  args: { correlationId: v.optional(v.string()) },
  handler: async (ctx, args): Promise<unknown> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("IDENTITY_REQUIRED");
    const client = clerkClient();
    let clerkVerifiedEmail: string | null = null;
    let clerkLookupSucceeded = false;
    try {
      const user = await client.users.getUser(identity.subject);
      clerkLookupSucceeded = true;
      const primaryEmail = user.emailAddresses.find((address) => address.id === user.primaryEmailAddressId);
      const normalizedEmail = primaryEmail?.emailAddress.trim().toLowerCase();
      if (
        primaryEmail?.verification?.status === "verified" &&
        normalizedEmail &&
        normalizedEmail.length <= 254 &&
        /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)
      ) {
        clerkVerifiedEmail = normalizedEmail;
      }
    } catch {
      // Existing appUsers remain available; new admissions still fail closed without a verified email.
    }
    console.log("bfg_invitation_stage", {
      correlationId: args.correlationId || "unspecified",
      subjectSuffix: identity.subject.slice(-8),
      stage: "CONVEX_AUTH_READY",
      clerkLookupSucceeded,
      verifiedEmailResolved: Boolean(clerkVerifiedEmail),
    });
    return ctx.runMutation(internal.users.ensureCurrentUserFromClerk, {
      clerkSubject: identity.subject,
      clerkVerifiedEmail,
      clerkLookupFailed: !clerkLookupSucceeded,
      correlationId: args.correlationId,
    });
  },
});
