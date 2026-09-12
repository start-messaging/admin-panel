#!/usr/bin/env bash
#
# Production release for this Cloudflare Worker.
#
# This exists because both obvious commands are traps. Vite inlines the API base
# URL at build time, and `dist/` is simply whatever the last build left there:
#
#   - `npm run build && wrangler deploy` ships a bundle built from `.env`, which
#     points at localhost.
#   - a bare `wrangler deploy` ships whatever is already in `dist/` — and
#     `npm run build:e2e`, which the Playwright suite runs, leaves a bundle there
#     pointing at localhost:3020.
#
# The second one has already put a localhost bundle on production once: the e2e
# suite was run, then `wrangler deploy`, and the live panel spent several minutes
# calling an API on the operator's laptop. Nothing failed loudly, because a
# wrong-but-valid URL is not a build error.
#
# So the environment is required explicitly, the build is done from scratch, and
# the bundle is asserted against before anything is uploaded. The staging
# workflow has had this check since it was written; production had no equivalent
# only because its deploy was never automated.
set -euo pipefail

: "${VITE_API_BASE_URL:?set VITE_API_BASE_URL=https://api.startmessaging.com}"
: "${VITE_GOOGLE_CLIENT_ID:?set VITE_GOOGLE_CLIENT_ID}"
: "${VITE_SENTRY_DSN:?set VITE_SENTRY_DSN}"

fail() { printf 'REFUSING TO DEPLOY: %s\n' "$1" >&2; exit 1; }

# From scratch: a stale asset left in dist/ is uploaded alongside the new one.
rm -rf dist
npm run build

bundle=$(ls dist/assets/index-*.js)

if ! grep -q 'https://api\.startmessaging\.com' "$bundle"; then
  fail "bundle does not reference the production API — the environment did not apply"
fi
# Anchored on a port, because a bare "localhost" appears inside dependencies.
if grep -Eq 'localhost:[0-9]{4}' "$bundle"; then
  fail "bundle references a localhost port — this is a dev or e2e build"
fi
if grep -q 'stage-api\.startmessaging\.com' "$bundle"; then
  fail "bundle references the staging API"
fi

printf 'bundle %s passed the production checks\n' "$bundle"
npx wrangler deploy
