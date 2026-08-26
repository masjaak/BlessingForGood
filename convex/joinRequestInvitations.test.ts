/// <reference types="vite/client" />

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

const clerkState = vi.hoisted(() => ({
  getUser: vi.fn(),
  getUserList: vi.fn(),
  getInvitationList: vi.fn(),
  createInvitation: vi.fn(),
}));

vi.mock("@clerk/backend", () => ({
  createClerkClient: vi.fn(() => ({
    users: { getUser: clerkState.getUser, getUserList: clerkState.getUserList },
    invitations: {
      getInvitationList: clerkState.getInvitationList,
      createInvitation: clerkState.createInvitation,
    },
  })),
}));

const email = "new-reader@example.com";

function requestInput(overrides: Record<string, string> = {}) {
  return {
    name: "New Reader",
    email: overrides.email || email,
    contact: "+62 812-3456-7890",
    city: "Jakarta Selatan",
    bookInterest: "Children Books" as const,
    acknowledged: true,
  };
}

async function submitForApproval(
  t: ReturnType<typeof testConvex>,
  admin: Awaited<ReturnType<typeof setupUsers>>["admin"],
  input = requestInput(),
) {
  const submitted = await t.mutation(api.joinRequests.submit, input);
  await admin.mutation(api.joinRequests.startReview, { joinRequestId: submitted.joinRequestId });
  return admin.mutation(api.joinRequests.approve, { joinRequestId: submitted.joinRequestId });
}

describe("automatic Clerk invitation reconciliation", () => {
  beforeEach(() => {
    configureTestEnvironment();
    process.env.CLERK_SECRET_KEY = "test-only-clerk-secret";
    clerkState.getUser.mockReset();
    clerkState.getUserList.mockReset().mockResolvedValue({ data: [] });
    clerkState.getInvitationList.mockReset().mockResolvedValue({ data: [] });
    clerkState.createInvitation.mockReset().mockResolvedValue({
      id: "inv_test_1",
      emailAddress: email,
      status: "pending",
    });
  });

  afterEach(() => {
    delete process.env.CLERK_SECRET_KEY;
  });

  it("creates one server-side invitation for a newly approved email", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const approved = await submitForApproval(t, admin);

    expect(approved).toMatchObject({ status: "approved", invitationStatus: "pending" });
    await t.finishAllScheduledFunctions(() => undefined);

    expect(clerkState.createInvitation).toHaveBeenCalledTimes(1);
    expect(clerkState.createInvitation).toHaveBeenCalledWith({
      emailAddress: email,
      notify: true,
      ignoreExisting: false,
    });
    expect(await admin.query(api.joinRequests.listForAdmin, { status: "approved" })).toMatchObject([
      {
        invitationStatus: "sent",
        admissionStatus: "invitation_pending",
        invitationError: null,
      },
    ]);
  });

  it("reuses an existing pending invitation instead of creating another", async () => {
    clerkState.getInvitationList.mockResolvedValue({
      data: [{ id: "inv_existing", emailAddress: email, status: "pending" }],
    });
    const t = testConvex();
    const { admin } = await setupUsers(t);
    await submitForApproval(t, admin);
    await t.finishAllScheduledFunctions(() => undefined);

    expect(clerkState.createInvitation).not.toHaveBeenCalled();
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      invitationStatus: "sent",
      admissionStatus: "invitation_pending",
    });
  });

  it("reconciles an existing Clerk identity into one active Customer", async () => {
    const existingClerkUserId = "clerk_existing_reader";
    clerkState.getUserList.mockResolvedValue({
      data: [{ id: existingClerkUserId, emailAddresses: [{ emailAddress: email }] }],
    });
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const approved = await submitForApproval(t, admin);
    await t.finishAllScheduledFunctions(() => undefined);

    expect(clerkState.createInvitation).not.toHaveBeenCalled();
    expect(approved.status).toBe("approved");
    const existingIdentity = t.withIdentity({ subject: existingClerkUserId, email });
    expect(await existingIdentity.query(api.users.current, {})).toMatchObject({ role: "customer", status: "active" });
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      invitationStatus: "accepted",
      admissionStatus: "active",
    });
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("appUsers").collect()).filter((user) => user.clerkUserId === existingClerkUserId),
      ),
    ).toHaveLength(1);
  });

  it("persists a safe failure and retries from the Admin workflow", async () => {
    clerkState.createInvitation.mockRejectedValueOnce(new Error("provider details must not be persisted"));
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const approved = await submitForApproval(t, admin, requestInput({ email: "retry-reader@example.com" }));
    await t.finishAllScheduledFunctions(() => undefined);

    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      invitationStatus: "failed",
      admissionStatus: "invitation_failed",
      invitationError: "Undangan belum berhasil dikirim.",
    });
    expect(JSON.stringify(await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))).not.toContain(
      "provider details",
    );

    await admin.mutation(api.joinRequests.retryInvitation, { joinRequestId: approved.joinRequestId });
    await t.finishAllScheduledFunctions(() => undefined);
    expect(clerkState.createInvitation).toHaveBeenCalledTimes(2);
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      invitationStatus: "sent",
      invitationError: null,
    });
  });

  it("makes repeated approval idempotent and provisions after invitation acceptance", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const approved = await submitForApproval(t, admin, requestInput({ email: "accepted-reader@example.com" }));
    await t.finishAllScheduledFunctions(() => undefined);
    await expect(admin.mutation(api.joinRequests.approve, { joinRequestId: approved.joinRequestId })).resolves.toMatchObject({
      status: "approved",
      invitationStatus: "sent",
    });
    await t.finishAllScheduledFunctions(() => undefined);
    expect(clerkState.createInvitation).toHaveBeenCalledTimes(1);

    const acceptedIdentity = t.withIdentity({ subject: "clerk_accepted_reader", email: "accepted-reader@example.com" });
    await expect(acceptedIdentity.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "active",
    });
    expect(await acceptedIdentity.query(api.joinRequests.mine, {})).toMatchObject([
      { admissionStatus: "active", invitationStatus: "accepted" },
    ]);
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).filter((event) => event.action === "join_request.approved"),
      ),
    ).toHaveLength(1);
  });

  it("does not activate a matching identity before Admin approval", async () => {
    const t = testConvex();
    const pendingEmail = "pending-reader@example.com";
    await t.mutation(api.joinRequests.submit, requestInput({ email: pendingEmail }));
    const pendingIdentity = t.withIdentity({
      subject: "clerk_pending_reader",
      email: pendingEmail,
      emailVerified: true,
    });

    await expect(pendingIdentity.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("ADMISSION_REQUIRED");
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("appUsers").collect()).filter((user) => user.clerkUserId === "clerk_pending_reader"),
      ),
    ).toHaveLength(0);
  });

  it("does not activate a rejected request or a wrong authenticated email", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const rejected = await t.mutation(api.joinRequests.submit, requestInput({ email: "rejected-reader@example.com" }));
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: rejected.joinRequestId });
    await admin.mutation(api.joinRequests.reject, {
      joinRequestId: rejected.joinRequestId,
      rejectionReason: "Not approved for this test.",
    });
    const rejectedIdentity = t.withIdentity({
      subject: "clerk_rejected_reader",
      email: "rejected-reader@example.com",
      emailVerified: true,
    });
    await expect(rejectedIdentity.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("ADMISSION_REQUIRED");

    const approvedEmail = "approved-reader@example.com";
    const approved = await submitForApproval(t, admin, requestInput({ email: approvedEmail }));
    const wrongIdentity = t.withIdentity({
      subject: "clerk_wrong_reader",
      email: "wrong-reader@example.com",
      emailVerified: true,
    });
    await expect(wrongIdentity.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("ADMISSION_REQUIRED");
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      joinRequestId: approved.joinRequestId,
      invitationStatus: "pending",
      admissionStatus: "invitation_pending",
    });
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("appUsers").collect()).filter((user) => user.clerkUserId === "clerk_wrong_reader"),
      ),
    ).toHaveLength(0);
  });

  it("requires a trusted email claim and keeps suspended customers suspended", async () => {
    const t = testConvex();
    const { owner, customer } = await setupUsers(t);
    const unverifiedEmail = "unverified-reader@example.com";
    const approved = await submitForApproval(t, owner, requestInput({ email: unverifiedEmail }));
    const unverifiedIdentity = t.withIdentity({
      subject: "clerk_unverified_reader",
      email: unverifiedEmail,
      emailVerified: false,
    });
    await expect(unverifiedIdentity.mutation(api.users.ensureCurrentUser, {})).rejects.toThrow("ADMISSION_REQUIRED");
    expect((await owner.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      joinRequestId: approved.joinRequestId,
      admissionStatus: "invitation_pending",
    });

    const customerUser = await customer.query(api.users.current, {});
    if (!customerUser) throw new Error("customer fixture missing");
    await owner.mutation(api.users.suspend, { userId: customerUser.appUserId });
    await expect(customer.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "suspended",
    });
  });

  it("does not convert an existing privileged appUser into a Customer", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const approved = await submitForApproval(
      t,
      admin,
      requestInput({ email: "phase041-admin-test@example.com" }),
    );

    await expect(admin.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "admin",
      status: "active",
    });
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      joinRequestId: approved.joinRequestId,
      invitationStatus: "pending",
      admissionStatus: "invitation_pending",
    });
  });

  it("reconciles an accepted identity when its active appUser already exists", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const staleEmail = "stale-reader@example.com";
    const approved = await submitForApproval(t, admin, requestInput({ email: staleEmail }));
    await t.run(async (ctx) => {
      const now = Date.now();
      await ctx.db.insert("appUsers", {
        clerkUserId: "clerk_stale_reader",
        role: "customer",
        status: "active",
        emailSnapshot: staleEmail,
        displayNameSnapshot: "Stale Reader",
        createdAt: now,
        updatedAt: now,
        lastSeenAt: now,
      });
    });

    const acceptedIdentity = t.withIdentity({
      subject: "clerk_stale_reader",
      email: staleEmail,
      emailVerified: true,
    });
    const first = await acceptedIdentity.mutation(api.users.ensureCurrentUser, {});
    expect(first).toMatchObject({
      role: "customer",
      status: "active",
    });
    await expect(acceptedIdentity.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      appUserId: first.appUserId,
      role: "customer",
      status: "active",
    });
    expect((await admin.query(api.joinRequests.listForAdmin, { status: "approved" }))[0]).toMatchObject({
      joinRequestId: approved.joinRequestId,
      invitationStatus: "accepted",
      admissionStatus: "active",
    });
    expect(
      await t.run(async (ctx) =>
        (await ctx.db.query("auditEvents").collect()).filter(
          (event) =>
            event.action === "join_request.admission_succeeded" && event.targetId === String(approved.joinRequestId),
        ),
      ),
    ).toHaveLength(1);
  });
});
