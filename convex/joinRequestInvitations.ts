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
};
type DeliveryResult = { status: "complete" | "sent" | "failed" };

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
      ignoreExisting: true,
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
