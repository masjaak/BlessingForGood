type Environment = Record<string, string | undefined>;

export function isPreviewDemoMode(env: Environment, isPreviewEnvironment: boolean): boolean {
  return isPreviewEnvironment && env.NEXT_PUBLIC_BFG_PREVIEW_DEMO_MODE === "true";
}

export function isPrototypeMode(env: Environment, isPreviewEnvironment = false): boolean {
  return (
    (env.NODE_ENV === "development" && env.NEXT_PUBLIC_BFG_PROTOTYPE_MODE === "true") ||
    isPreviewDemoMode(env, isPreviewEnvironment)
  );
}
