import type { UserIdentity } from "convex/server";
import type { Doc, Id } from "../_generated/dataModel";
import type { MutationCtx, QueryCtx } from "../_generated/server";
import { fail } from "./errors";

type AuthCtx = QueryCtx | MutationCtx;
export type BfgRole = "owner" | "admin" | "customer";
export type Permission =
  | "catalog.read"
  | "catalog.manage"
  | "books.read"
  | "books.manage"
  | "orders.read.own"
  | "orders.read.all"
  | "orders.manage"
  | "batches.read"
  | "batches.manage"
  | "tracking.read.own"
  | "tracking.read.all"
  | "tracking.manage"
  | "invoices.read.own"
  | "invoices.read.all"
  | "invoices.manage"
  | "deposits.read.own"
  | "deposits.read.all"
  | "deposits.manage"
  | "refunds.read.own"
  | "refunds.read.all"
  | "refunds.manage"
  | "customers.read"
  | "customers.manage"
  | "users.read"
  | "users.manage_roles"
  | "users.suspend"
  | "settings.manage"
  | "content.manage"
  | "audit.read";

const customerPermissions = new Set<Permission>([
  "catalog.read",
  "books.read",
  "orders.read.own",
  "tracking.read.own",
  "invoices.read.own",
  "deposits.read.own",
  "refunds.read.own",
]);

const adminPermissions = new Set<Permission>([
  ...customerPermissions,
  "catalog.manage",
  "books.manage",
  "orders.read.all",
  "orders.manage",
  "batches.read",
  "batches.manage",
  "tracking.read.all",
  "tracking.manage",
  "invoices.read.all",
  "invoices.manage",
  "deposits.read.all",
  "deposits.manage",
  "refunds.read.all",
  "refunds.manage",
  "customers.read",
  "customers.manage",
  "content.manage",
]);

const allPermissions = new Set<Permission>([
  ...adminPermissions,
  "users.read",
  "users.manage_roles",
  "users.suspend",
  "settings.manage",
  "audit.read",
]);

export async function requireIdentity(ctx: AuthCtx): Promise<UserIdentity> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) fail("IDENTITY_REQUIRED");
  return identity;
}

export async function findCurrentUser(ctx: AuthCtx, identity: UserIdentity): Promise<Doc<"appUsers"> | null> {
  return ctx.db
    .query("appUsers")
    .withIndex("by_clerk_user_id", (query) => query.eq("clerkUserId", identity.subject))
    .unique();
}

export async function requireCurrentUser(ctx: AuthCtx): Promise<Doc<"appUsers">> {
  const identity = await requireIdentity(ctx);
  const user = await findCurrentUser(ctx, identity);
  if (!user) fail("APP_USER_REQUIRED");
  return user;
}

export async function requireActiveUser(ctx: AuthCtx): Promise<Doc<"appUsers">> {
  const user = await requireCurrentUser(ctx);
  if (user.status === "removed") fail("USER_REMOVED");
  if (user.status !== "active") fail("USER_SUSPENDED");
  return user;
}

export async function requirePermission(ctx: AuthCtx, permission: Permission): Promise<Doc<"appUsers">> {
  const user = await requireActiveUser(ctx);
  const permissions =
    user.role === "owner" ? allPermissions : user.role === "admin" ? adminPermissions : customerPermissions;
  if (!permissions.has(permission)) fail("PERMISSION_DENIED");
  return user;
}

export async function requireAdminOrOwner(ctx: AuthCtx): Promise<Doc<"appUsers">> {
  const user = await requireActiveUser(ctx);
  if (user.role !== "admin" && user.role !== "owner") fail("PERMISSION_DENIED");
  return user;
}

export async function requireOwner(ctx: AuthCtx): Promise<Doc<"appUsers">> {
  const user = await requireActiveUser(ctx);
  if (user.role !== "owner") fail("PERMISSION_DENIED");
  return user;
}

export async function requireOwnedResource(
  ctx: AuthCtx,
  ownerUserId: Id<"appUsers">,
  errorCode:
    | "ORDER_ACCESS_DENIED"
    | "INVOICE_ACCESS_DENIED"
    | "DEPOSIT_ACCESS_DENIED"
    | "PAYMENT_CONFIRMATION_ACCESS_DENIED"
    | "EXCEPTION_ACCESS_DENIED" = "ORDER_ACCESS_DENIED",
): Promise<Doc<"appUsers">> {
  const user = await requireActiveUser(ctx);
  if (user._id !== ownerUserId) fail(errorCode);
  return user;
}

export function hasPermission(role: BfgRole, permission: Permission): boolean {
  const permissions = role === "owner" ? allPermissions : role === "admin" ? adminPermissions : customerPermissions;
  return permissions.has(permission);
}
