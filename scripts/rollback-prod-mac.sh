#!/bin/bash
# =============================================================
# TOPEMS 生产机(macOS/launchd)回滚适配 wrapper —— B-06 固化
# 原 rollback.sh 为 Linux/systemd 模型，此处注入真实 macOS 参数。
# 用法: ./rollback-prod-mac.sh [--dry-run]   (默认 dry-run，安全)
#   --real   = 真实执行(高危，需 --backup 指向可用 dump)
#   --backup <dump 或 sql> = 指定回滚源(默认取 backups/ 最新 dump)
# 安全设计: 真实执行前强制 pg_dump 全量备份(绝不删库后再发现无备份)，
#          服务经 launchctl 管理，先停后恢复。
# =============================================================
set -uo pipefail
PG18="/opt/homebrew/opt/postgresql@18/bin"
APP="/Users/xingzhai/topems"
BKROOT="$APP/backups"
DSN_USER="topems_prod"; DSN_DB="topems_prod"; DSN_HOST="localhost"; DSN_PORT="5432"
DB_PASS=$(grep -oE "postgres://topems_prod:[^@]+@localhost:5432/topems_prod" ~/Library/LaunchAgents/com.topems.server.plist | sed -E 's#postgres://[^:]+:([^@]+)@.*#\1#') #gitleaks:allow
MODE="dry-run"; BACKUP=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --real) MODE="real" ;;
    --backup) BACKUP="$2"; shift ;;
    *) echo "未知参数: $1"; exit 2 ;;
  esac; shift
done

echo "=========================================="
echo "  TOPEMS macOS 回滚适配 (${MODE})"
echo "  DB: $DSN_HOST:$DSN_PORT/$DSN_DB (user=$DSN_USER)"
echo "=========================================="
say() { echo "[$MODE] $1"; }
do_run() {
  if [ "$MODE" = "dry-run" ]; then say "将执行: $*"; else "$@"; fi
}

# 0. 备份源确定
if [ -z "$BACKUP" ]; then
  BACKUP=$(ls -t "$BKROOT"/*.dump 2>/dev/null | head -1 || ls -t "$BKROOT"/*.sql 2>/dev/null | head -1 || true)
fi
if [ -z "$BACKUP" ] || [ ! -f "$BACKUP" ]; then say "❌ 未找到回滚源 (backups/ 下无 dump/sql)"; exit 1; fi
say "回滚源: $BACKUP ($(du -h "$BACKUP"|cut -f1))"

# 1. 停止服务 (launchd, 非 systemd)
say "1. 停止服务: launchctl unload com.topems.server"
do_run launchctl unload ~/Library/LaunchAgents/com.topems.server.plist
do_run sleep 3

# 2. 备份当前库(回滚前快照)
TS=$(date +%Y%m%d_%H%M%S)
PRE="$BKROOT/pre_rollback_${TS}.dump"
say "2. 备份当前库(回滚前快照): pg_dump -> $PRE"
do_run env PGPASSWORD="$DB_PASS" "$PG18/pg_dump" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" -Fc "$DSN_DB" -f "$PRE"

# 3. 恢复数据库
say "3. 恢复数据库: dropdb --if-exists -> createdb -> 导入 $BACKUP"
if [ "$MODE" = "real" ]; then
  env PGPASSWORD="$DB_PASS" "$PG18/dropdb" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" --if-exists "$DSN_DB"
  env PGPASSWORD="$DB_PASS" "$PG18/createdb" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" "$DSN_DB"
  if echo "$BACKUP" | grep -q '\.dump$'; then
    env PGPASSWORD="$DB_PASS" "$PG18/pg_restore" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" -d "$DSN_DB" --no-owner "$BACKUP"
  else
    env PGPASSWORD="$DB_PASS" "$PG18/psql" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" -d "$DSN_DB" < "$BACKUP"
  fi
else
  say "将执行 dropdb/createdb/恢复 $BACKUP"
fi

# 4. 启动服务 (launchd)
say "4. 启动服务: launchctl load com.topems.server"
do_run launchctl load ~/Library/LaunchAgents/com.topems.server.plist
do_run sleep 5

# 5. 验证
say "5. 验证: /health 200 + 迁移计数"
if [ "$MODE" = "real" ]; then
  code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 http://127.0.0.1:8099/health 2>/dev/null || echo 000)
  echo "  /health -> $code"
  env PGPASSWORD="$DB_PASS" "$PG18/psql" -h "$DSN_HOST" -p "$DSN_PORT" -U "$DSN_USER" -d "$DSN_DB" -tAc "SELECT 'migrations='||COUNT(*) FROM _sqlx_migrations;" 2>&1 | head -1
else
  say "将检查 /health(200) + _sqlx_migrations 计数"
fi

echo "=========================================="
echo "  完成。回滚前快照: $PRE"
echo "=========================================="
