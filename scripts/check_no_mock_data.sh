#!/usr/bin/env bash
# Fails if demo / mock / hard-coded sample data appears in application code (tests are excluded).
# Configuration data lives only in backend/app/load_catalog.py and is allowed.
set -uo pipefail
cd "$(dirname "$0")/.."

SCAN=(backend/app frontend/src)
EXCLUDE=(--exclude-dir=node_modules --exclude-dir=tests --exclude-dir=__pycache__ --exclude=load_catalog.py)
fail=0

check() {
  local label="$1" pattern="$2"; shift 2
  local hits
  hits=$(grep -rnIE ${CASE_FLAG:--i} "${EXCLUDE[@]}" "$pattern" "$@" 2>/dev/null | grep -v "mock-check: allow" | grep -vE "@(example|company)\.com")
  if [ -n "$hits" ]; then
    echo "✗ $label"
    echo "$hits" | sed 's/^/    /'
    fail=1
  else
    echo "✓ $label"
  fi
}

check "mock libraries (faker, msw, json-server, lorem)" '(faker|@faker-js|\bmsw\b|json-server|lorem ipsum|\blorem\b)' "${SCAN[@]}"
check "demo / mock / dummy / fixture markers" '\b(demo|mock|dummy|fixtures?)(_[a-z_]*|s|data|users?|tokens?)?\b' "${SCAN[@]}"
check "hard-coded demo login tokens" '(admin|sales|tech|warehouse|customer)_uid' "${SCAN[@]}"
check "seed scripts" '\bseed(_users)?\.py\b|run_seed|AUTO_SEED' "${SCAN[@]}" backend/docker-entrypoint.sh docker-compose.yml
check "hard-coded emails in pages/components" "['\"][a-z0-9._%+-]+@[a-z0-9.-]+\.(com|in|local)['\"]" frontend/src
check "hard-coded phone numbers" '\+91[ -]?[6-9][0-9]{4}' "${SCAN[@]}"
check "hard-coded rupee amounts in pages" '₹ ?[0-9]{1,3}(,[0-9]{2,3})+' frontend/src/pages
CASE_FLAG=-s check "hard-coded sample records in pages" '^\s*(grossPrice|netPrice|price|amount|email|phone|serial[A-Za-z]*|customer[A-Z][A-Za-z]*|bill[A-Z][a-z]+|revenue|profit): *([0-9]|'"'"'[^'"'"']|"[^"])' frontend/src/pages
CASE_FLAG=-s check "pre-filled sample text in form state" "^\s+(notes|remarks|shade_notes|resolution_notes|lost_reason): '[^']{3,}',?\s*$" frontend/src/pages
CASE_FLAG=-s check "pre-filled codes / serials in state" "useState(<[^>]*>)?\('[A-Z]{2,}-[A-Z0-9-]*[0-9]{3,}" frontend/src
check "fallback demo people / options" "(Amit Verma|Rajesh Singhania|Rohan Sharma|Deepak Kumar|Vikram Malhotra)" "${SCAN[@]}"

if [ $fail -ne 0 ]; then
  echo; echo "Mock/demo data check FAILED"; exit 1
fi
echo; echo "Mock/demo data check passed"
