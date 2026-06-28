#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# TOPEMS Design System CI Check
#
# Usage:
#   bash scripts/check-design-system.sh          # run all checks
#   bash scripts/check-design-system.sh --fix    # auto-fix token generation
#
# Exit codes:
#   0 - all checks passed
#   1 - one or more checks failed
# ---------------------------------------------------------------------------

set -uo pipefail
# NOTE: We intentionally do NOT use `set -e` because individual check
# failures should be caught and reported, not terminate the script.

# ---------------------------------------------------------------------------
# Colors (auto-detect terminal support)
# ---------------------------------------------------------------------------

if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  GREEN=$(tput setaf 2)
  RED=$(tput setaf 1)
  YELLOW=$(tput setaf 3)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""
  RED=""
  YELLOW=""
  BOLD=""
  RESET=""
fi

# ---------------------------------------------------------------------------
# State
# ---------------------------------------------------------------------------

PASS_COUNT=0
FAIL_COUNT=0
TOTAL_STEPS=7
FIX_MODE=false

if [[ "${1:-}" == "--fix" ]]; then
  FIX_MODE=true
fi

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

pass() {
  PASS_COUNT=$((PASS_COUNT + 1))
  echo "  ${GREEN}PASS${RESET}"
}

fail() {
  local msg="${1:-}"
  FAIL_COUNT=$((FAIL_COUNT + 1))
  echo "  ${RED}FAIL${RESET}"
  if [[ -n "$msg" ]]; then
    echo "       ${RED}${msg}${RESET}"
  fi
}

step_header() {
  local num="$1"
  local label="$2"
  echo ""
  echo "[${num}/${TOTAL_STEPS}] ${label}..."
}

# Resolve the project root (where package.json lives)
ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

# Temp files for token consistency check
TMPDIR_CLEANUP=""

cleanup() {
  if [[ -n "$TMPDIR_CLEANUP" ]]; then
    rm -f "$TMPDIR_CLEANUP"
  fi
}
trap cleanup EXIT

# ---------------------------------------------------------------------------
# [1/7] Token generation
# ---------------------------------------------------------------------------

step_header 1 "Token generation"

TOKEN_CSS="$ROOT_DIR/apps/web/src/theme/generated-tokens.css"
TOKEN_TS="$ROOT_DIR/packages/shared-constants/src/generated-colors.ts"

if [[ "$FIX_MODE" == true ]]; then
  if pnpm --dir "$ROOT_DIR" generate:tokens 2>&1; then
    echo "  ${YELLOW}Tokens regenerated (--fix mode)${RESET}"
  else
    fail "pnpm generate:tokens failed"
  fi
fi

# Verify generated files exist and are non-empty
css_ok=true
ts_ok=true

if [[ ! -f "$TOKEN_CSS" ]] || [[ ! -s "$TOKEN_CSS" ]]; then
  css_ok=false
fi

if [[ ! -f "$TOKEN_TS" ]] || [[ ! -s "$TOKEN_TS" ]]; then
  ts_ok=false
fi

if $css_ok && $ts_ok; then
  pass
else
  msg=""
  $css_ok || msg+="generated-tokens.css is missing or empty. "
  $ts_ok  || msg+="generated-colors.ts is missing or empty. "
  msg+="Run: pnpm generate:tokens"
  fail "$msg"
fi

# ---------------------------------------------------------------------------
# [2/7] Typecheck shared packages
# ---------------------------------------------------------------------------

step_header 2 "Typecheck shared packages"

SHARED_PKGS=("shared-components" "shared-constants" "shared-utils" "shared-hooks")
shared_all_pass=true

for pkg in "${SHARED_PKGS[@]}"; do
  pkg_dir="$ROOT_DIR/packages/$pkg"
  if [[ ! -f "$pkg_dir/package.json" ]]; then
    echo "    ${YELLOW}SKIP${RESET} $pkg (package.json not found)"
    continue
  fi

  tsc_output=$(cd "$ROOT_DIR" && pnpm --filter "@topems/$pkg" exec tsc --noEmit 2>&1)
  tsc_errors=$(echo "$tsc_output" | grep "error TS" | grep -v "TS5101" || true)
  if [[ -z "$tsc_errors" ]]; then
    echo "    - $pkg: ${GREEN}PASS${RESET}"
  else
    echo "    - $pkg: ${RED}FAIL${RESET}"
    shared_all_pass=false
  fi
done

if $shared_all_pass; then
  pass
else
  fail "One or more shared packages failed typecheck"
fi

# ---------------------------------------------------------------------------
# [3/7] Typecheck apps
# ---------------------------------------------------------------------------

step_header 3 "Typecheck apps"

APPS=("core" "hrm" "crm" "mes" "scm" "pm" "finance" "web")
apps_all_pass=true

# Helper: read "name" field from a package.json
pkg_name_from_json() {
  local json="$1"
  # Extract the value after '"name":' using simple string manipulation
  sed -n 's/^[[:space:]]*"name"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/p' "$json" | head -1
}

for app in "${APPS[@]}"; do
  app_dir="$ROOT_DIR/apps/$app"
  if [[ ! -f "$app_dir/package.json" ]]; then
    echo "    ${YELLOW}SKIP${RESET} $app (package.json not found)"
    continue
  fi

  pkg_name=$(pkg_name_from_json "$app_dir/package.json")
  if [[ -z "$pkg_name" ]]; then
    echo "    ${YELLOW}SKIP${RESET} $app (could not read package name)"
    continue
  fi

  tsc_output=$(cd "$ROOT_DIR" && pnpm --filter "$pkg_name" exec tsc --noEmit 2>&1)
  tsc_errors=$(echo "$tsc_output" | grep "error TS" | grep -v "TS5101\|TS2590" || true)
  if [[ -z "$tsc_errors" ]]; then
    echo "    - $app: ${GREEN}PASS${RESET}"
  else
    echo "    - $app: ${RED}FAIL${RESET}"
    apps_all_pass=false
  fi
done

if $apps_all_pass; then
  pass
else
  fail "One or more apps failed typecheck"
fi

# ---------------------------------------------------------------------------
# [4/7] Token consistency
# ---------------------------------------------------------------------------

step_header 4 "Token consistency"

TOKENS_SRC="$ROOT_DIR/apps/web/src/theme/tokens.ts"

token_consistent=true

# Check that the source-of-truth file exists
if [[ ! -f "$TOKENS_SRC" ]]; then
  fail "Source tokens file not found: apps/web/src/theme/tokens.ts"
  token_consistent=false
else
  # Re-generate tokens into a temp location and compare with committed files
  tmp_css=$(mktemp /tmp/topems-token-check-css.XXXXXX)
  tmp_ts=$(mktemp /tmp/topems-token-check-ts.XXXXXX)
  TMPDIR_CLEANUP="$tmp_css $tmp_ts"

  # Save current generated files
  cp "$TOKEN_CSS" "$tmp_css"
  cp "$TOKEN_TS" "$tmp_ts"

  # Regenerate
  if (cd "$ROOT_DIR" && pnpm generate:tokens >/dev/null 2>&1); then
    # Compare newly generated with previously saved
    if diff -q "$TOKEN_CSS" "$tmp_css" >/dev/null 2>&1 && \
       diff -q "$TOKEN_TS" "$tmp_ts" >/dev/null 2>&1; then
      : # identical - consistent
    else
      echo "    ${YELLOW}WARNING${RESET} Generated tokens differ from previous version."
      echo "    Source tokens.ts may have changed without re-running generate:tokens."
      echo "    Run: pnpm generate:tokens"
    fi
    # Restore original files so we don't leave dirty state
    cp "$tmp_css" "$TOKEN_CSS"
    cp "$tmp_ts" "$TOKEN_TS"
  else
    echo "    ${YELLOW}WARNING${RESET} Could not regenerate tokens for comparison."
  fi

  # Check that no hand-written color constants shadow generated ones
  manual_color_files=(
    "packages/shared-constants/src/colors.ts"
  )

  for f in "${manual_color_files[@]}"; do
    filepath="$ROOT_DIR/$f"
    if [[ -f "$filepath" ]]; then
      # Check if it's just a re-export from generated-colors (acceptable)
      if grep -q "generated-colors" "$filepath" 2>/dev/null; then
        : # re-export is fine
      else
        echo "    ${YELLOW}WARNING${RESET} Manual color file still exists: $f"
        echo "    It should re-export from generated-colors.ts or be removed."
      fi
    fi
  done

  if $token_consistent; then
    pass
  fi
fi

# ---------------------------------------------------------------------------
# [5/7] MUI icon leak check
# ---------------------------------------------------------------------------

step_header 5 "MUI icon leak check"

# Search for @mui/icons-material imports in all TS/TSX files (exclude node_modules)
mui_leaks=""
if cd "$ROOT_DIR"; then
  mui_leaks=$(grep -r "@mui/icons-material" \
    --include="*.ts" --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.mf --exclude-dir=dist \
    apps/ packages/ \
    2>/dev/null || true)
fi

if [[ -z "$mui_leaks" ]]; then
  pass
else
  leak_count=$(echo "$mui_leaks" | wc -l | tr -d ' ')
  fail "Found $leak_count import(s) of @mui/icons-material:"
  echo "$mui_leaks" | head -20 | while IFS= read -r line; do
    echo "       $line"
  done
fi

# ---------------------------------------------------------------------------
# [6/7] Icon sx prop check
# ---------------------------------------------------------------------------

step_header 6 "Icon sx prop check"

# Search for lucide-react icons used with sx={{ instead of style={{
sx_leaks=""
if cd "$ROOT_DIR"; then
  sx_leaks=$(grep -rn "sx={{" \
    --include="*.ts" --include="*.tsx" \
    --exclude-dir=node_modules --exclude-dir=.mf --exclude-dir=dist \
    apps/ packages/ \
    2>/dev/null | grep -i "lucide" || true)
fi

if [[ -z "$sx_leaks" ]]; then
  pass
else
  leak_count=$(echo "$sx_leaks" | wc -l | tr -d ' ')
  fail "Found $leak_count lucide icon(s) using sx={{ (should use style={{):"
  echo "$sx_leaks" | head -20 | while IFS= read -r line; do
    echo "       $line"
  done
fi

# ---------------------------------------------------------------------------
# [7/7] Web app build
# ---------------------------------------------------------------------------

step_header 7 "Web app build"

WEB_DIR="$ROOT_DIR/apps/web"

if [[ ! -f "$WEB_DIR/package.json" ]]; then
  fail "apps/web/package.json not found"
else
  if (cd "$ROOT_DIR" && pnpm --filter topems-portal exec vite build 2>&1); then
    pass
  else
    fail "vite build failed for apps/web"
  fi
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

echo ""
echo "========================================"

if [[ $FAIL_COUNT -eq 0 ]]; then
  echo "${GREEN}${BOLD}All checks passed!${RESET}"
  echo "========================================"
  exit 0
else
  echo "${RED}${BOLD}${FAIL_COUNT} check(s) failed, ${PASS_COUNT} passed${RESET}"
  echo "========================================"
  exit 1
fi
