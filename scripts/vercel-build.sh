#!/bin/sh
set -eu

case "${SECURITY_STAGING_MODE:-}" in
  convex-dev)
    clerk_publishable_type=UNKNOWN
    clerk_secret_type=UNKNOWN
    convex_target_type=UNKNOWN
    convex_target_reference=UNKNOWN
    convex_target_deployment=UNKNOWN

    case "${NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY:-}" in
      pk_test_*) clerk_publishable_type=DEVELOPMENT ;;
      pk_live_*) clerk_publishable_type=PRODUCTION ;;
    esac
    case "${CLERK_SECRET_KEY:-}" in
      sk_test_*) clerk_secret_type=DEVELOPMENT ;;
      sk_live_*) clerk_secret_type=PRODUCTION ;;
    esac
    case "${CONVEX_TARGET_REFERENCE:-}" in
      dev/*) convex_target_reference=$CONVEX_TARGET_REFERENCE ;;
    esac
    case "${CONVEX_TARGET_DEPLOYMENT:-}" in
      "") ;;
      *) convex_target_deployment=$CONVEX_TARGET_DEPLOYMENT ;;
    esac
    if [ "${CONVEX_TARGET_TYPE:-}" = DEVELOPMENT ] &&
      [ "$convex_target_reference" != UNKNOWN ] &&
      [ "$convex_target_deployment" != UNKNOWN ]; then
      convex_target_type=DEVELOPMENT
    fi

    printf '%s\n' \
      "VERCEL_ENV=${VERCEL_ENV:-UNKNOWN}" \
      'SECURITY_STAGING_MODE=convex-dev' \
      "CLERK_PUBLISHABLE_TYPE=$clerk_publishable_type" \
      "CLERK_SECRET_TYPE=$clerk_secret_type" \
      "CONVEX_TARGET_TYPE=$convex_target_type" \
      "CONVEX_TARGET_REFERENCE=$convex_target_reference" \
      "CONVEX_TARGET_DEPLOYMENT=$convex_target_deployment" \
      'CONVEX_DEPLOY_COMMAND=DISABLED'

    if [ "${VERCEL_ENV:-}" != preview ] ||
      [ "$clerk_publishable_type" != DEVELOPMENT ] ||
      [ "$clerk_secret_type" != DEVELOPMENT ] ||
      [ "$convex_target_type" != DEVELOPMENT ]; then
      printf '%s\n' 'CREDENTIAL_GATE=FAIL' >&2
      exit 1
    fi
    case "${NEXT_PUBLIC_CONVEX_URL:-}" in
      "https://${convex_target_deployment}.convex.cloud") ;;
      *)
        printf '%s\n' 'CONVEX_URL_TYPE=INVALID' 'CREDENTIAL_GATE=FAIL' >&2
        exit 1
        ;;
    esac
    case "${NEXT_PUBLIC_CONVEX_SITE_URL:-}" in
      "https://${convex_target_deployment}.convex.site") ;;
      *)
        printf '%s\n' 'CONVEX_SITE_URL_TYPE=INVALID' 'CREDENTIAL_GATE=FAIL' >&2
        exit 1
        ;;
    esac
    printf '%s\n' \
      'CONVEX_URL_TYPE=DEVELOPMENT' \
      'CONVEX_SITE_URL_TYPE=DEVELOPMENT' \
      'CREDENTIAL_GATE=PASS'
    unset CONVEX_DEPLOY_KEY
    npm run build
    exit 0
    ;;
  convex-preview|"") ;;
  *)
    printf '%s\n' 'CREDENTIAL_GATE=FAIL' >&2
    exit 1
    ;;
esac

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
    if [ -n "${SECURITY_STAGING_MODE:-}" ]; then
      printf '%s\n' 'CREDENTIAL_GATE=FAIL' >&2
      exit 1
    fi
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
