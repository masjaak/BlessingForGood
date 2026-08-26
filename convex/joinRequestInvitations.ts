"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { internalAction } from "./_generated/server";

function clerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not configured");
  return createClerkClient({ secretKey });
}

function hasExactEmail(user: { emailAddresses: Array<{ emailAddress: string }> }, email: string) {
  return user.emailAddresses.some((address) => address.emailAddress.trim().toLowerCase() === email);
}

async function findExistingUser(
  client: ReturnType<typeof clerkClient>,
  email: string,
  applicantClerkUserId: string | null,
) {
  if (applicantClerkUserId) {
    try {
      const user = await client.users.getUser(applicantClerkUserId);
      if (hasExactEmail(user, email)) return user;
    } catch {
      // The stored subject can be stale; resolve the trusted email below.
    }
  }
  const users = await client.users.getUserList({ emailAddress: [email], limit: 100 });
  return users.data.find((user) => hasExactEmail(user, email)) ?? null;
}

async function findPendingInvitation(client: ReturnType<typeof clerkClient>, email: string) {
  const invitations = await client.invitations.getInvitationList({ query: email, status: "pending", limit: 100 });
  return invitations.data.find((invitation) => invitation.emailAddress.trim().toLowerCase() === email) ?? null;
}

export const deliver = internalAction({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(internal.joinRequestInvitationState.target, {
      joinRequestId: args.joinRequestId,
    });
    if (!target) return { status: "complete" as const };

    try {
      const client = clerkClient();
      const existingUser = await findExistingUser(client, target.email, target.applicantClerkUserId);
      if (existingUser) {
        await ctx.runMutation(internal.joinRequestInvitationState.reconcileIdentity, {
          joinRequestId: target.joinRequestId,
          actorUserId: args.actorUserId,
          clerkUserId: existingUser.id,
          email: target.email,
        });
        return { status: "active" as const };
      }

      const existingInvitation = await findPendingInvitation(client, target.email);
      if (existingInvitation) {
        await ctx.runMutation(internal.joinRequestInvitationState.markSent, {
          joinRequestId: target.joinRequestId,
          actorUserId: args.actorUserId,
          invitationId: existingInvitation.id,
          reused: true,
        });
        return { status: "sent" as const };
      }

      const invitation = await client.invitations.createInvitation({
        emailAddress: target.email,
        notify: true,
        ignoreExisting: false,
      });
      await ctx.runMutation(internal.joinRequestInvitationState.markSent, {
        joinRequestId: target.joinRequestId,
        actorUserId: args.actorUserId,
        invitationId: invitation.id,
        reused: false,
      });
      return { status: "sent" as const };
    } catch {
      try {
        const existingInvitation = await findPendingInvitation(clerkClient(), target.email);
        if (existingInvitation) {
          await ctx.runMutation(internal.joinRequestInvitationState.markSent, {
            joinRequestId: target.joinRequestId,
            actorUserId: args.actorUserId,
            invitationId: existingInvitation.id,
            reused: true,
          });
          return { status: "sent" as const };
        }
      } catch {
        // Keep the persisted failure product-safe; the Admin can retry in BFG.
      }
      await ctx.runMutation(internal.joinRequestInvitationState.markFailed, {
        joinRequestId: target.joinRequestId,
        actorUserId: args.actorUserId,
      });
      return { status: "failed" as const };
    }
  },
});
