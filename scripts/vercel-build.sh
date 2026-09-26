#!/bin/sh
set -eu

case "${VERCEL_ENV:-}" in
  preview)
    convex_key_type=UNKNOWN
    clerk_publishable_type=UNKNOWN
    clerk_secret_type=UNKNOWN

    case "${CONVEX_DEPLOY_KEY:-}" in
      preview:*) convex_key_type=PREVIEW ;;
      prod:*) convex_key_type=PRODUCTION ;;
    esac
    case "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" in
      pk_test_*) clerk_publishable_type=DEVELOPMENT ;;
      pk_live_*) clerk_publishable_type=PRODUCTION ;;
    esac
    case "${CLERK_SECRET_KEY:-}" in
      sk_test_*) clerk_secret_type=DEVELOPMENT ;;
      sk_live_*) clerk_secret_type=PRODUCTION ;;
    esac

    printf '%s\n' \
      'VERCEL_ENV=preview' \
      "CONVEX_KEY_TYPE=$convex_key_type" \
      "CLERK_PUBLISHABLE_TYPE=$clerk_publishable_type" \
      "CLERK_SECRET_TYPE=$clerk_secret_type"

    if [ "$convex_key_type" != PREVIEW ] ||
      [ "$clerk_publishable_type" != DEVELOPMENT ] ||
      [ "$clerk_secret_type" != DEVELOPMENT ]; then
      printf '%s\n' 'CREDENTIAL_GATE=FAIL' >&2
      exit 1
    fi
    printf '%s\n' 'CREDENTIAL_GATE=PASS'
    ;;
  production)
    printf '%s\n' 'VERCEL_ENV=production'
    printf '%s' "$CLERK_JWT_ISSUER_DOMAIN" | npx convex env set --prod CLERK_JWT_ISSUER_DOMAIN
    printf '%s' "$CLERK_SECRET_KEY" | npx convex env set --prod CLERK_SECRET_KEY
    ;;
  *)
    printf '%s\n' 'VERCEL_ENV=UNKNOWN' 'CREDENTIAL_GATE=FAIL' >&2
    exit 1
    ;;
esac

npx convex deploy --cmd-url-env-var-name NEXT_PUBLIC_CONVEX_URL --cmd "npm run build"
