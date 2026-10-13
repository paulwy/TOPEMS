#!/usr/bin/env bash
# =============================================================================
# audit-date-types.sh — TOPEMS live DB 日期类型不变量审计（只读）
#
# 背景：2026-10-13 全库将 naive TIMESTAMP 统一为 TIMESTAMPTZ（纯日期保留 date）。
# 本脚本断言 live DB(5432) 满足日期类型契约，防止未来迁移/脚本重新引入 naive 列。
# 配合 CI nightly + Doubao 定时任务每日执行；异常时非零退出并打印明细。
#
# 契约（与迁移终态一致）：
#   - timestamp without time zone (naive) == 0
#   - timestamp with time zone (timestamptz) == 4410
#   - date == 283
#   - 三者和 == 全部时间/日期列
#
# 用法：
#   ./scripts/dev/audit-date-types.sh            # 检查 live DB(5432)
#   DB_URL="postgres://..." ./scripts/dev/audit-date-types.sh   # 指定连接串
#   ./scripts/dev/audit-date-types.sh --sqlx     # 追加 sqlx 缓存一致性 --check
#   ./scripts/dev/audit-date-types.sh --offline  # 追加全 workspace 离线 cargo check
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
DB_URL="${DB_URL:-postgresql://topems:3b07cf82f13669d9c360214db1fc2d40@localhost:5432/topems}"
EXPECT_NAIVE=0
EXPECT_TZ=4410
EXPECT_DATE=283

echo "[audit-date-types] live DB 日期类型审计 — $(date '+%Y-%m-%d %H:%M:%S %Z')"
echo "  目标: ${DB_URL%%@*}@$(echo "${DB_URL#*@}" | cut -d'/' -f1)"

Q="SELECT data_type, count(*) FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
      AND data_type IN ('timestamp without time zone','timestamp with time zone','date')
    GROUP BY 1 ORDER BY 1;"

RAW="$(psql -d "${DB_URL}" -tAc "${Q}")"
NAIVE="$(printf '%s\n' "${RAW}" | awk -F'|' '/timestamp without time zone/{gsub(/ /,"",$2); print $2}')"
TZ="$(printf '%s\n' "${RAW}" | awk -F'|' '/timestamp with time zone/{gsub(/ /,"",$2); print $2}')"
DATE="$(printf '%s\n' "${RAW}" | awk -F'|' '/^date/{gsub(/ /,"",$2); print $2}')"
NAIVE="${NAIVE:-0}"; TZ="${TZ:-0}"; DATE="${DATE:-0}"

printf '  naive(timestamp)  = %s   (期望 %s)\n' "${NAIVE}" "${EXPECT_NAIVE}"
printf '  timestamptz       = %s   (期望 %s)\n' "${TZ}" "${EXPECT_TZ}"
printf '  date              = %s   (期望 %s)\n' "${DATE}" "${EXPECT_DATE}"
TOTAL=$((NAIVE + TZ + DATE))
printf '  合计              = %s   (期望 %s)\n' "${TOTAL}" "$((EXPECT_NAIVE + EXPECT_TZ + EXPECT_DATE))"

FAIL=0
[ "${NAIVE}" -eq "${EXPECT_NAIVE}" ] || { echo "  ✗ naive 列数偏移: ${NAIVE} != ${EXPECT_NAIVE}"; FAIL=1; }
[ "${TZ}" -eq "${EXPECT_TZ}" ] || { echo "  ✗ timestamptz 列数偏移: ${TZ} != ${EXPECT_TZ}"; FAIL=1; }
[ "${DATE}" -eq "${EXPECT_DATE}" ] || { echo "  ✗ date 列数偏移: ${DATE} != ${EXPECT_DATE}"; FAIL=1; }
[ "${TOTAL}" -eq "$((EXPECT_NAIVE + EXPECT_TZ + EXPECT_DATE))" ] || { echo "  ✗ 合计偏移: ${TOTAL}"; FAIL=1; }

if [ "${FAIL}" -eq 1 ]; then
  echo "  ✗ 明细（偏移列）:"
  psql -d "${DB_URL}" -tAc "SELECT table_schema||'.'||table_name||'.'||column_name||' '||data_type
    FROM information_schema.columns
    WHERE table_schema NOT IN ('pg_catalog','information_schema')
      AND data_type IN ('timestamp without time zone','timestamp with time zone','date')
    ORDER BY 1;" | grep -E 'timestamp without' || true
  exit 1
fi
echo "  ✓ 日期类型契约通过"

if [ "${1:-}" = "--sqlx" ]; then
  echo "[audit-date-types] sqlx 缓存一致性 check..."
  ( cd "${ROOT}" && DATABASE_URL="${DB_URL}" ./scripts/dev/sqlx-prepare.sh --check )
fi

if [ "${1:-}" = "--offline" ]; then
  echo "[audit-date-types] 全 workspace 离线 cargo check..."
  ( cd "${ROOT}" && DATABASE_URL='' SQLX_OFFLINE=true cargo check --workspace --message-format=short )
fi
echo "[audit-date-types] 完成 ✓"
