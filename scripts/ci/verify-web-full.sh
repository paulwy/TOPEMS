#!/usr/bin/env bash
# =============================================================================
# verify-web-full.sh — 前端单测 + 覆盖率全量验证（显式命令，不进 pre-push）
# =============================================================================
# 复刻 CI frontend-test（unit + 5 分片）与 frontend-coverage 两个 job：
#   1. pnpm --filter topems-portal test:unit
#   2. pnpm --filter topems-portal test:shard:1..5
#   3. pnpm --filter topems-portal test:coverage（vitest.config.ts 内置覆盖率阈值）
#
# 注意：apps/web 的 test:all 用 `;` 串联，分片失败不会短路，不能作为门禁；
#       这里用 `&&` 显式串联，任一失败立即非 0。
#
# 为什么不在 pre-push：全量前端测试 + 覆盖率实测分钟级，会把钩子拖长。
# 入口：npm run verify:web-full / verify:full。
#
# fail-closed：node/pnpm 缺失、依赖未安装、vitest 配置缺失、任一分片失败 → 非 0。
# =============================================================================
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || true)"
if [[ -z "$ROOT" ]]; then echo "FAIL: 不在 git 仓库内" >&2; exit 1; fi
cd "$ROOT"

command -v node >/dev/null 2>&1 || { echo "FAIL: 缺少 node" >&2; exit 1; }
command -v pnpm >/dev/null 2>&1 || { echo "FAIL: 缺少 pnpm（packageManager: pnpm@9）" >&2; exit 1; }
if [[ ! -d apps/web/node_modules && ! -d node_modules ]]; then
    echo "FAIL: 前端依赖未安装（先执行 pnpm install --frozen-lockfile）" >&2
    exit 1
fi
if ! compgen -G "apps/web/vitest.config.*" >/dev/null; then
    echo "FAIL: 缺少 apps/web/vitest.config.*（无法确认覆盖率阈值生效）" >&2
    exit 1
fi
if ! pnpm --filter topems-portal exec vitest --version >/dev/null 2>&1; then
    echo "FAIL: topems-portal 下 vitest 不可执行（依赖不完整）" >&2
    exit 1
fi

export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=4096}"

STEP_START=0
step() { STEP_START=$(date +%s); echo "==> $1"; }
step_end() { echo "  ↳ $1 耗时 $(( $(date +%s) - STEP_START ))s"; }

TOTAL_START=$(date +%s)
echo "== 前端全量验证 =="

step "unit 测试"
pnpm --filter topems-portal test:unit
step_end "unit"

for i in 1 2 3 4 5; do
    step "component 分片 $i/5"
    pnpm --filter topems-portal "test:shard:$i"
    step_end "shard $i"
done

step "覆盖率（阈值来自 apps/web/vitest.config.ts）"
pnpm --filter topems-portal test:coverage
step_end "coverage"

echo "PASS: 前端全量验证通过（总耗时 $(( $(date +%s) - TOTAL_START ))s）"
