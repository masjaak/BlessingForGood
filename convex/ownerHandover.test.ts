/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api, internal } from "./_generated/api";
import {
  ADMIN_SUBJECT,
  OWNER_SUBJECT,
  configureTestEnvironment,
  setupUsers,
  testConvex,
} from "../tests/convex-helpers";

const TARGET_EMAIL = `${ADMIN_SUBJECT}@example.com`;

describe("BFG handover — privileged Owner transfer", () => {
  beforeEach(configureTestEnvironment);

  it("preflights existing user identity and atomically swaps exactly one Owner", async () => {
    const t = testConvex();
    const { owner, admin } = await setupUsers(t);
    const preview = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });

    expect(preview).toMatchObject({
      ready: true,
      blockers: [],
      currentOwnerClerkUserId: OWNER_SUBJECT,
      recipientClerkUserId: ADMIN_SUBJECT,
      recipientEmailSnapshot: TARGET_EMAIL,
      recipientRole: "admin",
      recipientStatus: "active",
    });
    if (!preview.currentOwnerAppUserId || !preview.recipientAppUserId) throw new Error("Fixture incomplete");
    const originalOwnerId = preview.currentOwnerAppUserId;
    const nextOwnerId = preview.recipientAppUserId;

    const transferArgs = {
      newOwnerEmail: TARGET_EMAIL,
      expectedOldOwnerAppUserId: originalOwnerId,
      expectedOldOwnerClerkUserId: OWNER_SUBJECT,
      expectedNewOwnerAppUserId: nextOwnerId,
      expectedNewOwnerClerkUserId: ADMIN_SUBJECT,
      confirmation: "APPROVE_BFG_OWNER_HANDOVER" as const,
    };
    const outcome = await t.mutation(internal.ownerHandover.execute, transferArgs);
    expect(outcome).toEqual({
      transferred: true,
      previousOwnerAppUserId: originalOwnerId,
      newOwnerAppUserId: nextOwnerId,
      previousOwnerRole: "admin",
      newOwnerRole: "owner",
    });

    const saved = await t.run(async (ctx) => {
      const newOwner = await ctx.db.get(nextOwnerId);
      const previousOwner = await ctx.db.get(originalOwnerId);
      const owners = await ctx.db
        .query("appUsers")
        .withIndex("by_role", (q) => q.eq("role", "owner"))
        .take(2);
      const audit = await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (q) => q.eq("targetType", "appUser").eq("targetId", nextOwnerId))
        .take(10);
      return { newOwner, previousOwner, owners, audit };
    });
    expect(saved.owners).toHaveLength(1);
    expect(saved.owners[0]._id).toBe(nextOwnerId);
    expect(saved.newOwner?.role).toBe("owner");
    expect(saved.previousOwner?.role).toBe("admin");
    expect(saved.audit).toMatchObject([
      {
        action: "owner.handover.completed",
        actorUserId: originalOwnerId,
        safeMetadata: expect.objectContaining({ recipientPreviousRole: "admin" }),
      },
    ]);

    await expect(owner.mutation(api.users.inviteStaff, { email: "post-transfer@example.com" })).rejects.toThrow(
      "PERMISSION_DENIED",
    );
    const allowed = await admin.mutation(api.users.inviteStaff, { email: "post-transfer@example.com" });
    expect(allowed).toMatchObject({ status: "pending" });

    await expect(t.mutation(internal.ownerHandover.execute, transferArgs)).rejects.toThrow("OWNER_TRANSFER_BLOCKED");
    const count = await t.run(async (ctx) => {
      const audits = await ctx.db
        .query("auditEvents")
        .withIndex("by_target", (q) => q.eq("targetType", "appUser").eq("targetId", nextOwnerId))
        .take(10);
      return audits.length;
    });
    expect(count).toBe(1);
  });

  it("rejects an incorrect Clerk subject even if the email matches", async () => {
    const t = testConvex();
    await setupUsers(t);
    const preview = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    if (!preview.currentOwnerAppUserId || !preview.recipientAppUserId) throw new Error("Fixture incomplete");

    await expect(
      t.mutation(internal.ownerHandover.execute, {
        newOwnerEmail: TARGET_EMAIL,
        expectedOldOwnerAppUserId: preview.currentOwnerAppUserId,
        expectedOldOwnerClerkUserId: OWNER_SUBJECT,
        expectedNewOwnerAppUserId: preview.recipientAppUserId,
        expectedNewOwnerClerkUserId: "wrong-clerk-subject",
        confirmation: "APPROVE_BFG_OWNER_HANDOVER",
      }),
    ).rejects.toThrow("OWNER_TRANSFER_IDENTITY_CHANGED");
    const roles = await t.run(async (ctx) => {
      const original = await ctx.db.get(preview.currentOwnerAppUserId!);
      const target = await ctx.db.get(preview.recipientAppUserId!);
      return [original?.role, target?.role];
    });
    expect(roles).toEqual(["owner", "admin"]);
  });

  it("blocks if Convex owner config is stale, avoiding split-brain identity", async () => {
    const t = testConvex();
    await setupUsers(t);
    process.env.BFG_OWNER_CLERK_USER_ID = "another-owner";
    const preview = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    expect(preview.ready).toBe(false);
    expect(preview.blockers).toContain("OWNER_ENV_NOT_MATCHING_CURRENT_OWNER");

    if (!preview.currentOwnerAppUserId || !preview.recipientAppUserId) throw new Error("Fixture incomplete");
    await expect(
      t.mutation(internal.ownerHandover.execute, {
        newOwnerEmail: TARGET_EMAIL,
        expectedOldOwnerAppUserId: preview.currentOwnerAppUserId,
        expectedOldOwnerClerkUserId: OWNER_SUBJECT,
        expectedNewOwnerAppUserId: preview.recipientAppUserId,
        expectedNewOwnerClerkUserId: ADMIN_SUBJECT,
        confirmation: "APPROVE_BFG_OWNER_HANDOVER",
      }),
    ).rejects.toThrow("OWNER_TRANSFER_BLOCKED");
  });

  it("rejects multiple Owner rows rather than deciding silently", async () => {
    const t = testConvex();
    const { customer } = await setupUsers(t);
    const another = await customer.query(api.users.current, {});
    if (!another) throw new Error("Missing customer");
    await t.run((ctx) => ctx.db.patch(another.appUserId, { role: "owner" }));
    const preview = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    expect(preview.ready).toBe(false);
    expect(preview.blockers).toContain("EXPECTED_EXACTLY_ONE_OWNER");
  });

  it("rejects inactive and ambiguous recipient accounts", async () => {
    const t = testConvex();
    await setupUsers(t);
    const preview = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    if (!preview.recipientAppUserId) throw new Error("Missing recipient");
    await t.run((ctx) => ctx.db.patch(preview.recipientAppUserId!, { status: "suspended" }));
    const inactive = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    expect(inactive.ready).toBe(false);
    expect(inactive.blockers).toContain("RECIPIENT_NOT_ACTIVE");
    await t.run(async (ctx) => {
      const target = await ctx.db.get(preview.recipientAppUserId!);
      if (!target) throw new Error("No target");
      await ctx.db.patch(target._id, { status: "active" });
      await ctx.db.insert("appUsers", {
        clerkUserId: "another-clerk-subject",
        role: "customer",
        status: "active",
        emailSnapshot: TARGET_EMAIL,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        lastSeenAt: Date.now(),
      });
    });
    const dup = await t.query(internal.ownerHandover.preflight, { newOwnerEmail: TARGET_EMAIL });
    expect(dup.ready).toBe(false);
    expect(dup.blockers).toContain("EXPECTED_ONE_RECIPIENT_WITH_MATCHING_EMAIL");
  });
});
