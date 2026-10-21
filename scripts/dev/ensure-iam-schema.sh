#!/usr/bin/env bash
# =============================================================================
# ensure-iam-schema.sh — 幂等补建 iam schema（73 张表，结构对齐权威库）
# =============================================================================
# 用途:
#   存量库（psql 直推/运行时建表，非 sqlx 迁移链）可能缺失 iam schema 全部表，
#   导致 unified-core IAM 模块（登录、/users/me、用户 CRUD 等）查询
#   "relation iam.users does not exist" → 登录 500 / users/me 500/404。
#   本脚本在目标库补齐 iam schema 结构（来自 database/init/06_iam_schema.sql，
#   幂等 CREATE TABLE IF NOT EXISTS），不迁移任何数据。
#
# 用法:
#   DATABASE_URL="postgres://topems:pass@localhost:5432/topems" bash scripts/dev/ensure-iam-schema.sh
#
# 行为:
#   1. 探活 DATABASE_URL。
#   2. guard：iam.users 已存在 → 提示已就绪，退出 0（幂等）。
#   3. 缺失 → 执行 database/init/06_iam_schema.sql 建 73 表。
#   4. 断言 iam 表数 ≥ 1 且 iam.users 存在；打印表数。
# =============================================================================
set -euo pipefail

DATABASE_URL="${DATABASE_URL:?需要设置 DATABASE_URL，例: postgres://topems:<PASS>@localhost:5432/topems}"

SCRIPT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
SCHEMA_SQL="${SCRIPT_DIR}/database/init/06_iam_schema.sql"
PSQL="psql ${DATABASE_URL}"

# --- 1. 探活 ---------------------------------------------------------------
if ! ${PSQL} -tA -c "SELECT 1" >/dev/null 2>&1; then
    echo "错误: 无法连接 ${DATABASE_URL}" >&2
    exit 1
fi

# --- 2. guard：已存在则跳过（幂等） ----------------------------------------
EXISTS="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='iam' AND table_name='users'" 2>/dev/null || echo 0)"
if [[ "${EXISTS}" != "0" ]]; then
    echo "✅ iam schema 已就绪（iam.users 存在），无需补建"
    exit 0
fi

# --- 3. 补建结构 ------------------------------------------------------------
echo "iam schema 缺失，应用 ${SCHEMA_SQL}（73 表结构，幂等）..."
if ! ${PSQL} -v ON_ERROR_STOP=1 -f "${SCHEMA_SQL}" >/dev/null 2>&1; then
    echo "错误: iam schema 补建失败（详见 psql 输出）" >&2
    exit 1
fi

# --- 4. 断言 ---------------------------------------------------------------
COUNT="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='iam'" 2>/dev/null || echo 0)"
USERS="$(${PSQL} -tA -c "SELECT count(*) FROM information_schema.tables WHERE table_schema='iam' AND table_name='users'" 2>/dev/null || echo 0)"
if [[ "${COUNT}" == "0" ]] || [[ "${USERS}" == "0" ]]; then
    echo "错误: 补建后校验失败（iam 表 ${COUNT} 张 / iam.users ${USERS}）" >&2
    exit 1
fi

echo "✅ iam schema 补建完成：${COUNT} 张表（iam.users 就绪）"
