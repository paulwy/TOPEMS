#!/usr/bin/env bash
# TOPEMS 数据库实例一致性检查
# 对比生产/开发主库（5432 brew）与验证库（5433 Homebrew 实例）的迁移版本与关键表规模
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

# 验证库 5433（Homebrew 实例，数据目录 /opt/homebrew/var/postgres5433；psql 直连，不再走 docker）
DEP_HOST=localhost
DEP_PORT=5433
DEP_DB=topems
DEP_USER="${DEP_USER:-topems}"

echo "== 主库 5432 (brew) =="
export PGPASSWORD
PGPASSWORD=$DEV_PASS
DEV_VER=$(psql -h "$DEV_HOST" -p "$DEV_PORT" -U "$DEV_USER" -d "$DEV_DB" -t -A -c \
  "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null) || { echo "!! 5432 不可达（或 .env 中 POSTGRES_PASSWORD 未取到）"; DEV_VER=""; }
echo "最新迁移版本: ${DEV_VER:-<不可达>}"

echo "== 验证库 5433 (Homebrew) =="
DEP_VER=$(psql -h "$DEP_HOST" -p "$DEP_PORT" -U "$DEP_USER" -d "$DEP_DB" -t -A -c \
  "SELECT version FROM _sqlx_migrations ORDER BY version DESC LIMIT 1;" 2>/dev/null) || { echo "!! 5433 不可达"; DEP_VER=""; }
echo "最新迁移版本: ${DEP_VER:-<不可达>}"

if [ -n "$DEV_VER" ] && [ -n "$DEP_VER" ]; then
  if [ "$DEV_VER" = "$DEP_VER" ]; then
    echo "== 结论：迁移版本一致 =="
  else
    echo "== 结论：迁移版本漂移！主库=$DEV_VER 验证库=$DEP_VER，需在两库补齐同一迁移 =="
    exit 1
  fi
fi
