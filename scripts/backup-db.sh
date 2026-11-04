#!/bin/bash
# =============================================
# TOPEMS 生产机每日数据库备份脚本
# =============================================
# 用法：
#   ./scripts/backup-db.sh              # 备份一次
#   launchd 每日自动执行（见下方 plist 配置）
#
# 备份保留：最近 7 天，自动清理更早的
# =============================================

set -e

# ── 配置 ──
DB_NAME="topems_prod"
DB_USER="topems_prod"
BACKUP_DIR="/Users/xingzhai/topems/backups"
KEEP_DAYS=7
PG_DUMP_PATH="/opt/homebrew/bin/pg_dump"

# ── 创建备份目录 ──
mkdir -p "$BACKUP_DIR"

# ── 生成备份文件名 ──
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/topems_prod_${DATE}.sql.gz"

# ── 执行备份 ──
echo "[$(date)] 开始备份数据库 $DB_NAME..."
$PG_DUMP_PATH -U $DB_USER -d $DB_NAME | gzip > "$BACKUP_FILE"

# ── 验证备份文件大小 ──
# 兼容 macOS (BSD stat -f%z) 与 Linux (GNU stat -c%s)
if stat -f%z "$BACKUP_FILE" >/dev/null 2>&1; then
  BYTES=$(stat -f%z "$BACKUP_FILE")
else
  BYTES=$(stat -c%s "$BACKUP_FILE")
fi
if [ "$BYTES" -ge 1073741824 ]; then
  FILE_SIZE="$(awk "BEGIN {printf \"%.1f\", $BYTES/1073741824}")GB"
elif [ "$BYTES" -ge 1048576 ]; then
  FILE_SIZE="$(awk "BEGIN {printf \"%.1f\", $BYTES/1048576}")MB"
elif [ "$BYTES" -ge 1024 ]; then
  FILE_SIZE="$(awk "BEGIN {printf \"%.1f\", $BYTES/1024}")KB"
else
  FILE_SIZE="${BYTES}B"
fi
echo "[$(date)] 备份完成: $BACKUP_FILE ($FILE_SIZE)"

# ── 清理旧备份（保留最近 7 天）──
echo "[$(date)] 清理 $KEEP_DAYS 天前的旧备份..."
find "$BACKUP_DIR" -name "topems_prod_*.sql.gz" -mtime +$KEEP_DAYS -delete

# ── 列出剩余备份数量 ──
REMAINING=$(find "$BACKUP_DIR" -maxdepth 1 -name "topems_prod_*.sql.gz" -type f 2>/dev/null | wc -l | tr -d ' ')
echo "[$(date)] 当前保留 $REMAINING 个备份文件"
