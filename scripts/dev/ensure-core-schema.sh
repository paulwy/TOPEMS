#!/usr/bin/env bash
# =============================================================================
# ensure-core-schema.sh — 幂等补建 core schema（14 张表，结构对齐权威库）
# =============================================================================
# 用途:
#   存量库（psql 直推/运行时建表，非 sqlx 迁移链）可能缺失 core schema 全部表，
#   导致 unified-core Plugin-Heartbeat 每 30s 报
#   "relation core.core_plugin_instances does not exist"（插件域整体断连）。
#   本脚本在目标库补齐 core schema 结构（来自 database/init/07_core_schema.sql，
#   幂等 CREATE SCHEMA/TABLE IF NOT EXISTS），不迁移任何数据。
#
# 用法:
#   DATABASE_URL="postgres://topems:pass@localhost:5432/topems" bash scripts/dev/ensure-core-schema.sh
#
# 行为:
#   1. 探活 DATABASE_URL。
#   2. guard：core.core_plugin_instances 已存在 → 提示已就绪，退出 0（幂等）。
#   3. 缺失 → 执行 database/init/07_core_schema.sql 建 14 表。
#   4. 断言 core 表数 ≥ 1 且 core.core_plugin_instances 存在；打印表数。
# =============================================================================
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?需要设置 DATABASE_URL，例: postgres://topems:<PASS>@localhost:5432/topems}"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_SQL="${SCRIPT_DIR}/database/init/07_core_schema.sql"
PSQL="psql ${DATABASE_URL}"

# --- 1. 探活 ---------------------------------------------------------------
if ! ${PSQL} -tA -c "SELECT 1" >/dev/null 2>&1; then
    echo "错误: 无法连接 ${DATABASE_URL}" >&2
    exit 1
fi

# --- 2. guard：已存在则跳过（幂等） ----------------------------------------
EXISTS="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='core' AND table_name='core_plugin_instances'" 2>/dev/null || echo 0)"
if [[ "${EXISTS}" != "0" ]]; then
    echo "✅ core schema 已就绪（core_plugin_instances 存在），无需补建"
    exit 0
fi

# --- 3. 补建结构 ------------------------------------------------------------
echo "core schema 缺失，应用 ${SCHEMA_SQL}（14 表结构，幂等）..."
if ! ${PSQL} -v ON_ERROR_STOP=1 -f "${SCHEMA_SQL}" >/dev/null 2>&1; then
    echo "错误: core schema 补建失败（详见 psql 输出）" >&2
    exit 1
fi

# --- 4. 断言 ---------------------------------------------------------------
COUNT="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='core'" 2>/dev/null || echo 0)"
INST="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='core' AND table_name='core_plugin_instances'" 2>/dev/null || echo 0)"
if [[ "${COUNT}" == "0" ]] || [[ "${INST}" == "0" ]]; then
    echo "错误: 补建后校验失败（core 表 ${COUNT} 张 / core_plugin_instances ${INST}）" >&2
    exit 1
fi

echo "✅ core schema 补建完成：${COUNT} 张表（core_plugin_instances 就绪）"
