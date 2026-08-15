#!/bin/bash
# Pipeline v4: single file via single-file-v4.cjs
# - Run v4 script (writes tsx + pending JSON to /tmp/i18n_pending)
# - Global TSC (baseline = 0)
# - TSC PASS: commit pending JSON into real namespace JSON
# - TSC FAIL: git checkout tsx (leaves pending JSON in tmp for audit; doesn't pollute real JSON)
REL="$1"
NS="$2"
ROOT="/Users/xingzhai/TOPEMS"
WEB="$ROOT/apps/web"
SRC="$WEB/src"
FULL="apps/web/src/$REL"

echo "=== $REL (ns=$NS) ==="
cd "$ROOT"

DIFF=$(git diff HEAD -- "$FULL" 2>&1)
if [ -n "$DIFF" ]; then echo "  ⚠️ SKIP: uncommitted changes"; echo "RESULT: SKIP_UNCOMMITTED"; exit 10; fi

# Run v4
RESULT=$(node scripts/i18n/single-file-v4.cjs --file "$REL" --ns "$NS" 2>&1)
RCODE=$?
if [ $RCODE -ne 0 ]; then echo "  ❌ SCRIPT exit=$RCODE: $RESULT"; echo "RESULT: FAIL_SCRIPT"; exit 11; fi

REPLACED=$(echo "$RESULT" | node -e "process.stdin.resume();let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{const j=JSON.parse(s);console.log(j.replaced);console.error(j.pending||'')}catch(e){console.log('PARSEERR')}})" 2>/tmp/v4_pending.txt)
PENDING=$(cat /tmp/v4_pending.txt 2>/dev/null)
echo "  replaced=$REPLACED pending=$PENDING"

if [ "$REPLACED" = "0" ] || [ "$REPLACED" = "PARSEERR" ]; then echo "RESULT: NO_REPLACEMENT"; exit 0; fi

# TSC
cd "$WEB"
npx tsc --noEmit --skipLibCheck > /tmp/tsc_last.log 2>&1
TSC_EXIT=$?
cd "$ROOT"
if [ $TSC_EXIT -eq 0 ]; then
  echo "  ✅ TSC PASS"
  if [ -n "$PENDING" ] && [ -f "$PENDING" ]; then
    COMMIT=$(node scripts/i18n/single-file-v4.cjs --file "$REL" --ns "$NS" --commit "$PENDING" 2>&1)
    CCODE=$?
    if [ $CCODE -eq 0 ]; then
      ADDED=$(echo "$COMMIT" | node -e "process.stdin.resume();let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).added)}catch(e){console.log(0)}})")
      echo "  📝 Committed translations: $ADDED entries"
    else
      echo "  ⚠️ Commit failed: $COMMIT"
    fi
  fi
  echo "RESULT: PASS $REPLACED"
  exit 0
else
  echo "  ❌ TSC FAIL (exit=$TSC_EXIT). Rollback $FULL"
  grep -E "src[/\\\\]$REL|error TS" /tmp/tsc_last.log | head -10
  cd "$ROOT"
  git checkout HEAD -- "$FULL"
  echo "  ↩️ Rolled back tsx. Pending JSON: $PENDING (not committed)"
  echo "RESULT: FAIL_TSC"
  exit 20
fi
