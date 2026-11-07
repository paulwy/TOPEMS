#!/usr/bin/env bash
# P5 IAM 副本归一：一键回滚（批 10 / 2026-11-06）
#
# 用途：批 10 归一后若应用不可用（登录/权限校验/租户隔离异常），执行本脚本恢复。
#
# 使用：
#   DB="postgres://topems_app:xxx@127.0.0.1:5432/topems" bash scripts/p5/rollback_iam_replicas.sh
#
# 步骤：
#   1. 恢复 mes / flow 备份（重建被清理的副本表与数据）
#   2. 恢复 .env 的 SEARCH_PATH 原值（iam,shared,public）
#   3. 提示人工复核：public 中由 20261107000001 迁移补入的 4 条码可保留（无害，幂等）
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
BACKUP_DIR="$ROOT/database/backup/p5_20261106"
DB="${DB:-}"

if [[ -z "$DB" ]]; then
  echo "ERROR: 需通过环境变量 DB 提供数据库连接串" >&2
  exit 1
fi

# 生产库护栏：本脚本会写库恢复副本表并改写 .env 的 SEARCH_PATH，目标为生产库时默认拒绝
# （命名风格对齐 scripts/dev/run-e2e-stack.sh 的 E2E_ALLOW_PROD）
TARGET_DB_NAME="${DB%%\?*}"
TARGET_DB_NAME="${TARGET_DB_NAME##*/}"
if [[ "$TARGET_DB_NAME" == "topems_prod" && "${ALLOW_PROD_ROLLBACK:-0}" != "1" ]]; then
  echo "ERROR: 拒绝在库 ${TARGET_DB_NAME} 上执行回滚（会写库并改写 .env 的 SEARCH_PATH）。如确需执行，显式设置 ALLOW_PROD_ROLLBACK=1" >&2
  exit 2
fi

echo "[1/3] 恢复 mes 副本 ..."
psql "$DB" -f "$BACKUP_DIR/mes_iam_core.sql"

echo "[2/3] 恢复 flow 副本 ..."
psql "$DB" -f "$BACKUP_DIR/flow_iam_core.sql"

echo "[3/3] 恢复 .env SEARCH_PATH ..."
if [[ -f "$ROOT/.env" ]]; then
  sed -i '' 's/^SEARCH_PATH=.*/SEARCH_PATH=iam,shared,public/' "$ROOT/.env" 2>/dev/null \
    || sed -i 's/^SEARCH_PATH=.*/SEARCH_PATH=iam,shared,public/' "$ROOT/.env"
  grep -n "^SEARCH_PATH" "$ROOT/.env"
fi

echo "回滚完成。请重启应用并复测登录/权限/租户隔离。"
