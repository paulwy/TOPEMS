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
    pnpm-lock.yaml|*-lock.yaml|database/postgres_data/*|docs/project/TODO.md|TODO.md|packages/shared-types/src/generated/openapi.d.ts|docs/api/openapi.json|fixtures/full_schema_contract.sql) continue ;;
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

# ── 迁移 SQL 专项（第三梯队 DIR-f）：新增 database/migrations/*.sql >100KB 报警（WARN 不阻断）
# 只拦暂存新增；历史巨型迁移已入库不受影响；>100KB 请拆分或在 database/migrations/README.md 登记背景
BIGSQL=''
for f in $STAGED; do
  case "$f" in
    database/migrations/*.sql) ;;
    *) continue ;;
  esac
  [ -f "$f" ] || continue
  SIZE=$(wc -c < "$f" 2>/dev/null || echo 0)
  if [ "$SIZE" -gt 102400 ]; then
    BIGSQL="${BIGSQL}  - $f ($((SIZE/1024))KB)\n"
  fi
done
if [ -n "$BIGSQL" ]; then
  echo '⚠️  Warning: 新增迁移 SQL >100KB（请拆分或登记背景）:'
  printf "$BIGSQL"
fi

exit 0
