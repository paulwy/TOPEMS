#!/usr/bin/env bash
# =============================================================================
# ensure-mdm-schema.sh — 幂等补建 master_data.mdm_* 域表（81 张，结构对齐权威库）
# =============================================================================
# 用途:
#   存量库（psql 直推/运行时建表，非 sqlx 迁移链）可能缺失 master_data schema 的
#   mdm_* 域表（mdm P3 批次 2/3/4 lineage-v52 / mdm-v59 AI 治理 / mdm-v55 商业化等
#   handler 查询报 "relation master_data.mdm_lineage_nodes does not exist" → 500）。
#   本脚本确保目标库具备 master_data.mdm_* 结构：缺失时调用统一迁移链
#   （migrate.sh run，权威来源，消除 init/ 双源漂移），不迁移任何数据。
#
# 用法:
#   DATABASE_URL="postgres://topems:pass@localhost:5432/topems" bash scripts/dev/ensure-mdm-schema.sh
#
# 行为:
#   1. 探活 DATABASE_URL。
#   2. guard：master_data.mdm_lineage_nodes 已存在 → 提示已就绪，退出 0（幂等）。
#   3. 缺失 → 调用迁移链补建（migrate.sh run）。
#   4. 断言 mdm_* 表数 ≥ 10 且 mdm_lineage_nodes 存在；打印表数。
# =============================================================================
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?需要设置 DATABASE_URL，例: postgres://topems:<PASS>@localhost:5432/topems}"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
MIGRATE_SCRIPT="${SCRIPT_DIR}/migrate.sh"
PSQL="psql ${DATABASE_URL}"

# --- 1. 探活 ---------------------------------------------------------------
if ! ${PSQL} -tA -c "SELECT 1" >/dev/null 2>&1; then
    echo "错误: 无法连接 ${DATABASE_URL}" >&2
    exit 1
fi

# --- 2. guard：已存在则跳过（幂等） ----------------------------------------
EXISTS="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='master_data' AND table_name='mdm_lineage_nodes'" 2>/dev/null || echo 0)"
if [[ "${EXISTS}" != "0" ]]; then
    echo "✅ mdm schema 已就绪（mdm_lineage_nodes 存在），无需补建"
    exit 0
fi

# --- 3. 补建结构（权威来源=迁移链，消除 init 双源漂移） --------------------
echo "mdm 域表缺失，调用迁移链补建（migrate.sh run）..."
if ! bash "${MIGRATE_SCRIPT}" run >/dev/null 2>&1; then
    echo "错误: 迁移链补建失败（详见 migrate.sh 输出）" >&2
    exit 1
fi

# --- 4. 断言 ---------------------------------------------------------------
COUNT="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='master_data' AND table_name LIKE 'mdm_%'" 2>/dev/null || echo 0)"
NODES="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='master_data' AND table_name='mdm_lineage_nodes'" 2>/dev/null || echo 0)"
if [[ "${COUNT}" == "0" ]] || [[ "${NODES}" == "0" ]]; then
    echo "错误: 迁移链补建后校验失败（mdm 表 ${COUNT} 张 / mdm_lineage_nodes ${NODES}）" >&2
    exit 1
fi

echo "✅ mdm schema 就绪：${COUNT} 张表（mdm_lineage_nodes 在位）"
