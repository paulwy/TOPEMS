#!/bin/bash
# Optimized: baseline is 0 TSC errors; after each file just check npx tsc --noEmit exit code
REL="$1"
NS="$2"
WEB="apps/web"
SRC="$WEB/src"
FULL="$SRC/$REL"
ROOT="/Users/xingzhai/TOPEMS"

echo "=== $REL (ns=$NS) ==="
cd "$ROOT"

DIFF=$(git diff HEAD -- "$FULL" 2>&1)
if [ -n "$DIFF" ]; then echo "  ⚠️ SKIP (uncommitted changes)"; echo "RESULT: SKIP_UNCOMMITTED"; exit 10; fi

RESULT=$(node scripts/i18n/single-file-v3.cjs --file "$REL" --ns "$NS" 2>&1)
RCODE=$?
if [ $RCODE -ne 0 ]; then echo "  ❌ Script exit=$RCODE"; echo "RESULT: FAIL_SCRIPT"; exit 11; fi

REPLACED=$(echo "$RESULT" | node -e "process.stdin.resume();let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).replaced)}catch(e){console.log('PARSEERR')}})")
echo "  replaced=$REPLACED"
if [ "$REPLACED" = "0" ] || [ "$REPLACED" = "PARSEERR" ]; then echo "RESULT: NO_REPLACEMENT"; exit 0; fi

cd "$ROOT/apps/web"
npx tsc --noEmit --skipLibCheck >/dev/null 2>&1
TSC_EXIT=$?
cd "$ROOT"
if [ $TSC_EXIT -eq 0 ]; then
  echo "  ✅ TSC OK"
  echo "RESULT: PASS $REPLACED"
  exit 0
else
  echo "  ❌ TSC FAILED (exit=$TSC_EXIT), rolling back $FULL"
  cd "$ROOT/apps/web" && npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "$REL|error TS" | head -10
  cd "$ROOT" && git checkout HEAD -- "$FULL"
  echo "  ↩️ Rolled back"
  echo "RESULT: FAIL_TSC"
  exit 20
fi
