#!/usr/bin/env bash
# backup-config.sh — 生产配置快照（覆盖 Time Machine 之外最怕丢的那部分）
#
# 打包内容：
#   launchd/  com.topems.*.plist（5 个服务托管配置）
#   nginx/    nginx.conf + servers/（topems.conf、topems-ssl.conf）
#   secrets/  ~/topems/.secrets/* 与 ~/topems/secret/*（JWT / DB 口令 / admin）
#   config/   config/*.yaml、.env.production*
#   db/       _sqlx_migrations 已应用版本清单
#   meta/     系统版本、机型、brew 版本、launchd 状态
#
# 产物：~/topems/backups/config/config-snapshot-<TS>.tar.gz（chmod 600，保留最近 8 份）
# 该文件不含数据库数据，正常 < 2 MB，随后由 backup-offsite.sh 一并送去 MBP。
set -euo pipefail
export PATH="/opt/homebrew/bin:/opt/homebrew/opt/postgresql@18/bin:/usr/bin:/bin:/usr/sbin:/sbin"

TS=$(date +%Y%m%d-%H%M%S)
OUT_DIR="$HOME/topems/backups/config"
LOG_FILE="$OUT_DIR/config.log"
KEEP=8

mkdir -p "$OUT_DIR"
log() { echo "[$(date -Iseconds)] $*" >> "$LOG_FILE"; }
fail() { log "FAILED: $*"; echo "FAILED: $*" >&2; exit 1; }

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
STAGE="$TMP/topems-config-$TS"
mkdir -p "$STAGE"/{launchd,nginx,secrets,config,db,meta}

# --- launchd ---
cp "$HOME"/Library/LaunchAgents/com.topems.*.plist "$STAGE/launchd/" 2>/dev/null || true

# --- nginx ---
cp /opt/homebrew/etc/nginx/nginx.conf "$STAGE/nginx/" 2>/dev/null || true
cp -R /opt/homebrew/etc/nginx/servers "$STAGE/nginx/" 2>/dev/null || true

# --- 密钥 ---
cp "$HOME"/topems/.secrets/* "$STAGE/secrets/" 2>/dev/null || true
cp "$HOME"/topems/secret/* "$STAGE/secrets/" 2>/dev/null || true

# --- 应用配置 ---
cp "$HOME"/topems/config/*.yaml "$HOME"/topems/config/*.yml "$STAGE/config/" 2>/dev/null || true
cp "$HOME"/topems/.env.production* "$STAGE/config/" 2>/dev/null || true

# --- 迁移版本清单（不含数据）---
if ! psql -h 127.0.0.1 -U xingzhai -d topems_prod -tAF, \
     -c "select version, description, installed_on from _sqlx_migrations order by version" \
     > "$STAGE/db/migrations.csv" 2>"$TMP/psql.err"; then
  echo "psql 查询失败：$(cat "$TMP/psql.err")" > "$STAGE/db/migrations.csv"
fi

# --- 环境信息 ---
{ sw_vers; echo "model: $(sysctl -n hw.model)"; echo "mem: $(sysctl -n hw.memsize)"; } > "$STAGE/meta/system.txt" 2>/dev/null || true
brew list --versions > "$STAGE/meta/brew.txt" 2>/dev/null || true
launchctl list 2>/dev/null | grep -i topems > "$STAGE/meta/launchd.txt" || true

# --- 打包（权限收紧）---
chmod -R go-rwx "$STAGE"
ARCHIVE="$OUT_DIR/config-snapshot-$TS.tar.gz"
tar -czf "$ARCHIVE" -C "$TMP" "topems-config-$TS" || fail "打包失败"
chmod 600 "$ARCHIVE"

# --- 自检：能列出内容且非空 ---
if ! tar -tzf "$ARCHIVE" >/dev/null 2>&1; then
  fail "产物不可读：${ARCHIVE}"
fi
SIZE=$(du -h "$ARCHIVE" | awk '{print $1}')
COUNT=$(tar -tzf "$ARCHIVE" | wc -l | tr -d ' ')

# --- 保留最近 KEEP 份 ---
find "$OUT_DIR" -maxdepth 1 -name 'config-snapshot-*.tar.gz' -type f 2>/dev/null \
  | sort -r | tail -n +$((KEEP + 1)) | while IFS= read -r old; do
      rm -f "$old" && log "PRUNE：$(basename "$old")"
    done

log "OK：配置快照 $(basename "$ARCHIVE")（${SIZE}，${COUNT} 个条目）"
echo "OK：$(basename "$ARCHIVE")（${SIZE}）"
