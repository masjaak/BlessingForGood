#!/bin/sh
set -eu

SCRIPT_DIR=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
ROOT=$(CDPATH= cd -- "$SCRIPT_DIR/../.." && pwd)
cd "$ROOT"
mode=${MODE:-local}

fail() {
  printf '%s\n' "SECURITY_REGRESSION=FAIL: $1" >&2
  exit 1
}

require_env() {
  eval "value=\${$1:-}"
  [ -n "$value" ] || fail "required input $1 is missing"
}

check_guard() {
  if MODE=active TARGET=www.blessingforgood.com \
    APPROVED_PREVIEW_HOSTS=www.blessingforgood.com "$SCRIPT_DIR/target-guard.sh" >/dev/null 2>&1; then
    fail 'target guard accepted the Production host'
  fi
  MODE=active TARGET=bfg-preview-fixture.vercel.app \
    APPROVED_PREVIEW_HOSTS=bfg-preview-fixture.vercel.app "$SCRIPT_DIR/target-guard.sh" >/dev/null
  MODE=active TARGET=bfg-preview-branch-fixture.vercel.app \
    APPROVED_PREVIEW_HOST_PATTERN='bfg-preview-*.vercel.app' "$SCRIPT_DIR/target-guard.sh" >/dev/null

  if (
    VERCEL_ENV=preview \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_live_fixture \
    CLERK_SECRET_KEY=sk_test_fixture \
    CONVEX_TARGET_TYPE=DEVELOPMENT \
    CONVEX_TARGET_REFERENCE=dev/security-fixture \
    CONVEX_TARGET_DEPLOYMENT=bfg-dev-fixture \
    NEXT_PUBLIC_CONVEX_URL=https://bfg-dev-fixture.convex.cloud \
    NEXT_PUBLIC_CONVEX_SITE_URL=https://bfg-dev-fixture.convex.site \
    development_context
  ); then
    fail 'environment guard accepted a Production Clerk key'
  fi
  (
    VERCEL_ENV=preview \
    NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_fixture \
    CLERK_SECRET_KEY=sk_test_fixture \
    CONVEX_TARGET_TYPE=DEVELOPMENT \
    CONVEX_TARGET_REFERENCE=dev/security-fixture \
    CONVEX_TARGET_DEPLOYMENT=bfg-dev-fixture \
    NEXT_PUBLIC_CONVEX_URL=https://bfg-dev-fixture.convex.cloud \
    NEXT_PUBLIC_CONVEX_SITE_URL=https://bfg-dev-fixture.convex.site \
    development_context
  ) || fail 'environment guard rejected the non-production fixture'
}

development_context() {
  [ "${VERCEL_ENV:-}" = preview ] || return 1
  case "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" in pk_test_*) ;; *) return 1 ;; esac
  case "${CLERK_SECRET_KEY:-}" in sk_test_*) ;; *) return 1 ;; esac
  [ "${CONVEX_TARGET_TYPE:-}" = DEVELOPMENT ] || return 1
  case "${CONVEX_TARGET_REFERENCE:-}" in dev/*) ;; *) return 1 ;; esac
  [ -n "${CONVEX_TARGET_DEPLOYMENT:-}" ] || return 1
  [ "${NEXT_PUBLIC_CONVEX_URL:-}" = "https://${CONVEX_TARGET_DEPLOYMENT}.convex.cloud" ] || return 1
  [ "${NEXT_PUBLIC_CONVEX_SITE_URL:-}" = "https://${CONVEX_TARGET_DEPLOYMENT}.convex.site" ] || return 1
  [ -z "${CONVEX_DEPLOY_KEY:-}" ]
}

case "$mode" in
  local)
    check_guard
    ;;
  active)
    require_env TARGET
    require_env BFG_E2E_BASE_URL
    require_env APPROVED_PREVIEW_HOSTS
    require_env VERCEL_AUTOMATION_BYPASS_SECRET
    require_env CLERK_TESTING_TOKEN
    require_env BFG_E2E_CUSTOMER_EMAIL
    require_env BFG_E2E_OWNER_EMAIL
    require_env BFG_SECURITY_CONTEXT_VERIFIED
    require_env BFG_EXTERNAL_FINANCIAL_SIDE_EFFECTS
    require_env BFG_EXTERNAL_EMAIL_SIDE_EFFECTS
    require_env BFG_EXTERNAL_WEBHOOK_SIDE_EFFECTS
    [ "$BFG_SECURITY_CONTEXT_VERIFIED" = preview-clerk-dev-convex-dev ] ||
      fail 'environment map is not verified as Preview + Clerk Development + Convex Development'
    development_context || fail 'Preview credentials or Convex target are not verified as Development'
    [ "$BFG_EXTERNAL_FINANCIAL_SIDE_EFFECTS" = disabled ] || fail 'financial side effects must be disabled'
    [ "$BFG_EXTERNAL_EMAIL_SIDE_EFFECTS" = disabled ] || fail 'email side effects must be disabled'
    [ "$BFG_EXTERNAL_WEBHOOK_SIDE_EFFECTS" = disabled ] || fail 'webhook side effects must be disabled'
    target_from_url=$(node -e 'const u = new URL(process.argv[1]); if (u.protocol !== "https:" || u.username || u.password || u.pathname !== "/" || u.search || u.hash) process.exit(1); process.stdout.write(u.hostname.toLowerCase())' "$BFG_E2E_BASE_URL") ||
      fail 'BFG_E2E_BASE_URL must be an HTTPS origin without credentials or path'
    [ "$(printf '%s' "$TARGET" | tr '[:upper:]' '[:lower:]')" = "$target_from_url" ] ||
      fail 'Playwright URL host does not match TARGET'
    MODE=active "$SCRIPT_DIR/target-guard.sh"
    ;;
  *)
    fail 'MODE must be local or active'
    ;;
esac

npm audit --audit-level=low
npm run test:run -- \
  convex/core.test.ts \
  convex/phase091-security.test.ts \
  convex/upload-http.test.ts \
  tests/config/vercel-build-guard.test.ts \
  tests/convex/auth-config.test.ts \
  tests/features/floating-blessy-position.test.ts \
  tests/security-headers.test.ts

if [ "$mode" = active ]; then
  export BFG_E2E_AUTH=true
  ./node_modules/.bin/playwright test \
    --config=playwright.security.config.ts \
    tests/e2e/smoke.spec.ts \
    tests/e2e/floating-blessy.spec.ts \
    tests/e2e/clerk-auth.spec.ts
fi

printf '%s\n' 'SECURITY_REGRESSION=PASS'
