#!/bin/bash
# =============================================
# TOPEMS 生产机应用日志轮转脚本（P2 挂账）
# =============================================
# 用法：
#   ./scripts/rotate-logs.sh              # 轮转一次
#   launchd 每日自动执行（见 com.topems.log-rotate.plist）
#
# 策略：
#   - 日志文件超过 MAX_SIZE_MB 即 gzip 复制归档（gzip -c，等价 cp）+ 原地 truncate
#     （`: > file`，保持 inode 不变；launchd 持有 fd，禁止 mv，否则进程会继续写旧 inode）
#   - 每个日志保留最近 KEEP_ARCHIVES 个归档，自动清理更早的
#   - 幂等：未达阈值或刚轮转完（size=0）时不做任何改动，可重复执行
# 支持环境变量覆盖（便于本地验证/自定义）：LOG_DIR / MAX_SIZE_MB / KEEP_ARCHIVES
# =============================================

set -e

# ── 配置（可用环境变量覆盖）──
LOG_DIR="${LOG_DIR:-/Users/xingzhai/topems/logs}"
MAX_SIZE_MB="${MAX_SIZE_MB:-50}"
KEEP_ARCHIVES="${KEEP_ARCHIVES:-7}"

# ── 轮转单个日志文件 ──
rotate() {
  local file="$1"
  [ -f "$file" ] || return 0

  # 兼容 macOS（BSD stat）与 Linux（GNU stat）
  local size size_mb stamp
  if stat -f%z "$file" >/dev/null 2>&1; then
    size=$(stat -f%z "$file")
  else
    size=$(stat -c%s "$file")
  fi
  size_mb=$((size / 1024 / 1024))

  if [ "$size_mb" -ge "$MAX_SIZE_MB" ]; then
    stamp=$(date +%Y%m%d_%H%M%S)
    gzip -c "$file" > "${file}.${stamp}.gz"
    : > "$file"
    echo "[$(date)] 轮转: $file (${size_mb}MB) -> $(basename "${file}.${stamp}.gz")"
  else
    echo "[$(date)] $file 当前 ${size_mb}MB，未达阈值 ${MAX_SIZE_MB}MB，跳过"
  fi

  # 清理旧归档（保留最近 KEEP_ARCHIVES 个）
  # shellcheck disable=SC2012
  ls -1t "${file}".*.gz 2>/dev/null | tail -n +$((KEEP_ARCHIVES + 1)) | xargs -r rm -f
}

# ── 轮转目标 ──
mkdir -p "$LOG_DIR"
rotate "$LOG_DIR/server.log"
rotate "$LOG_DIR/server.err.log"
# launchd StandardOutPath / StandardErrorPath 实际落盘文件
# （com.topems.server.plist 写的是 server.out / server.err；fd 由 launchd 持有，
#   必须原地 truncate，mv 会让进程继续写已改名的旧 inode）
rotate "$LOG_DIR/server.out"
rotate "$LOG_DIR/server.err"

# ── 汇总 ──
# shellcheck disable=SC2012
TOTAL=$(ls -1 "$LOG_DIR"/*.gz 2>/dev/null | wc -l | tr -d ' ')
echo "[$(date)] 日志轮转完成，当前归档 $TOTAL 个"
