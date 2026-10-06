#!/usr/bin/env bash
# =============================================================================
# ensure-empty-db-prereqs.sh — 新库建库"空库守卫"脚本（纯链全量验证）
# =============================================================================
# 用途:
#   让一个全新空库从 0 全量应用 database/migrations/ 顶层迁移链，断言
#   "0 错误 + 账本记录数 = 迁移文件数"。
#
# 历史:
#   - 2026-10-03 首版：探活 + 幂等补齐 3/4 处前置列 + 失败自动重放
#     （U6 依赖 finance.payable_amount、R3 依赖 erp/crm.audit_logs.status、
#      R4 依赖 core.core_plugins.code、1005000001/0002 依赖 public 影子表——
#      均为服务运行时内联 DDL 建的列/表，不在迁移链）。
#   - 2026-10-07 A2 定案（commit a617e7fb7）：**守卫内建进迁移文件本身**——
#     v69 裸表名→public. 前缀；U6/R3/R4 改为列存在守卫；1005000001/0002 补
#     public 影子表骨架前缀；u3b 修正 DROP 顺序（FK 依赖）。脚本层补列兜底
#     移除——否则会掩盖未来同类迁移链缺陷（这正是 A2 前 7 处缺陷漏出的原因）。
#     本脚本降级为纯链验证：若仍失败，即真实迁移链缺陷，须修迁移文件而非补列。
#
# 用法:
#   MIGRATE_URL="postgres://user:pass@host:5433/topems" bash scripts/ensure-empty-db-prereqs.sh
#
# 行为:
#   1. 探活 MIGRATE_URL（连不上即退出）。
#   2. sqlx migrate run 全量应用（失败即退出——不补列掩盖；有界重试仅针对瞬时错误）。
#   3. 断言 _sqlx_migrations 全量 success=true、无失败记录、记录数 = 迁移文件数。
# =============================================================================
set -euo pipefail

MIGRATE_URL="${MIGRATE_URL:?需要设置 MIGRATE_URL，例: postgres://topems:topems_secret@127.0.0.1:5433/topems}"

# 解析 sqlx 可执行文件（CI 用 PATH 内 sqlx；本地默认 ~/.cargo/bin/sqlx）
SQLX="$(command -v sqlx || echo "$HOME/.cargo/bin/sqlx")"
if [[ ! -x "$SQLX" ]]; then
    echo "错误: 未找到 sqlx-cli（需支持 migrate run）" >&2
    exit 2
fi

PSQL="psql $MIGRATE_URL"

# --- 0. 探活 -------------------------------------------------------------------
echo "== 空库建库守卫（纯链全量验证）=="
echo "  MIGRATE_URL: $MIGRATE_URL"
if ! $PSQL -tA -c "SELECT 1" >/dev/null 2>&1; then
    echo "错误: 无法连接 MIGRATE_URL（探活失败）" >&2
    exit 2
fi
echo "  探活 OK"

# --- 1. 循环：sqlx migrate run（失败即暴露缺陷，不补列掩盖） --------------------
#     有界重试仅针对瞬时错误（如连接抖动）；迁移链缺陷会稳定复现，3 次后退出。
MAX_ATTEMPTS=3
attempt=0
while (( attempt < MAX_ATTEMPTS )); do
    attempt=$(( attempt + 1 ))
    echo "== sqlx migrate run（第 ${attempt}/${MAX_ATTEMPTS} 次）=="
    if "$SQLX" migrate run --source database/migrations --database-url "$MIGRATE_URL"; then
        echo "== 迁移链全量应用成功 =="
        break
    fi
    echo "!! sqlx migrate run 失败（第 ${attempt} 次）——迁移链缺陷，请修迁移文件（守卫已内建，脚本不再补列掩盖）" >&2
    if (( attempt == MAX_ATTEMPTS )); then
        echo "错误: 已重试 ${MAX_ATTEMPTS} 次仍失败，最后一次失败为真实迁移链缺陷" >&2
        exit 1
    fi
done

# --- 2. 断言 _sqlx_migrations 全量 success=true + 记录数 = 文件数 ---------------
TOTAL="$($PSQL -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success=true;" 2>/dev/null || echo 0)"
PENDING="$($PSQL -tA -c "SELECT count(*) FROM _sqlx_migrations WHERE success=false;" 2>/dev/null || echo 0)"
FILES="$(find "$(dirname "$0")/../database/migrations" -maxdepth 1 -name '*.sql' | wc -l | tr -d ' ')"
echo "  已应用迁移: ${TOTAL} 条，失败: ${PENDING} 条，迁移文件: ${FILES} 个"
if [[ "${PENDING}" != "0" ]]; then
    echo "错误: 存在失败迁移记录" >&2
    exit 1
fi
if [[ "${TOTAL}" == "0" ]]; then
    echo "错误: 迁移记录为空（迁移未执行？）" >&2
    exit 1
fi
if [[ "${TOTAL}" != "${FILES}" ]]; then
    echo "错误: 账本记录数(${TOTAL}) ≠ 迁移文件数(${FILES})——有迁移未应用或账本缺记录" >&2
    exit 1
fi

echo "✅ 空库建库守卫通过：${TOTAL}/${FILES} 迁移应用，0 错误"
