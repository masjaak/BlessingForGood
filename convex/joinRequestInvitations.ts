"use node";

import { createClerkClient } from "@clerk/backend";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { type ActionCtx, internalAction } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

function clerkClient() {
  const secretKey = process.env.CLERK_SECRET_KEY;
  if (!secretKey) throw new Error("CLERK_SECRET_KEY is not configured");
  return createClerkClient({ secretKey });
}

const BFG_INVITATION_REDIRECT_URL = "https://www.blessingforgood.com/accept-invitation";

type InvitationTarget = {
  joinRequestId: Id<"joinRequests">;
  email: string;
  applicantClerkUserId: string | null;
  invitationId: string | null;
};
type DeliveryResult = { status: "complete" | "sent" | "sign_in_required" | "failed" };

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

async function findPendingInvitation(
  client: ReturnType<typeof clerkClient>,
  email: string,
  excludedInvitationId?: string,
) {
  const invitations = await client.invitations.getInvitationList({ query: email, status: "pending", limit: 100 });
  return (
    invitations.data.find(
      (invitation) => invitation.id !== excludedInvitationId && invitation.emailAddress.trim().toLowerCase() === email,
    ) ?? null
  );
}

async function retirePendingInvitation(
  client: ReturnType<typeof clerkClient>,
  email: string,
  invitationId: string | null,
) {
  try {
    const invitation = invitationId ? { id: invitationId } : await findPendingInvitation(client, email);
    if (!invitation) return false;
    await client.invitations.revokeInvitation(invitation.id);
    return true;
  } catch {
    return false;
  }
}

async function routeExistingIdentity(
  ctx: ActionCtx,
  target: InvitationTarget,
  actorUserId: Id<"appUsers">,
  client: ReturnType<typeof clerkClient>,
) {
  const replacedInvitation = await retirePendingInvitation(client, target.email, target.invitationId);
  await ctx.runMutation(internal.joinRequestInvitationState.markSignInRequired, {
    joinRequestId: target.joinRequestId,
    actorUserId,
    replacedInvitation,
  });
  console.log("bfg_invitation_stage", {
    stage: "IDENTITY_SIGN_IN_REQUIRED",
    existingIdentity: true,
    replacedInvitation,
  });
  return { status: "sign_in_required" as const };
}

async function deliverInvitation(
  ctx: ActionCtx,
  args: { joinRequestId: Id<"joinRequests">; actorUserId: Id<"appUsers"> },
  excludedInvitationId?: string,
): Promise<DeliveryResult> {
  const target: InvitationTarget | null = await ctx.runQuery(internal.joinRequestInvitationState.target, {
    joinRequestId: args.joinRequestId,
  });
  if (!target) return { status: "complete" as const };

  let client: ReturnType<typeof clerkClient> | null = null;
  try {
    client = clerkClient();
    const existingUser = await findExistingUser(client, target.email, target.applicantClerkUserId);
    if (existingUser) return routeExistingIdentity(ctx, target, args.actorUserId, client);

    const existingInvitation = await findPendingInvitation(client, target.email, excludedInvitationId);
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
      redirectUrl: BFG_INVITATION_REDIRECT_URL,
    });
    console.log("bfg_invitation_stage", {
      stage: "INVITATION_CREATED",
      invitationCreated: true,
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
      const fallbackClient = client || clerkClient();
      const existingUser = await findExistingUser(fallbackClient, target.email, target.applicantClerkUserId);
      if (existingUser) return routeExistingIdentity(ctx, target, args.actorUserId, fallbackClient);
      const existingInvitation = await findPendingInvitation(fallbackClient, target.email, excludedInvitationId);
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
}

export const deliver = internalAction({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
  },
  handler: deliverInvitation,
});

export const replace = internalAction({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
    invitationId: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<DeliveryResult> => {
    if (args.invitationId) {
      try {
        await clerkClient().invitations.revokeInvitation(args.invitationId);
      } catch {
        await ctx.runMutation(internal.joinRequestInvitationState.markFailed, {
          joinRequestId: args.joinRequestId,
          actorUserId: args.actorUserId,
        });
        return { status: "failed" as const };
      }
    }
    return deliverInvitation(ctx, args, args.invitationId);
  },
});

export const revoke = internalAction({
  args: { joinRequestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const target = await ctx.runQuery(internal.joinRequestInvitationState.removalTarget, {
      joinRequestId: args.joinRequestId,
    });
    if (!target) return { status: "complete" as const };

    try {
      const client = clerkClient();
      const invitation = target.invitationId ? null : await findPendingInvitation(client, target.email);
      const invitationId =
        target.invitationId || (invitation && invitation.createdAt <= target.removedAt ? invitation.id : null);
      if (!invitationId) return { status: "not_found" as const };
      await client.invitations.revokeInvitation(invitationId);
      return { status: "revoked" as const };
    } catch {
      // Membership removal is already committed in BFG; Clerk revocation is best effort.
      return { status: "skipped" as const };
    }
  },
});
