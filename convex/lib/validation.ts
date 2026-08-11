import { fail } from "./errors";

export function requiredText(value: string, field: string): string {
  const normalized = value.trim();
  if (!normalized) fail("VALIDATION_FAILED", `${field} is required`);
  return normalized;
}

export function slugify(value: string, field: string): string {
  const slug = requiredText(value, field)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  if (!slug) fail("VALIDATION_FAILED", `${field} is invalid`);
  return slug;
}

export function nonNegativeMoney(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) fail("VALIDATION_FAILED", "money must be a non-negative integer");
  return value;
}

export function positiveMoney(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1) fail("VALIDATION_FAILED", "price must be a positive integer");
  return value;
}

export function nonNegativeQuantity(value: number): number {
  if (!Number.isSafeInteger(value) || value < 0) fail("INVALID_STOCK_QUANTITY");
  return value;
}

export function normalizedCategories(values: string[]): string[] {
  const categories = [...new Set(values.map((value) => value.trim()).filter(Boolean))];
  if (categories.length > 12 || categories.some((value) => value.length > 60)) {
    fail("VALIDATION_FAILED", "categories are invalid");
  }
  return categories;
}

export function positiveQuantity(value: number): number {
  if (!Number.isSafeInteger(value) || value < 1 || value > 1000) fail("INVALID_QUANTITY");
  return value;
}
