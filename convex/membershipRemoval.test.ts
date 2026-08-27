/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import type { Id } from "./_generated/dataModel";
import {
  ADMIN_SUBJECT,
  CUSTOMER_SUBJECT,
  configureTestEnvironment,
  setupUsers,
  testConvex,
} from "../tests/convex-helpers";

const customerEmail = `${CUSTOMER_SUBJECT}@example.com`;

async function seedApprovedMembership(
  t: ReturnType<typeof testConvex>,
  appUserId: Id<"appUsers">,
  email: string = customerEmail,
  applicantClerkUserId: string = CUSTOMER_SUBJECT,
) {
  return t.run(async (ctx) => {
    const now = Date.now();
    return ctx.db.insert("joinRequests", {
      name: "Existing Blessfriend",
      email,
      normalizedEmail: email,
      applicantClerkUserId,
      applicantEmailSnapshot: email,
      contact: "081200000000",
      normalizedContact: "+628120000000",
      city: "Jakarta",
      bookInterest: "Children Books",
      source: "test",
      acknowledged: true,
      status: "approved",
      invitationStatus: "accepted",
      submittedAt: now,
      reviewedAt: now,
      reviewedByUserId: undefined,
      admittedAppUserId: appUserId,
      createdAt: now,
      updatedAt: now,
    });
  });
}

function requestInput(overrides: Record<string, string> = {}) {
  return {
    name: "Returning Reader",
    email: overrides.email || customerEmail,
    contact: overrides.contact || "+62 812-3456-7891",
    city: "Jakarta Selatan",
    bookInterest: "Children Books" as const,
    acknowledged: true,
  };
}

describe("BFG membership removal lifecycle", () => {
  beforeEach(configureTestEnvironment);

  it("tombstones membership, preserves the accepted admission, allows reapply, and is idempotent", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("customer fixture missing");
    const requestA = await seedApprovedMembership(t, current.appUserId);

    const removed = await admin.mutation(api.joinRequests.removeMember, { joinRequestId: requestA });
    expect(removed).toMatchObject({
      status: "approved",
      invitationStatus: "accepted",
      admissionStatus: "removed",
      removalReason: null,
    });
    expect(removed.removedAt).toBeTruthy();
    expect(await customer.mutation(api.users.ensureCurrentUser, {})).toMatchObject({
      appUserId: current.appUserId,
      role: "customer",
      status: "removed",
    });
    expect(await admin.query(api.orders.listEligibleCustomers, {})).not.toEqual(
      expect.arrayContaining([expect.objectContaining({ customerUserId: current.appUserId })]),
    );

    const reapply = await t.mutation(api.joinRequests.submit, requestInput({ contact: "+62 812-3456-7892" }));
    expect(reapply.status).toBe("submitted");
    await expect(admin.mutation(api.joinRequests.removeMember, { joinRequestId: requestA })).resolves.toMatchObject({
      admissionStatus: "removed",
    });
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).filter((event) => event.action === "membership.removed"),
      ),
    ).toHaveLength(1);
    expect(await t.run(async (ctx) => ctx.db.get(requestA))).toMatchObject({
      status: "approved",
      invitationStatus: "accepted",
    });
    expect(await t.run(async (ctx) => ctx.db.get(current.appUserId))).toMatchObject({
      status: "removed",
      memberCode: current.memberCode,
    });
  });

  it("reactivates only through a new approval for the same Clerk subject", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("customer fixture missing");
    const requestA = await seedApprovedMembership(t, current.appUserId);
    await admin.mutation(api.joinRequests.removeMember, { joinRequestId: requestA });

    await expect(customer.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({ status: "removed" });
    const requestB = await customer.mutation(api.joinRequests.submit, requestInput());
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: requestB.joinRequestId });
    const approvedB = await admin.mutation(api.joinRequests.approve, { joinRequestId: requestB.joinRequestId });

    expect(approvedB).toMatchObject({ status: "approved", invitationStatus: "accepted", admissionStatus: "active" });
    expect(await customer.query(api.users.current, {})).toMatchObject({
      appUserId: current.appUserId,
      role: "customer",
      status: "active",
      memberCode: current.memberCode,
    });
    expect(await customer.query(api.joinRequests.mine, {})).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ joinRequestId: requestA, admissionStatus: "removed" }),
        expect.objectContaining({ joinRequestId: requestB.joinRequestId, admissionStatus: "active" }),
      ]),
    );
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("appUsers").collect()).filter((user) => user.clerkUserId === CUSTOMER_SUBJECT),
      ),
    ).toHaveLength(1);
  });

  it("reconciles a new Clerk subject only after a new approval", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const current = await customer.query(api.users.current, {});
    if (!current) throw new Error("customer fixture missing");
    const requestA = await seedApprovedMembership(t, current.appUserId);
    await admin.mutation(api.joinRequests.removeMember, { joinRequestId: requestA });

    const requestB = await t.mutation(api.joinRequests.submit, requestInput({ contact: "+62 812-3456-7893" }));
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: requestB.joinRequestId });
    await admin.mutation(api.joinRequests.approve, { joinRequestId: requestB.joinRequestId });
    const newIdentity = t.withIdentity({ subject: "new-clerk-subject", email: customerEmail, emailVerified: true });

    await expect(newIdentity.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "active",
    });
    expect(
      await t.run(async (ctx) => (await ctx.db.query("appUsers").collect()).filter((user) => user.role === "customer")),
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ clerkUserId: CUSTOMER_SUBJECT, status: "removed" }),
        expect.objectContaining({ clerkUserId: "new-clerk-subject", status: "active" }),
      ]),
    );
  });

  it("keeps active memberships and privileged accounts from using the removal flow", async () => {
    const t = testConvex();
    const { owner, admin } = await setupUsers(t);
    const adminUser = await admin.query(api.users.current, {});
    if (!adminUser) throw new Error("admin fixture missing");
    const request = await seedApprovedMembership(t, adminUser.appUserId, "admin-target@example.com", ADMIN_SUBJECT);
    await expect(admin.mutation(api.joinRequests.removeMember, { joinRequestId: request })).rejects.toThrow(
      "MEMBERSHIP_REMOVAL_NOT_ALLOWED",
    );
    expect(await admin.query(api.users.current, {})).toMatchObject({ status: "active", role: "admin" });
    expect(await owner.query(api.joinRequests.listForAdmin, { status: "approved" })).toEqual(
      expect.arrayContaining([expect.objectContaining({ joinRequestId: request, admissionStatus: "pending" })]),
    );
  });

  it("blocks a duplicate request while a matching active Customer exists", async () => {
    const t = testConvex();
    await setupUsers(t);
    await expect(t.mutation(api.joinRequests.submit, requestInput({ contact: "+62 812-3456-7894" }))).rejects.toThrow(
      "JOIN_REQUEST_ALREADY_APPROVED",
    );
  });
});
