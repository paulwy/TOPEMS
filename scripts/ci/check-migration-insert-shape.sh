#!/usr/bin/env bash
# [Gate INSERT] pre-push 触发器：
#   仅当本次推送涉及迁移相关路径时才执行 INSERT 列数/语义形态检查；
#   无关改动秒级跳过（git diff + grep，不读文件不连库）。
#   MIGRATION_INSERT_SHAPE_FORCE=1 可强制运行（用于本地手动验证）。
# 真正的检查在 scripts/migration/check-insert-column-shape.mjs（失败即非零退出）。
set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR" || exit 1

RELEVANT_RE='^(database/(migrations|baseline)/|svc/[^/]+/migrations/|migrations/|scripts/migration/check-insert-column-shape|scripts/ci/check-migration-insert-shape)'

if [ -z "${MIGRATION_INSERT_SHAPE_FORCE:-}" ]; then
  upstream="$(git rev-parse --abbrev-ref --symbolic-full-name '@{u}' 2>/dev/null || true)"
  if [ -n "$upstream" ]; then
    base="$(git merge-base HEAD "$upstream" 2>/dev/null || true)"
  else
    base=""
  fi
  if [ -z "${base:-}" ]; then
    base="$(git rev-list --max-parents=0 HEAD | tail -n 1)"
  fi

  if ! git diff --name-only "$base"...HEAD 2>/dev/null | grep -Eq "$RELEVANT_RE"; then
    printf '\033[32m[Gate INSERT] SKIP\033[0m 本次推送未涉及迁移文件（database/migrations|svc/*/migrations|migrations）\n'
    exit 0
  fi
  printf '\033[36m[Gate INSERT]\033[0m 检测到迁移相关改动，执行 INSERT 列数/语义检查\n'
else
  printf '\033[36m[Gate INSERT]\033[0m MIGRATION_INSERT_SHAPE_FORCE=1，强制执行 INSERT 形态检查\n'
fi

if ! command -v node >/dev/null 2>&1; then
  printf '\033[31m[Gate INSERT] FAILED\033[0m 未找到 node（缺少运行环境，不允许静默跳过）\n'
  printf '  修复：安装 Node.js（brew install node）或确认 PATH 包含 node。\n'
  exit 1
fi

exec node scripts/migration/check-insert-column-shape.mjs
