#!/usr/bin/env bash
# TOPEMS 数据库实例一致性检查
# 对比主库（5432 brew）与第二库（Homebrew 验证实例，默认 5433；2026-11-02 起该实例已恢复，数据目录 /opt/homebrew/var/postgresql@18_5433，见 docs/database/database-primary-instance.md §6）的迁移版本
# 用法：bash scripts/db/check-consistency.sh
set -euo pipefail

# 凭据不硬编码：从 .env（不入库）的 MIGRATE_URL 解析用户/密码/端口/库名
set -a; [ -f .env ] && . ./.env; set +a
DEV_HOST=localhost
DEV_PORT=5432
DEV_DB=topems
if [ -n "${MIGRATE_URL:-}" ]; then
  DEV_USER=$(printf '%s' "$MIGRATE_URL" | sed -E 's#postgres://([^:]+):[^@]*@[^/]+/.*#\1#')
  DEV_PASS=$(printf '%s' "$MIGRATE_URL" | sed -E 's#postgres://[^:]+:([^@]*)@.*#\1#')
  DEV_PORT=$(printf '%s' "$MIGRATE_URL" | sed -E 's#postgres://[^@]*@[^:]*:?([0-9]*)/.*#\1#')
  DEV_DB=$(printf '%s' "$MIGRATE_URL" | sed -E 's#postgres://[^@]*@[^/]*/(.*)#\1#')
  [ -z "$DEV_PORT" ] && DEV_PORT=5432
fi
DEV_USER="${DEV_USER:-topems}"
DEV_PASS="${DEV_PASS:-topems}"

# 第二库（验证库）：Homebrew 实例，数据目录 /opt/homebrew/var/postgres5433；psql 直连，不再走 docker
# ⚠️ 2026-11-02 核实：该实例已恢复（数据目录 /opt/homebrew/var/postgresql@18_5433，pg_ctl 已启动）；第二库不可达时本脚本跳过比对并给出重建指引
# 可通过环境变量覆盖第二库地址：DEP_HOST / DEP_PORT / DEP_DB / DEP_USER
DEP_HOST="${DEP_HOST:-localhost}"
DEP_PORT="${DEP_PORT:-5433}"
DEP_DB="${DEP_DB:-topems}"
DEP_USER="${DEP_USER:-topems}"

echo "== 主库 5432 (brew) =="
export PGPASSWORD
PGPASSWORD=$DEV_PASS
DEV_VER=$(psql -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" -d "$DEV_DB" -t -A -c \
  "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null) || { echo "!! 5432 不可达（或 .env 中 POSTGRES_PASSWORD 未取到）"; DEV_VER=""; }
echo "最新迁移版本: ${DEV_VER:-<不可达>}"

echo "== 第二库 ${DEP_HOST}:${DEP_PORT} (Homebrew) =="
DEP_VER=$(psql -h "$DEP_HOST" -p "$DEP_PORT" -U "$DEP_USER" -d "$DEP_DB" -t -A -c \
  "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null) || DEP_VER=""

if [ -z "$DEP_VER" ]; then
  echo "!! 第二库不可达 → 跳过双库账本比对"
  echo "   5433 Homebrew 验证实例不可达（2026-11-02 起数据目录 /opt/homebrew/var/postgresql@18_5433，需 pg_ctl 启动），重建/恢复见 docs/database/database-primary-instance.md §6.3"
  echo "   若已改用其他第二库，以 DEP_HOST/DEP_PORT/DEP_DB 覆盖后重跑"
  exit 0
fi
echo "最新迁移版本: $DEP_VER"

if [ -n "$DEV_VER" ] && [ -n "$DEP_VER" ]; then
  if [ "$DEV_VER" = "$DEP_VER" ]; then
    echo "== 结论：迁移版本一致 =="
  else
    echo "== 结论：迁移版本漂移！主库=$DEV_VER 验证库=$DEP_VER，需在两库补齐同一迁移 =="
    exit 1
  fi
fi

# == 表级一致性（2026-11-03 增强） ==
# 教训：账本计数/最新版本一致 ≠ schema/表结构一致（topems 曾 542 账本但缺 34 schema、
# 5433 缺 public 标准表均漏检）。现按业务 schema 对比两库表数量，快速暴露表级漂移。
# 排除：pg_*/information_schema/_sqlx_test（测试专用 schema）。
TBLQ="SELECT table_schema||':'||count(*) FROM information_schema.tables WHERE table_schema NOT LIKE 'pg_%' AND table_schema NOT IN ('information_schema','_sqlx_test') GROUP BY table_schema ORDER BY 1"
echo "== 表级一致性（业务 schema 表数对比） =="
DEV_TBLS=$(psql -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" -d "$DEV_DB" -t -A -c "$TBLQ" 2>/dev/null | sort || true)
DEP_TBLS=$(psql -h "$DEP_HOST" -p "$DEP_PORT" -U "$DEP_USER" -d "$DEP_DB" -t -A -c "$TBLQ" 2>/dev/null | sort || true)
# 逐 schema 对比：仅输出表数不一致的 schema（去同值行）
DIFF_LINES=""
while IFS= read -r line; do
  [ -z "$line" ] && continue
  sch=${line%%:*}
  devn=${line##*:}
  depn=$(printf '%s\n' "$DEP_TBLS" | awk -F: -v s="$sch" '$1==s {print $2}')
  if [ -z "$depn" ]; then depn=0; fi
  if [ "$devn" != "$depn" ]; then
    DIFF_LINES="${DIFF_LINES}  ${sch}: 主库=$devn vs 验证库=$depn"$'\n'
  fi
done <<< "$DEV_TBLS"
# 验证库独有 schema（主库无此 schema）
while IFS= read -r line; do
  [ -z "$line" ] && continue
  sch=${line%%:*}
  if ! printf '%s\n' "$DEV_TBLS" | grep -q "^$sch:"; then
    DIFF_LINES="${DIFF_LINES}  ${sch}: 主库=0 vs 验证库=${line##*:}"$'\n'
  fi
done <<< "$DEP_TBLS"
if [ -n "$DIFF_LINES" ]; then
  echo "!! 表级漂移（业务 schema 表数不一致）："
  printf '%s' "$DIFF_LINES"
  echo "   参考：scripts/db 或 docs/database 的表级对齐记录；账本一致不代表表结构一致"
  exit 1
else
  echo "== 结论：表级一致（逐业务 schema 表数相同） =="
fi
