#!/bin/bash
# Usage: bash scripts/i18n/process-file-wrapper.sh <rel-to-src> <namespace>
REL="$1"
NS="$2"
WEB="apps/web"
SRC="$WEB/src"
FULL="$SRC/$REL"

echo "=== $REL (ns=$NS) ==="

cd /Users/xingzhai/TOPEMS

# Step a: git diff 确认无未提交改动
DIFF=$(git diff HEAD -- "$FULL" 2>&1)
if [ -n "$DIFF" ]; then
  echo "  ⚠️ SKIP: file has uncommitted changes"
  echo "RESULT: SKIP_UNCOMMITTED"
  exit 10
fi

# Step b: run v3 script
RESULT=$(node scripts/i18n/single-file-v3.cjs --file "$REL" --ns "$NS" 2>&1)
RCODE=$?
if [ $RCODE -ne 0 ]; then
  echo "  ❌ SCRIPT FAILED (code=$RCODE): $RESULT"
  echo "RESULT: FAIL_SCRIPT"
  exit 11
fi
REPLACED=$(echo "$RESULT" | node -e "process.stdin.resume();let s='';process.stdin.on('data',d=>s+=d);process.stdin.on('end',()=>{try{console.log(JSON.parse(s).replaced)}catch(e){console.log('PARSEERR')}})")
echo "  Script: $REPLACED replacements"

if [ "$REPLACED" = "0" ] || [ "$REPLACED" = "PARSEERR" ]; then
  echo "  ℹ️  No changes"
  echo "RESULT: NO_REPLACEMENT ($REPLACED)"
  exit 0
fi

# Step c: single-file TSC by running global tsc then grep for THIS file's errors
cd /Users/xingzhai/TOPEMS/apps/web
TSC_OUT=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep -E "(^|[/\\\\])src[/\\\\]$REL" | head -10)
ALL_ERR_COUNT=$(npx tsc --noEmit --skipLibCheck 2>&1 | grep -cE "error TS|error :")

if [ -z "$TSC_OUT" ]; then
  echo "  ✅ TSC PASSED (this file has 0 errors; total project errors=$ALL_ERR_COUNT)"
  cd /Users/xingzhai/TOPEMS
  echo "RESULT: PASS $REPLACED"
  exit 0
fi

# Step d: failed, rollback
echo "  ❌ TSC FAILED for $REL:"
echo "  $TSC_OUT" | head -10
cd /Users/xingzhai/TOPEMS
git checkout HEAD -- "$FULL"
echo "  ↩️ Rolled back (all errors in project: $ALL_ERR_COUNT)"
echo "RESULT: FAIL_TSC"
exit 20
