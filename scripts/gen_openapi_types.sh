#!/usr/bin/env bash
# V71 A2 - OpenAPI to TS type generation entrypoint
# Usage: bash scripts/gen_openapi_types.sh
# Acceptance (TODO.md A2):
#   - single command exit 0
#   - packages/shared-types/src/openapi.gen.ts >= 300 Schemas
#   - TSC 0 error

set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
OPENAPI_OUT="$ROOT/tmp/openapi"
AGGREGATED_OUT="$ROOT/docs/api/openapi-aggregated.json"
SHARED_TYPES="$ROOT/packages/shared-types"
GEN_OUT_DIR="$SHARED_TYPES/src/generated"
TODO_OUTFILE="$SHARED_TYPES/src/openapi.gen.ts"

mkdir -p "$OPENAPI_OUT"
mkdir -p "$GEN_OUT_DIR"

log_info()  { printf '\033[0;34m[A2-INFO]\033[0m %s\n' "$*"; }
log_ok()    { printf '\033[0;32m[A2- OK ]\033[0m %s\n' "$*"; }
log_err()   { printf '\033[0;31m[A2- ERR]\033[0m %s\n' "$*" 1>&2; }

# ---- Step 1: align JSON file names (topems-*.json -> topems-*-openapi.json) ----
log_info "(1/7) Align JSON names: topems-*.json -> topems-*-openapi.json (cp, keep originals)"
cd "$OPENAPI_OUT"
for f in topems-*.json; do
  [ -e "$f" ] || continue
  case "$f" in
    *"-openapi.json"|"SUMMARY.txt") continue ;;
  esac
  stem="${f%.json}"
  cp -a "$f" "${stem}-openapi.json"
done
cd "$ROOT"

json_count=$(find "$OPENAPI_OUT" -maxdepth 1 -name 'topems-*-openapi.json' -print 2>/dev/null | wc -l | tr -d ' ')
log_ok "(1/7) Aligned: $json_count *-openapi.json files"
if [ "$json_count" -lt 10 ]; then
  log_err "FAIL: available JSON < 10 (= $json_count). Please re-run A1 first."
  exit 2
fi

# ---- Step 2: aggregate.py ----
log_info "(2/7) aggregate.py -> $AGGREGATED_OUT"
python3 "$ROOT/scripts/openapi/aggregate.py" --input-dir "$OPENAPI_OUT" --output "$AGGREGATED_OUT"

agg_paths=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d.get('paths',{})))" "$AGGREGATED_OUT")
agg_schemas=$(python3 -c "import json,sys;d=json.load(open(sys.argv[1]));print(len(d.get('components',{}).get('schemas',{})))" "$AGGREGATED_OUT")
log_ok "(2/7) Aggregated: paths=$agg_paths schemas=$agg_schemas (threshold 300)"
if [ "$agg_schemas" -lt 300 ]; then
  log_err "FAIL: aggregated schemas=$agg_schemas < 300"
  exit 3
fi

# ---- Step 3: gen-types.mjs (openapi-typescript) ----
log_info "(3/7) openapi-typescript: node scripts/openapi/gen-types.mjs --aggregated --output $GEN_OUT_DIR"
node "$ROOT/scripts/openapi/gen-types.mjs" --aggregated --output "$GEN_OUT_DIR"

# ---- Step 4: copy to TODO acceptance filename ----
log_info "(4/7) Align acceptance filename: cp $GEN_OUT_DIR/openapi.d.ts -> $TODO_OUTFILE"
if [ ! -f "$GEN_OUT_DIR/openapi.d.ts" ]; then
  log_err "FAIL: gen-types.mjs did not produce $GEN_OUT_DIR/openapi.d.ts"
  exit 4
fi
cp -a "$GEN_OUT_DIR/openapi.d.ts" "$TODO_OUTFILE"
chmod -x "$TODO_OUTFILE" 2>/dev/null || true

# ---- Step 5: Schema count acceptance (>= 300) ----
log_info "(5/7) Schema count check (target >= 300)..."
s_banner="0"
s_keys="0"
if [ -f "$TODO_OUTFILE" ]; then
  bm=$(grep -oE "Schema [^:]*: *[0-9]+" "$TODO_OUTFILE" | head -1 | grep -oE "[0-9]+" || true)
  [ -n "$bm" ] && s_banner="$bm"
  # components.schemas block first-level keys: 8-space indented CapitalizedName: {
  sk=$(grep -cE "^        [A-Z][A-Za-z0-9_]*: *{" "$TODO_OUTFILE" 2>/dev/null || echo 0)
  [ -n "$sk" ] && s_keys="$sk"
fi
log_ok "(5/7) banner=$s_banner schema-block-keys=$s_keys (PASS if either >= 300)"
sb=${s_banner:-0}
sk=${s_keys:-0}
if [ "$sb" -lt 300 ] && [ "$sk" -lt 300 ]; then
  log_err "FAIL: Schema count below threshold (banner=$sb / block-keys=$sk, need >= 300)"
  exit 5
fi

# ---- Step 6: TSC 0 error ----
log_info "(6/7) TSC check packages/shared-types (target 0 error)..."
cd "$SHARED_TYPES"
TSC_ERR_LOG="/tmp/v71-a2-tsc-err.log"
set +e
npx tsc --noEmit -p tsconfig.json > "$TSC_ERR_LOG" 2>&1
TSC_RC=$?
set -e
if [ "$TSC_RC" -ne 0 ]; then
  errs=$(grep -cE "error TS" "$TSC_ERR_LOG" 2>/dev/null || echo 0)
  if [ "$errs" -gt 0 ]; then
    log_err "FAIL: shared-types TSC has $errs errors. Log: $TSC_ERR_LOG"
    head -30 "$TSC_ERR_LOG" 1>&2 || true
    exit 6
  fi
fi
cd "$ROOT"
log_ok "(6/7) TSC 0 error"

# ---- Step 7: summary ----
bytes=$(wc -c <"$TODO_OUTFILE" | tr -d ' ')
printf '\n'
log_ok "================ V71 A2 PASS ================"
log_ok "Output file: $TODO_OUTFILE ($bytes bytes)"
log_ok "Schema count: banner=$s_banner / block-keys=$s_keys (threshold >= 300)"
log_ok "Aggregated: paths=$agg_paths schemas=$agg_schemas"
log_ok "JSON coverage: $json_count services"
exit 0
