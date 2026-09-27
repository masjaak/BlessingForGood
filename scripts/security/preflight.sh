#!/bin/sh
set -u

ROOT=$(CDPATH= cd -- "$(dirname -- "$0")/../.." && pwd)
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

has_node() { command -v node >/dev/null 2>&1; }
has_npm() { command -v npm >/dev/null 2>&1; }
has_git() { command -v git >/dev/null 2>&1; }
has_playwright() { [ -x node_modules/.bin/playwright ]; }
has_nuclei() { command -v "${NUCLEI_BIN:-nuclei}" >/dev/null 2>&1 || [ -x "${NUCLEI_BIN:-/nonexistent}" ]; }
has_zap() {
  [ -x "${ZAP_BIN:-/nonexistent}" ] || command -v zap.sh >/dev/null 2>&1 ||
    command -v zap >/dev/null 2>&1 ||
    { command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; }
}
has_vercel() {
  [ -x "${VERCEL_BIN:-/nonexistent}" ] || command -v vercel >/dev/null 2>&1 || [ -x node_modules/.bin/vercel ]
}
has_convex() {
  [ -x "${CONVEX_BIN:-/nonexistent}" ] || command -v convex >/dev/null 2>&1 || [ -x node_modules/.bin/convex ]
}

check NODE has_node
check NPM has_npm
check GIT has_git
check PLAYWRIGHT has_playwright
check NUCLEI has_nuclei
check ZAP has_zap
check VERCEL has_vercel
check CONVEX has_convex

exit "$missing"
