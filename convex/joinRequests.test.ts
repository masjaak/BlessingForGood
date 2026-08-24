/// <reference types="vite/client" />

import { beforeEach, describe, expect, it } from "vitest";
import { api } from "./_generated/api";
import { configureTestEnvironment, setupUsers, testConvex } from "../tests/convex-helpers";

type RequestInput = {
  name: string;
  email: string;
  contact: string;
  city: string;
  bookInterest:
    | "Children & Picture Books"
    | "Middle Grade"
    | "Young Adult"
    | "Fiction & Novel"
    | "Non-fiction"
    | "Art & Design"
    | "Architecture & Interiors"
    | "Photography"
    | "Fashion"
    | "Food & Cookbooks"
    | "Travel"
    | "Biography & Memoir"
    | "Comics & Graphic Novels"
    | "Collector & Special Editions"
    | "Other"
    | "Children Books"
    | "Collector Books"
    | "Novel";
  note?: string;
  acknowledged: boolean;
};

function requestInput(overrides: Partial<RequestInput> = {}): RequestInput {
  return {
    name: "Ada Reader",
    email: "Ada.Reader@example.com",
    contact: "+62 812-3456-7890",
    city: "Jakarta Selatan",
    bookInterest: "Children Books",
    note: "I would like to join the reading community.",
    acknowledged: true,
    ...overrides,
  };
}

describe("BFG join request workflow", () => {
  beforeEach(configureTestEnvironment);

  it("accepts a valid anonymous request and rejects invalid public input", async () => {
    const t = testConvex();
    await expect(t.mutation(api.joinRequests.submit, requestInput({ acknowledged: false }))).rejects.toThrow(
      "JOIN_REQUEST_ACKNOWLEDGEMENT_REQUIRED",
    );
    await expect(t.mutation(api.joinRequests.submit, requestInput({ email: "not-an-email" }))).rejects.toThrow(
      "JOIN_REQUEST_EMAIL_INVALID",
    );
    const submitted = await t.mutation(api.joinRequests.submit, requestInput());
    expect(submitted.status).toBe("submitted");
    const stored = await t.run(async (ctx) => ctx.db.get(submitted.joinRequestId));
    expect(stored).toMatchObject({
      status: "submitted",
      invitationStatus: "not_ready",
      email: "ada.reader@example.com",
      normalizedContact: "+6281234567890",
      bookInterest: "Children Books",
      source: "website",
    });
  });

  it("blocks duplicate active contact details without exposing a public list", async () => {
    const t = testConvex();
    const submitted = await t.mutation(api.joinRequests.submit, requestInput());
    await expect(t.mutation(api.joinRequests.submit, requestInput({ email: "other@example.com" }))).rejects.toThrow(
      "JOIN_REQUEST_DUPLICATE",
    );
    await expect(
      t.mutation(api.joinRequests.submit, requestInput({ contact: "+62 812 3456 7890", email: "other@example.com" })),
    ).rejects.toThrow("JOIN_REQUEST_DUPLICATE");
    await expect(
      t.mutation(api.joinRequests.submit, requestInput({ contact: "081234567890", email: "another@example.com" })),
    ).rejects.toThrow("JOIN_REQUEST_DUPLICATE");
    await expect(t.query(api.joinRequests.listForAdmin, {})).rejects.toThrow("IDENTITY_REQUIRED");
    expect(submitted.joinRequestId).toBeDefined();
  });

  it("accepts an expanded book interest and distinguishes approved duplicates", async () => {
    const t = testConvex();
    const submitted = await t.mutation(api.joinRequests.submit, requestInput({ bookInterest: "Photography" }));
    expect((await t.run(async (ctx) => ctx.db.get(submitted.joinRequestId)))?.bookInterest).toBe("Photography");
    await t.run(async (ctx) => ctx.db.patch(submitted.joinRequestId, { status: "approved", updatedAt: Date.now() }));

    await expect(t.mutation(api.joinRequests.submit, requestInput({ contact: "+62 811-2222-3333" }))).rejects.toThrow(
      "JOIN_REQUEST_ALREADY_APPROVED",
    );
  });

  it("connects an existing Clerk identity to one approved Blessfriend admission", async () => {
    const t = testConvex();
    const { admin } = await setupUsers(t);
    const applicant = t.withIdentity({
      subject: "join-applicant-test",
      tokenIdentifier: "clerk|join-applicant-test",
      email: "join-applicant@example.com",
    });

    const submitted = await applicant.mutation(
      api.joinRequests.submit,
      requestInput({ email: "join-applicant@example.com", contact: "+62 811-2222-3334" }),
    );
    expect(await applicant.query(api.joinRequests.mine, {})).toMatchObject([
      { status: "submitted", admissionStatus: "pending" },
    ]);
    expect(await admin.query(api.joinRequests.pendingCount, {})).toBe(1);

    await admin.mutation(api.joinRequests.startReview, { joinRequestId: submitted.joinRequestId });
    const approved = await admin.mutation(api.joinRequests.approve, { joinRequestId: submitted.joinRequestId });
    expect(approved).toMatchObject({ status: "approved", admissionStatus: "active" });
    expect(await admin.query(api.joinRequests.pendingCount, {})).toBe(0);
    expect(await applicant.query(api.users.current, {})).toMatchObject({ role: "customer", status: "active" });
    await expect(applicant.mutation(api.users.ensureCurrentUser, {})).resolves.toMatchObject({
      role: "customer",
      status: "active",
    });

    const applicantUsers = await t.run(async (ctx) =>
      (await ctx.db.query("appUsers").collect()).filter((user) => user.clerkUserId === "join-applicant-test"),
    );
    expect(applicantUsers).toHaveLength(1);
    await expect(applicant.query(api.joinRequests.mine, {})).resolves.toMatchObject([
      { status: "approved", admissionStatus: "active" },
    ]);
  });

  it("keeps pending attention scoped to reviewable requests", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const first = await t.mutation(api.joinRequests.submit, requestInput());
    await t.mutation(
      api.joinRequests.submit,
      requestInput({ email: "second@example.com", contact: "+62 811-2222-3335" }),
    );
    const third = await t.mutation(
      api.joinRequests.submit,
      requestInput({ email: "third@example.com", contact: "+62 811-2222-3336" }),
    );
    expect(await admin.query(api.joinRequests.pendingCount, {})).toBe(3);
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: first.joinRequestId });
    await admin.mutation(api.joinRequests.reject, {
      joinRequestId: first.joinRequestId,
      rejectionReason: "Not enough context for this request.",
    });
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: third.joinRequestId });
    await admin.mutation(api.joinRequests.approve, { joinRequestId: third.joinRequestId });
    expect(await admin.query(api.joinRequests.pendingCount, {})).toBe(1);
    await expect(customer.query(api.joinRequests.pendingCount, {})).rejects.toThrow("PERMISSION_DENIED");
  });

  it("enforces admin review transitions, preserves rejected history, and records audit", async () => {
    const t = testConvex();
    const { admin, customer } = await setupUsers(t);
    const submitted = await t.mutation(api.joinRequests.submit, requestInput());
    await expect(customer.query(api.joinRequests.listForAdmin, {})).rejects.toThrow("PERMISSION_DENIED");
    await expect(
      customer.mutation(api.joinRequests.startReview, { joinRequestId: submitted.joinRequestId }),
    ).rejects.toThrow("PERMISSION_DENIED");
    await expect(admin.mutation(api.joinRequests.approve, { joinRequestId: submitted.joinRequestId })).rejects.toThrow(
      "JOIN_REQUEST_INVALID_STATE",
    );
    await expect(
      admin.mutation(api.joinRequests.startReview, { joinRequestId: submitted.joinRequestId }),
    ).resolves.toMatchObject({ status: "under_review" });
    const rejected = await admin.mutation(api.joinRequests.reject, {
      joinRequestId: submitted.joinRequestId,
      rejectionReason: "Please share a little more context in a follow-up.",
    });
    expect(rejected).toMatchObject({ status: "rejected", invitationStatus: "not_ready" });
    await expect(
      admin.mutation(api.joinRequests.reject, {
        joinRequestId: submitted.joinRequestId,
        rejectionReason: "Duplicate attempt",
      }),
    ).rejects.toThrow("JOIN_REQUEST_INVALID_STATE");

    const resubmitted = await t.mutation(
      api.joinRequests.submit,
      requestInput({ email: "new-request@example.com", contact: "+62 811-2222-3333" }),
    );
    await admin.mutation(api.joinRequests.startReview, { joinRequestId: resubmitted.joinRequestId });
    const approved = await admin.mutation(api.joinRequests.approve, {
      joinRequestId: resubmitted.joinRequestId,
      reviewNote: "Ready for the manual Clerk invitation handoff.",
    });
    expect(approved).toMatchObject({ status: "approved", invitationStatus: "ready" });
    await expect(
      admin.mutation(api.joinRequests.approve, { joinRequestId: resubmitted.joinRequestId }),
    ).rejects.toThrow("JOIN_REQUEST_INVALID_STATE");
    const actions = await t.run(async (ctx) =>
      (await ctx.db.query("auditEvents").collect()).map((event) => event.action),
    );
    expect(actions).toEqual(
      expect.arrayContaining(["join_request.review_started", "join_request.approved", "join_request.rejected"]),
    );
  });

  it("denies suspended admins and keeps an empty admin queue valid", async () => {
    const t = testConvex();
    const { owner, admin } = await setupUsers(t);
    expect(await admin.query(api.joinRequests.listForAdmin, {})).toEqual([]);
    const adminUser = (
      await owner.query(api.users.list, {
        role: "admin",
        status: "active",
        paginationOpts: { numItems: 10, cursor: null },
      })
    ).page[0];
    await owner.mutation(api.users.suspend, { userId: adminUser.appUserId });
    await expect(admin.query(api.joinRequests.listForAdmin, {})).rejects.toThrow("USER_SUSPENDED");
  });
});
