export function isPrototypeMode(env: Record<string, string | undefined>): boolean {
  return env.NODE_ENV === "development" && env.NEXT_PUBLIC_BFG_PROTOTYPE_MODE === "true";
}
