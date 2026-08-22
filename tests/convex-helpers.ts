import { convexTest } from "convex-test";
import { register as registerRateLimiter } from "@convex-dev/rate-limiter/test";
import { api } from "../convex/_generated/api";
import schema from "../convex/schema";

export const OWNER_SUBJECT = "phase041-owner-test";
export const ADMIN_SUBJECT = "phase041-admin-test";
export const CUSTOMER_SUBJECT = "phase041-customer-test";
export const SECOND_CUSTOMER_SUBJECT = "phase041-second-customer-test";

export type TestConvex = ReturnType<typeof convexTest>;

export function testConvex() {
  const t = convexTest(schema, import.meta.glob("../convex/**/*.ts"));
  registerRateLimiter(t);
  return t;
}

export function asUser(t: TestConvex, subject: string) {
  return t.withIdentity({ subject, tokenIdentifier: `clerk|${subject}`, email: `${subject}@example.com` });
}

export async function provision(t: TestConvex, subject: string) {
  if (subject !== OWNER_SUBJECT) await seedApprovedJoinRequest(t, `${subject}@example.com`);
  return asUser(t, subject).mutation(api.users.ensureCurrentUser, {});
}

export async function seedApprovedJoinRequest(t: TestConvex, email: string) {
  await t.run(async (ctx) => {
    const now = Date.now();
    await ctx.db.insert("joinRequests", {
      name: "Test Blessfriend",
      email: email.toLowerCase(),
      normalizedEmail: email.toLowerCase(),
      contact: "081200000000",
      normalizedContact: "+628120000000",
      city: "Jakarta",
      bookInterest: "Children Books",
      source: "test",
      acknowledged: true,
      status: "approved",
      invitationStatus: "ready",
      submittedAt: now,
      reviewedAt: now,
      createdAt: now,
      updatedAt: now,
    });
  });
}

export async function setupUsers(t: TestConvex) {
  process.env.BFG_OWNER_CLERK_USER_ID = OWNER_SUBJECT;
  const owner = asUser(t, OWNER_SUBJECT);
  const admin = asUser(t, ADMIN_SUBJECT);
  const customer = asUser(t, CUSTOMER_SUBJECT);
  const secondCustomer = asUser(t, SECOND_CUSTOMER_SUBJECT);
  await owner.mutation(api.users.ensureCurrentUser, {});
  await seedApprovedJoinRequest(t, `${ADMIN_SUBJECT}@example.com`);
  await seedApprovedJoinRequest(t, `${CUSTOMER_SUBJECT}@example.com`);
  await seedApprovedJoinRequest(t, `${SECOND_CUSTOMER_SUBJECT}@example.com`);
  const adminUser = await admin.mutation(api.users.ensureCurrentUser, {});
  await customer.mutation(api.users.ensureCurrentUser, {});
  await secondCustomer.mutation(api.users.ensureCurrentUser, {});
  await owner.mutation(api.users.updateRole, { userId: adminUser.appUserId, role: "admin" });
  await t.run(async (ctx) => {
    const requests = await ctx.db.query("joinRequests").collect();
    for (const request of requests) {
      if (request.source === "test") await ctx.db.delete(request._id);
    }
  });
  return { owner, admin, customer, secondCustomer };
}

export function configureTestEnvironment() {
  process.env.BFG_OWNER_CLERK_USER_ID = OWNER_SUBJECT;
  process.env.BFG_CATALOG_CODE_PEPPER = "catalog-test-pepper";
  delete process.env.BFG_PREVIEW_DEMO_MODE;
}

export async function createOpenCatalog(
  admin: ReturnType<typeof asUser>,
  name = "Test Catalog",
  suffix = "0001",
  accessCode = "catalog-secret",
) {
  const bundle = await admin.mutation(api.secretCatalogs.createBundle, {
    name,
    publisherName: `${name} Publisher`,
    bookTitle: `${name} Book`,
    accessCode,
    variants: [{ format: "PB", isbn: `9780000${suffix}`, priceAmount: 125000 }],
  });
  await admin.mutation(api.secretCatalogs.open, { catalogId: bundle.catalogId });
  return bundle;
}
