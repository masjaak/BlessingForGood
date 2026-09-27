#!/bin/sh
set -u

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$ROOT"
missing=0

check() {
  name=$1
  if "$2"; then
    printf '%s=READY\n' "$name"
  else
    printf '%s=MISSING\n' "$name"
    missing=1
  fi
}

run_vercel() {
  if [ -n "${VERCEL_BIN:-}" ]; then
    "$VERCEL_BIN" "$@"
  elif command -v vercel >/dev/null 2>&1; then
    vercel "$@"
  elif command -v vc >/dev/null 2>&1; then
    vc "$@"
  elif [ -x node_modules/.bin/vercel ]; then
    node_modules/.bin/vercel "$@"
  else
    return 127
  fi
}

has_node() { command -v node >/dev/null 2>&1; }
has_npm() { command -v npm >/dev/null 2>&1; }
has_git() { command -v git >/dev/null 2>&1; }
has_playwright() { [ -x node_modules/.bin/playwright ]; }
has_nuclei() {
  command -v "${NUCLEI_BIN:-nuclei}" >/dev/null 2>&1 ||
    [ -x "${NUCLEI_BIN:-/nonexistent}" ]
}
has_zap() {
  [ -x "${ZAP_BIN:-/nonexistent}" ] || command -v zap.sh >/dev/null 2>&1 ||
    command -v zap >/dev/null 2>&1 ||
    { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }
}
has_vercel() {
  [ -n "${VERCEL_BIN:-}" ] && [ -x "$VERCEL_BIN" ] && return 0
  command -v vercel >/dev/null 2>&1 || command -v vc >/dev/null 2>&1 ||
    [ -x node_modules/.bin/vercel ]
}
has_convex() {
  [ -x "${CONVEX_BIN:-/nonexistent}" ] || command -v convex >/dev/null 2>&1 ||
    [ -x node_modules/.bin/convex ]
}

has_vercel_automation() {
  [ -n "${VERCEL_AUTOMATION_BYPASS_SECRET:-}" ] &&
    run_vercel whoami >/dev/null 2>&1
}

has_preview() {
  [ -n "${BFG_E2E_BASE_URL:-}" ] || return 1
  origin=$(node -e '
    const u = new URL(process.argv[1]);
    if (u.protocol !== "https:" || u.username || u.password ||
        u.pathname !== "/" || u.search || u.hash) process.exit(1);
    process.stdout.write(u.origin);
  ' "$BFG_E2E_BASE_URL") || return 1
  host=${origin#https://}
  MODE=active TARGET="$host" APPROVED_PREVIEW_HOSTS="${APPROVED_PREVIEW_HOSTS:-}" \
    APPROVED_PREVIEW_HOST_PATTERN="${APPROVED_PREVIEW_HOST_PATTERN:-}" \
    "$SCRIPT_DIR/target-guard.sh" >/dev/null 2>&1 || return 1
  status=$(run_vercel curl "$origin/ready-stock" --deployment "$origin" -- \
    --silent --output /dev/null --write-out '%{http_code}' 2>/dev/null) || return 1
  [ "$status" = 200 ]
}

has_test_identities() {
  [ -n "${CLERK_TESTING_TOKEN:-}" ] &&
    [ -n "${BFG_E2E_CUSTOMER_EMAIL:-}" ] &&
    [ -n "${BFG_E2E_OWNER_EMAIL:-}" ] &&
    [ "${BFG_SECURITY_CONTEXT_VERIFIED:-}" = preview-clerk-dev-convex-dev ]
}

has_disabled_side_effects() {
  [ "${BFG_EXTERNAL_FINANCIAL_SIDE_EFFECTS:-}" = disabled ] &&
    [ "${BFG_EXTERNAL_EMAIL_SIDE_EFFECTS:-}" = disabled ] &&
    [ "${BFG_EXTERNAL_WEBHOOK_SIDE_EFFECTS:-}" = disabled ]
}

preview_scope_metadata() {
  project_id=${VERCEL_PROJECT_ID:-}
  team_id=${VERCEL_ORG_ID:-}
  if [ -f .vercel/project.json ]; then
    [ -n "$project_id" ] || project_id=$(node -p 'require("./.vercel/project.json").projectId || ""')
    [ -n "$team_id" ] || team_id=$(node -p 'require("./.vercel/project.json").orgId || ""')
  fi
  if [ -z "$project_id" ] || [ -z "$team_id" ]; then
    printf '%s\n' 'CLERK_DEVELOPMENT_CONFIG=MISSING' \
      'CONVEX_DEVELOPMENT_CONFIG=MISSING' 'PREVIEW_ENV_CONFIG=MISSING' \
      'RELEASE_PREVIEW_CAPABLE=NO'
    return 1
  fi
  run_vercel api "/v9/projects/$project_id/env?decrypt=false" --scope "$team_id" 2>/dev/null |
    node -e '
      let raw = "";
      process.stdin.on("data", (part) => raw += part).on("end", () => {
        let vars;
        try {
          const data = JSON.parse(raw);
          vars = Array.isArray(data) ? data : data.envs || data.variables || data.data;
          if (!Array.isArray(vars)) throw new Error();
        } catch {
          console.log("CLERK_DEVELOPMENT_CONFIG=MISSING");
          console.log("CONVEX_DEVELOPMENT_CONFIG=MISSING");
          console.log("PREVIEW_ENV_CONFIG=MISSING");
          console.log("RELEASE_PREVIEW_CAPABLE=NO");
          process.exitCode = 1;
          return;
        }
        const ready = (keys) => keys.every((key) => {
          const matches = vars.filter((entry) => entry.key === key &&
            Array.isArray(entry.target) && entry.target.includes("preview"));
          return matches.length === 1 && matches[0].target.length === 1 &&
            matches[0].target[0] === "preview" && !matches[0].gitBranch &&
            typeof matches[0].type === "string";
        });
        const clerk = ready(["CLERK_SECRET_KEY", "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"]);
        const convex = ready(["NEXT_PUBLIC_CONVEX_URL", "NEXT_PUBLIC_CONVEX_SITE_URL",
          "CONVEX_TARGET_TYPE", "CONVEX_TARGET_REFERENCE", "CONVEX_TARGET_DEPLOYMENT",
          "SECURITY_STAGING_MODE"]);
        const all = clerk && convex;
        console.log("CLERK_DEVELOPMENT_CONFIG=" + (clerk ? "READY" : "MISSING"));
        console.log("CONVEX_DEVELOPMENT_CONFIG=" + (convex ? "READY" : "MISSING"));
        console.log("PREVIEW_ENV_CONFIG=" + (all ? "READY" : "MISSING"));
        console.log("RELEASE_PREVIEW_CAPABLE=" + (all ? "YES" : "NO"));
        if (!all) process.exitCode = 1;
      });
    '
}

production_scan_blocked() {
  if MODE=active TARGET=www.blessingforgood.com \
    APPROVED_PREVIEW_HOSTS=www.blessingforgood.com \
    "$SCRIPT_DIR/target-guard.sh" >/dev/null 2>&1; then
    return 1
  fi
}

check NODE has_node
check NPM has_npm
check GIT has_git
check PLAYWRIGHT has_playwright
check NUCLEI has_nuclei
check ZAP has_zap
check VERCEL has_vercel
check CONVEX has_convex
check VERCEL_AUTOMATION_ACCESS has_vercel_automation
check PREVIEW_AVAILABLE has_preview
check TEST_IDENTITIES has_test_identities
check EXTERNAL_SIDE_EFFECTS_DISABLED has_disabled_side_effects
if preview_scope_metadata; then
  :
else
  missing=1
fi
if production_scan_blocked; then
  printf '%s\n' 'ACTIVE_SCAN_PRODUCTION=BLOCKED'
else
  printf '%s\n' 'ACTIVE_SCAN_PRODUCTION=ALLOWED'
  missing=1
fi

if [ "$missing" -eq 0 ]; then
  printf '%s\n' 'PREFLIGHT=PASS'
else
  printf '%s\n' 'PREFLIGHT=FAIL'
fi
exit "$missing"
