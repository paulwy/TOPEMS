#!/usr/bin/env bash
# Gate N · Large files check (>1MB) — migrated from husky #1
# Ensures no staged file exceeds 1MB (excluding lockfiles, DB data, known large docs).
set -euo pipefail

STAGED=$(git diff --cached --name-only --diff-filter=ACM 2>/dev/null || echo '')
[ -z "$STAGED" ] && exit 0

MAX_SIZE=1048576  # 1MB
FOUND=''

for f in $STAGED; do
  case "$f" in
    pnpm-lock.yaml|*-lock.yaml|database/postgres_data/*|docs/roadmap/TODO.md|packages/shared-types/src/generated/openapi.d.ts|docs/api/openapi-aggregated.*) continue ;;
  esac
  [ -f "$f" ] || continue
  SIZE=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt "$MAX_SIZE" ]; then
    FOUND="${FOUND}  - $f ($((SIZE/1024))KB)\n"
  fi
done

if [ -n "$FOUND" ]; then
  echo '❌ Large files detected:'
  printf "$FOUND"
  echo '   Please remove or use Git LFS.'
  exit 1
fi

exit 0
