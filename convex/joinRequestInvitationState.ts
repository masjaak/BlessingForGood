import { v } from "convex/values";
import { internalMutation, internalQuery } from "./_generated/server";
import { admitApprovedJoinRequest } from "./users";
import { recordAudit } from "./lib/audit";
import { notifyAdmins, notifyUser } from "./lib/notifications";

const safeInvitationError = "Undangan belum berhasil dikirim.";

export const target = internalQuery({
  args: { joinRequestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.joinRequestId);
    if (
      !request ||
      request.status !== "approved" ||
      request.removedAt ||
      request.admittedAppUserId ||
      request.invitationStatus !== "pending"
    ) {
      return null;
    }
    return {
      joinRequestId: request._id,
      email: request.normalizedEmail,
      applicantClerkUserId: request.applicantClerkUserId ?? null,
    };
  },
});

export const removalTarget = internalQuery({
  args: { joinRequestId: v.id("joinRequests") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.joinRequestId);
    if (
      !request ||
      request.status !== "approved" ||
      !request.removedAt ||
      (request.invitationStatus !== "pending" && request.invitationStatus !== "sent")
    ) {
      return null;
    }
    return {
      joinRequestId: request._id,
      email: request.normalizedEmail,
      invitationId: request.clerkInvitationId ?? null,
      removedAt: request.removedAt,
    };
  },
});

export const markSent = internalMutation({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
    invitationId: v.optional(v.string()),
    reused: v.boolean(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.joinRequestId);
    if (
      !request ||
      request.status !== "approved" ||
      request.removedAt ||
      request.admittedAppUserId ||
      request.invitationStatus !== "pending"
    ) {
      return null;
    }
    const now = Date.now();
    await ctx.db.patch(request._id, {
      invitationStatus: "sent",
      clerkInvitationId: args.invitationId,
      invitationSentAt: now,
      invitationError: undefined,
      updatedAt: now,
    });
    await recordAudit(ctx, args.actorUserId, "join_request.invitation_sent", "join_request", request._id, {
      delivery: "clerk",
      reused: String(args.reused),
    });
    await notifyAdmins(ctx, {
      surface: "inbox",
      eventType: "join_request.invitation_sent",
      title: "Undangan Blessfriend dikirim",
      body: `Undangan telah dikirim ke ${request.normalizedEmail}.`,
      destination: "/admin/join-requests",
      relatedEntityType: "joinRequest",
      relatedEntityId: String(request._id),
    });
    return "sent" as const;
  },
});

export const markFailed = internalMutation({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.joinRequestId);
    if (
      !request ||
      request.status !== "approved" ||
      request.removedAt ||
      request.admittedAppUserId ||
      request.invitationStatus !== "pending"
    ) {
      return null;
    }
    await ctx.db.patch(request._id, {
      invitationStatus: "failed",
      invitationError: safeInvitationError,
      updatedAt: Date.now(),
    });
    await recordAudit(ctx, args.actorUserId, "join_request.invitation_failed", "join_request", request._id, {
      reason: "retry_required",
    });
    await notifyAdmins(ctx, {
      surface: "inbox",
      eventType: "join_request.invitation_failed",
      title: "Undangan Blessfriend belum terkirim",
      body: "Undangan belum berhasil dikirim. Kirim ulang dari antrian admission.",
      destination: "/admin/join-requests",
      relatedEntityType: "joinRequest",
      relatedEntityId: String(request._id),
    });
    return "failed" as const;
  },
});

export const reconcileIdentity = internalMutation({
  args: {
    joinRequestId: v.id("joinRequests"),
    actorUserId: v.id("appUsers"),
    clerkUserId: v.string(),
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.joinRequestId);
    if (!request || request.status !== "approved" || request.removedAt) return null;
    if (request.admittedAppUserId && request.invitationStatus === "accepted") return "active" as const;
    if (request.normalizedEmail !== args.email) return null;
    const wasAdmitted = Boolean(request.admittedAppUserId);
    await ctx.db.patch(request._id, {
      applicantClerkUserId: args.clerkUserId,
      applicantEmailSnapshot: args.email,
      updatedAt: Date.now(),
    });
    const updated = await ctx.db.get(request._id);
    if (!updated) return null;
    const admitted = await admitApprovedJoinRequest(ctx, updated, args.actorUserId);
    if (!admitted) return null;
    if (!wasAdmitted) {
      await notifyUser(ctx, admitted._id, {
        surface: "notification",
        eventType: "join_request.approved",
        title: "Akun Blessfriend aktif",
        body: "Permintaan bergabungmu disetujui. Workspace customer sudah tersedia.",
        destination: "/account",
        relatedEntityType: "joinRequest",
        relatedEntityId: String(request._id),
      });
    }
    return "active" as const;
  },
});
