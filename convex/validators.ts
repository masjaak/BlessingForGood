import { v } from "convex/values";

export const bookFormatValidator = v.union(v.literal("BB"), v.literal("PB"), v.literal("HB"));
export const sessionTokenValidator = v.string();
export const paginationValidator = v.object({
  numItems: v.number(),
  cursor: v.union(v.string(), v.null()),
});

export function assertSafeInteger(value: number, message: string): void {
  if (!Number.isSafeInteger(value)) throw new Error(message);
}
