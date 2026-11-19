#!/usr/bin/env bash
# backup-topems.sh — Daily pg_dump of topems_prod (custom format, keep 7 days)
#
# 连接方式：Unix socket + peer 认证（OS 用户 xingzhai ↔ 数据库角色 xingzhai）。
# 不传 -h/-U：launchd 环境下拿不到口令，TCP + scram 必然失败（2026-11-19 的 0 字节
# dump 就是这么来的）。peer 走 socket，无需口令，与 pg_hba 的 `local all all peer` 对齐。
set -euo pipefail
export PATH="/opt/homebrew/opt/postgresql@18/bin:$PATH"

TS=$(date +%Y%m%d-%H%M%S)
BACKUP_DIR="$HOME/topems/backups"
LOG_FILE="$BACKUP_DIR/backup.log"
OUT="$BACKUP_DIR/topems_prod-$TS.dump"
TMP="$OUT.partial"

mkdir -p "$BACKUP_DIR"
echo "[$(date -Iseconds)] Starting backup..." >> "$LOG_FILE"

cleanup() { rm -f "$TMP" 2>/dev/null || true; }
trap cleanup EXIT

# 先写 .partial，校验通过再改名：失败绝不会在 backups/ 留下 0 字节或半截文件，
# 避免离机归档脚本把坏文件当成“最新副本”取走。
pg_dump -d topems_prod --no-owner --format=custom --file="$TMP"

if ! pg_restore --list "$TMP" >/dev/null 2>&1; then
  echo "[$(date -Iseconds)] FAILED: dump 不可读（$(du -h "$TMP" 2>/dev/null | cut -f1)）" >> "$LOG_FILE"
  exit 1
fi

SIZE=$(stat -f%z "$TMP")
if [ "$SIZE" -lt 1048576 ]; then
  echo "[$(date -Iseconds)] FAILED: dump 体积异常（${SIZE} bytes < 1 MiB）" >> "$LOG_FILE"
  exit 1
fi

mv "$TMP" "$OUT"
echo "[$(date -Iseconds)] OK: backup created and verified (topems_prod-$TS.dump, ${SIZE} bytes)" >> "$LOG_FILE"

# Keep only latest 7 backups (delete 8th and older)
ls -t "$BACKUP_DIR"/topems_prod-*.dump 2>/dev/null | tail -n +8 | xargs -r rm -f
