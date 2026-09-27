#!/bin/sh
set -eu

fail() {
  printf '%s\n' 'TARGET_GUARD=FAIL' "$1" >&2
  exit 1
}

[ "${MODE:-}" = active ] || fail 'MODE must be active.'
[ -n "${TARGET:-}" ] || fail 'TARGET host is required.'

target=$(printf '%s' "$TARGET" | tr '[:upper:]' '[:lower:]')
case "$target" in
  *[!a-z0-9.-]*|.*|*.|*..*) fail 'TARGET must be a hostname without URL, path, port, or whitespace.' ;;
  blessingforgood.com|www.blessingforgood.com|*.blessingforgood.com)
    fail 'Production host is forbidden for active security testing.'
    ;;
esac

approved=0
case ",${APPROVED_PREVIEW_HOSTS:-}," in
  *",$target,"*) approved=1 ;;
esac
if [ -n "${APPROVED_PREVIEW_HOST_PATTERN:-}" ]; then
  case "$target" in
    $APPROVED_PREVIEW_HOST_PATTERN) approved=1 ;;
  esac
fi
[ "$approved" -eq 1 ] || fail 'TARGET does not match an explicitly approved Preview host or pattern.'

printf '%s\n' 'TARGET_GUARD=PASS'
