import { HOUR, MINUTE, RateLimiter, type RateLimitConfig } from "@convex-dev/rate-limiter";
import type { ComponentApi } from "@convex-dev/rate-limiter/_generated/component.js";
import { components } from "../_generated/api";
import type { MutationCtx } from "../_generated/server";
import { fail } from "./errors";

const rateLimiterComponent = (components as { rateLimiter: ComponentApi }).rateLimiter;

const limits = {
  catalogUnlockGlobal: { kind: "fixed window", rate: 300, period: 15 * MINUTE },
  catalogUnlockUser: { kind: "token bucket", rate: 30, period: 15 * MINUTE, capacity: 20 },
  joinSubmitGlobal: { kind: "fixed window", rate: 20, period: 15 * MINUTE },
  joinSubmitUser: { kind: "token bucket", rate: 3, period: HOUR, capacity: 2 },
  orderSubmitUser: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 3 },
  readyStockOrderUser: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 3 },
  paymentSubmitUser: { kind: "token bucket", rate: 5, period: 15 * MINUTE, capacity: 2 },
  proofUploadUser: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 3 },
  depositSubmitUser: { kind: "token bucket", rate: 5, period: 15 * MINUTE, capacity: 2 },
  depositUploadUser: { kind: "token bucket", rate: 10, period: 15 * MINUTE, capacity: 3 },
  bookUploadUser: { kind: "token bucket", rate: 40, period: HOUR, capacity: 8 },
  staffInviteOwner: { kind: "token bucket", rate: 10, period: HOUR, capacity: 3 },
  bulkImportConfirmUser: { kind: "token bucket", rate: 10, period: HOUR, capacity: 2 },
} satisfies Record<string, RateLimitConfig>;

type RateLimitName = keyof typeof limits;

export const rateLimiter = new RateLimiter<typeof limits>(rateLimiterComponent, limits);

export async function enforceRateLimit(ctx: MutationCtx, name: RateLimitName, key?: string): Promise<void> {
  const result = await rateLimiter.limit(ctx, name, key ? { key } : {});
  if (!result.ok) {
    const retryAfterSeconds = Math.max(1, Math.ceil((result.retryAfter ?? MINUTE) / 1_000));
    fail("RATE_LIMITED", `retry after ${retryAfterSeconds} seconds`);
  }
}
