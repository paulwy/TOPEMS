#!/usr/bin/env bash
# =============================================
# TOPEMS nginx 日志轮转脚本（macOS 生产模板）
# =============================================
# 用法：
#   ./scripts/rotate-nginx-logs.sh
#   launchd 每日自动执行（生产机 label：com.topems.nginx-logrotate）
#
# 策略：
#   - access.log / error.log 改名为带时间戳文件，touch 新文件并 chmod 644
#   - 向 nginx master 发 SIGUSR1 重新打开日志文件
#   - 只保留最近 KEEP_DAYS 份轮转文件
#
# 可用环境变量覆盖（便于不同部署目录/本机验证）：
#   TOPEMS_HOME / LOG_DIR / NGINX_PID / KEEP_DAYS
# =============================================

set -euo pipefail

TOPEMS_HOME="${TOPEMS_HOME:-$HOME/topems}"
LOG_DIR="${LOG_DIR:-$TOPEMS_HOME/nginx/logs}"
NGINX_PID="${NGINX_PID:-/opt/homebrew/var/run/nginx.pid}"
KEEP_DAYS="${KEEP_DAYS:-7}"

mkdir -p "$LOG_DIR"

echo "[$(date -Iseconds)] Starting nginx log rotation..."

# ── 轮转单个日志 ──
rotate_one() {
  local name="$1"
  local file="$LOG_DIR/$name.log"
  [[ -f "$file" ]] || return 0

  local ts
  ts=$(date +%Y%m%d-%H%M%S)
  mv "$file" "$file.$ts"
  touch "$file"
  chmod 644 "$file"
  echo "[$(date -Iseconds)] Rotated $name.log -> $name.log.$ts"
}

rotate_one access
rotate_one error

# ── 通知 nginx 重新打开日志文件 ──
# brew 前缀 PID 为权威位置；缺失时回退到应用目录下的旧 PID（兼容历史部署）
[[ -f "$NGINX_PID" ]] || NGINX_PID="$TOPEMS_HOME/nginx/nginx.pid"
if [[ -f "$NGINX_PID" ]]; then
  MASTER_PID=$(cat "$NGINX_PID")
  if kill -0 "$MASTER_PID" 2>/dev/null; then
    kill -USR1 "$MASTER_PID"
    echo "[$(date -Iseconds)] Sent SIGUSR1 to nginx master (PID $MASTER_PID)"
  else
    echo "[$(date -Iseconds)] WARNING: nginx PID file exists but process $MASTER_PID not running" >&2
  fi
else
  echo "[$(date -Iseconds)] WARNING: nginx PID file not found at $NGINX_PID" >&2
fi

# ── 只保留最近 KEEP_DAYS 份（文件名含时间戳，ls -t 按修改时间倒序）──
for logtype in access error; do
  # shellcheck disable=SC2012
  while IFS= read -r f; do
    [[ -n "$f" ]] && rm -f "$f"
  done < <(ls -t "$LOG_DIR/${logtype}.log."* 2>/dev/null | tail -n +$((KEEP_DAYS + 1)))
done

echo "[$(date -Iseconds)] Nginx log rotation complete"
