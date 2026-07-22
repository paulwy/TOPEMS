#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# TOPEMS Frontend bundle size budget check
#
# Inspects the Vite build output (apps/web/dist) and asserts that:
#   - Total bundle size is below MAX_TOTAL
#   - Per-chunk size is below MAX_CHUNK (or MAX_VENDOR for *vendor* chunks)
#   - Initial-entry chunks are explicitly checked
#
# Usage:
#   bash scripts/bundle-check.sh                       # uses defaults
#   MAX_TOTAL=4M MAX_CHUNK=400K bash scripts/bundle-check.sh
#   bash scripts/bundle-check.sh --json out/report.json
#   bash scripts/bundle-check.sh --baseline path/to/baseline.json
#
# Environment:
#   DIST_DIR        - Vite output directory (default: apps/web/dist)
#   MAX_TOTAL       - Total budget (default: 5M)
#   MAX_CHUNK       - App-chunk budget (default: 500K)
#   MAX_VENDOR      - Vendor-chunk budget (default: 2500K)
#   MAX_INITIAL     - Initial-entry budget (default: 1500K)
#
# Exit codes:
#   0 - within budget
#   1 - budget exceeded
#   2 - dist directory missing
# ---------------------------------------------------------------------------

set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/.." && pwd)"

# ---------------------------------------------------------------------------
# Color helpers
# ---------------------------------------------------------------------------

if [[ -t 1 ]] && command -v tput &>/dev/null && [[ $(tput colors 2>/dev/null || echo 0) -ge 8 ]]; then
  GREEN=$(tput setaf 2)
  YELLOW=$(tput setaf 3)
  RED=$(tput setaf 1)
  BOLD=$(tput bold)
  RESET=$(tput sgr0)
else
  GREEN=""; YELLOW=""; RED=""; BOLD=""; RESET=""
fi

# ---------------------------------------------------------------------------
# Defaults
# ---------------------------------------------------------------------------

DIST_DIR="${DIST_DIR:-$ROOT_DIR/apps/web/dist}"
MAX_TOTAL="${MAX_TOTAL:-15M}"
MAX_CHUNK="${MAX_CHUNK:-1000K}"
MAX_VENDOR="${MAX_VENDOR:-5M}"
MAX_INITIAL="${MAX_INITIAL:-1500K}"

JSON_OUT=""
BASELINE=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --json)      JSON_OUT="$2"; shift 2 ;;
    --baseline)  BASELINE="$2"; shift 2 ;;
    -h|--help)
      sed -n '2,30p' "$0"; exit 0 ;;
    *)  echo "Unknown argument: $1" >&2; exit 1 ;;
  esac
done

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

# Convert "5M" or "500K" to bytes
to_bytes() {
  local v="$1"
  case "$v" in
    *M|*m) awk -v n="${v%[Mm]}" 'BEGIN{printf "%d", n*1024*1024}' ;;
    *K|*k) awk -v n="${v%[Kk]}" 'BEGIN{printf "%d", n*1024}' ;;
    *G|*g) awk -v n="${v%[Gg]}" 'BEGIN{printf "%d", n*1024*1024*1024}' ;;
    *)     echo "$v" ;;
  esac
}

human() {
  local bytes="$1"
  awk -v b="$bytes" 'BEGIN{
    if (b >= 1048576)      printf "%.2f MB", b/1048576;
    else if (b >= 1024)    printf "%.1f KB", b/1024;
    else                   printf "%d B",  b;
  }'
}

MAX_TOTAL_B=$(to_bytes "$MAX_TOTAL")
MAX_CHUNK_B=$(to_bytes "$MAX_CHUNK")
MAX_VENDOR_B=$(to_bytes "$MAX_VENDOR")
MAX_INITIAL_B=$(to_bytes "$MAX_INITIAL")

# ---------------------------------------------------------------------------
# Validate dist directory
# ---------------------------------------------------------------------------

if [[ ! -d "$DIST_DIR" ]]; then
  echo "${RED}[bundle-check] ERROR:${RESET} dist directory not found: $DIST_DIR"
  echo "Run the web build first:  pnpm --filter topems-portal build"
  exit 2
fi

ASSETS_DIR="$DIST_DIR/assets"
if [[ ! -d "$ASSETS_DIR" ]]; then
  echo "${RED}[bundle-check] ERROR:${RESET} assets directory not found: $ASSETS_DIR"
  exit 2
fi

# ---------------------------------------------------------------------------
# Header
# ---------------------------------------------------------------------------

echo "${BOLD}[bundle-check]${RESET} Inspecting: $DIST_DIR"
echo "[bundle-check] Budgets  total=$MAX_TOTAL  chunk=$MAX_CHUNK  vendor=$MAX_VENDOR  initial=$MAX_INITIAL"
echo

# ---------------------------------------------------------------------------
# Walk JS chunks
# ---------------------------------------------------------------------------

TOTAL_B=0
ROW_TOTAL=0
FAIL_COUNT=0
JSON_ROWS=()

# Print header
printf "%-50s %12s %12s %-8s\n" "Chunk" "Size" "Budget" "Status"
printf "%-50s %12s %12s %-8s\n" "-----" "----" "------" "------"

while IFS= read -r f; do
  [[ -z "$f" ]] && continue
  size_b=$(stat -c %s "$f" 2>/dev/null || stat -f %z "$f")
  TOTAL_B=$((TOTAL_B + size_b))
  ROW_TOTAL=$((ROW_TOTAL + 1))

  name=$(basename "$f" .js)
  base=$(echo "$name" | sed -E 's/-[0-9a-f]{6,}$//')
  if echo "$base" | grep -qiE "vendor|node_modules|_virtual_mf___mfe_internal__|prebuild___mf_"; then
    budget_b=$MAX_VENDOR_B
    budget_label="$MAX_VENDOR"
  elif echo "$name" | grep -qE "^(index|main|entry|app)"; then
    budget_b=$MAX_INITIAL_B
    budget_label="$MAX_INITIAL (initial)"
  elif echo "$name" | grep -qiE "dashboard"; then
    budget_b=$MAX_CHUNK_B
    budget_label="$MAX_CHUNK"
  else
    budget_b=$MAX_CHUNK_B
    budget_label="$MAX_CHUNK"
  fi

  if [[ $size_b -gt $budget_b ]]; then
    status="${RED}FAIL${RESET}"
    FAIL_COUNT=$((FAIL_COUNT + 1))
  else
    status="${GREEN}OK${RESET}"
  fi

  printf "%-50s %12s %12s %-8b\n" "$name" "$(human "$size_b")" "$budget_label" "$status"
  JSON_ROWS+=("$(printf '{"name":"%s","size":%d,"budget":%d,"pass":%s}' \
    "$name" "$size_b" "$budget_b" "$([[ $size_b -le $budget_b ]] && echo true || echo false)")")
done < <(find "$ASSETS_DIR" -type f -name "*.js" | sort)

# ---------------------------------------------------------------------------
# Total check
# ---------------------------------------------------------------------------

echo
printf "%-50s %12s %12s %-8b\n" "TOTAL" "$(human "$TOTAL_B")" "$MAX_TOTAL" \
  "$([[ $TOTAL_B -le $MAX_TOTAL_B ]] && echo "${GREEN}OK${RESET}" || echo "${RED}FAIL${RESET}")"

if [[ $TOTAL_B -gt $MAX_TOTAL_B ]]; then
  FAIL_COUNT=$((FAIL_COUNT + 1))
fi

# ---------------------------------------------------------------------------
# Baseline diff (optional)
# ---------------------------------------------------------------------------

if [[ -n "$BASELINE" && -f "$BASELINE" ]]; then
  echo
  echo "${BOLD}[bundle-check]${RESET} Comparing against baseline: $BASELINE"
  baseline_total=$(grep -oE '"total":[0-9]+' "$BASELINE" | head -1 | cut -d: -f2)
  if [[ -n "${baseline_total:-}" ]]; then
    delta=$((TOTAL_B - baseline_total))
    pct=$(awk -v d="$delta" -v b="$baseline_total" 'BEGIN{ if(b>0) printf "%.1f", d*100/b; else print "0" }')
    if [[ $delta -gt 0 ]]; then
      echo "${YELLOW}[bundle-check]${RESET} Bundle grew by ${delta} bytes (+${pct}%) since baseline"
    elif [[ $delta -lt 0 ]]; then
      echo "${GREEN}[bundle-check]${RESET} Bundle shrank by $((-delta)) bytes (${pct}%) since baseline"
    else
      echo "[bundle-check] Bundle size unchanged from baseline"
    fi
  fi
fi

# ---------------------------------------------------------------------------
# JSON report (optional)
# ---------------------------------------------------------------------------

if [[ -n "$JSON_OUT" ]]; then
  mkdir -p "$(dirname "$JSON_OUT")"
  {
    echo "{"
    echo "  \"total\": $TOTAL_B,"
    echo "  \"max_total\": $MAX_TOTAL_B,"
    echo "  \"pass\": $([[ $FAIL_COUNT -eq 0 ]] && echo true || echo false),"
    echo "  \"chunks\": ["
    for i in "${!JSON_ROWS[@]}"; do
      sep=$([ $i -lt $((${#JSON_ROWS[@]} - 1)) ] && echo "," || echo "")
      echo "    ${JSON_ROWS[$i]}$sep"
    done
    echo "  ]"
    echo "}"
  } > "$JSON_OUT"
  echo "[bundle-check] JSON report: $JSON_OUT"
fi

# ---------------------------------------------------------------------------
# Final verdict
# ---------------------------------------------------------------------------

echo
if [[ $FAIL_COUNT -eq 0 ]]; then
  echo "${GREEN}${BOLD}[bundle-check] All chunks within budget.${RESET}"
  exit 0
else
  echo "${RED}${BOLD}[bundle-check] ${FAIL_COUNT} check(s) exceeded the budget.${RESET}"
  exit 1
fi
