#!/usr/bin/env bash
# =============================================================================
# TOPEMS target 目录磁盘治理脚本 (clean_target.sh)
# =============================================================================
#
# 背景: 2026-09-24 target 膨胀至 176.8GiB 导致磁盘写满（编译/日志失败），
#       cargo clean 释放后建立本预防工具。
#       膨胀主因: debug+release 增量编译缓存(incremental) 长期累积。
#
# 用法:
#   ./scripts/clean_target.sh          # 仅清增量缓存（保留最终产物，日常推荐）
#   ./scripts/clean_target.sh --full   # cargo clean 全量清理（需全量重编译）
#   ./scripts/clean_target.sh --check  # 只统计不清理（查看占用）
#   ./scripts/clean_target.sh --auto   # 超阈值(默认 25G)自动清增量缓存
#
# 阈值可通过环境变量 TARGET_WARN_GB 覆盖（默认 25G）。
# =============================================================================
set -uo pipefail

TARGET_DIR="${CARGO_TARGET_DIR:-$PWD/target}"
WARN_GB="${TARGET_WARN_GB:-25}"
MODE="${1:-incremental}"

if [ ! -d "$TARGET_DIR" ]; then
  echo "[clean_target] target 目录不存在: $TARGET_DIR"
  exit 0
fi

SIZE_GB=$(du -sm "$TARGET_DIR" 2>/dev/null | cut -f1 | awk '{printf "%.1f", $1/1024}')
INCR_GB=$(du -sm "$TARGET_DIR/debug/incremental" "$TARGET_DIR/release/incremental" 2>/dev/null | awk '{s+=$1} END {printf "%.1f", s/1024}')

echo "[clean_target] target 总占用: ${SIZE_GB}G | 增量缓存: ${INCR_GB}G (阈值 ${WARN_GB}G)"

if [ "$MODE" = "--check" ]; then
  exit 0
fi

# --auto: 超阈值则执行增量清理，未超则退出
if [ "$MODE" = "--auto" ]; then
  ABOVE=$(echo "$SIZE_GB" | awk -v w="$WARN_GB" '{print ($1>w)?1:0}')
  if [ "$ABOVE" != "1" ]; then
    echo "[clean_target] 未超阈值，无需清理"
    exit 0
  fi
  echo "[clean_target] 超过阈值 ${WARN_GB}G，自动清理增量缓存"
  MODE=incremental
fi

if [ "$MODE" = "--full" ]; then
  echo "[clean_target] cargo clean 全量清理..."
  cargo clean
elif [ "$MODE" = "incremental" ]; then
  echo "[clean_target] 清理增量缓存（保留最终产物）..."
  rm -rf "$TARGET_DIR/debug/incremental" "$TARGET_DIR/release/incremental"
else
  echo "用法: $0 [--check|--full|--auto]"
  exit 1
fi

AFTER_GB=$(du -sm "$TARGET_DIR" 2>/dev/null | cut -f1 | awk '{printf "%.1f", $1/1024}')
echo "[clean_target] 清理完成: ${SIZE_GB}G → ${AFTER_GB}G（节省 $(echo "$SIZE_GB $AFTER_GB" | awk '{printf "%.1f", $1-$2}')G）"
