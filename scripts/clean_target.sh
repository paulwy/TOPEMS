#!/usr/bin/env bash
# =============================================================================
# TOPEMS target 目录磁盘治理脚本 (clean_target.sh)
# =============================================================================
#
# 背景: 2026-09-24 target 膨胀至 176.8GiB 导致磁盘写满（编译/日志失败），
#       cargo clean 释放后建立本预防工具。
#       膨胀主因: debug+release 增量编译缓存(incremental) 长期累积。
#
# 2026-11-27 补充: 第二次同类事故（可用空间仅剩 101 MiB，回收 56.5G）不是仓库 target
#       引起的，而是窗口/夜间构建把 CARGO_TARGET_DIR 指到 $HOME 后残留的游离 target。
#       本脚本原先只认 $PWD/target，覆盖不到它们，现补齐：
#         - $HOME/topems-target-*            （旧式手工窗口构建，已废弃）
#         - $HOME/.cache/topems-target-*     （旧式夜间构建，已废弃）
#         - $HOME/.cache/topems/nightly-target（规范路径，失败保留 ≤ 7 天）
#       落点与保留期约定见 docs/ops/ops-workspace-and-build-cache-convention-2026-11-27.md
#
# 用法:
#   ./scripts/clean_target.sh          # 仅清增量缓存（保留最终产物，日常推荐）
#   ./scripts/clean_target.sh --full   # cargo clean 全量清理（需全量重编译）
#   ./scripts/clean_target.sh --check  # 只统计不清理（查看占用，含游离 target）
#   ./scripts/clean_target.sh --auto   # 超阈值(默认 25G)自动清增量缓存 + 清超期游离 target
#
# 2026-10-01: 主入口已集成到 scripts/topems.sh clean --debug / --debug-full / --sccache；
#             svc/*/target 与 lib/*/target 嵌套残留由 topems.sh clean 一并处理。
#             本脚本保留用于脚本/CI 的阈值自动清理（--auto）。
#
# 阈值可通过环境变量 TARGET_WARN_GB 覆盖（默认 25G）。
# 游离 target 保留天数可通过 STRAY_TARGET_KEEP_DAYS 覆盖（默认 7 天）。
# =============================================================================
set -uo pipefail

TARGET_DIR="${CARGO_TARGET_DIR:-$PWD/target}"
WARN_GB="${TARGET_WARN_GB:-25}"
STRAY_KEEP_DAYS="${STRAY_TARGET_KEEP_DAYS:-7}"
MODE="${1:-incremental}"

# ── 游离 target（$HOME 下的历史残留）─────────────────────────────────────
stray_targets() {
  local d
  for d in "$HOME"/topems-target-* \
           "$HOME"/.cache/topems-target-* \
           "$HOME"/.cache/topems/nightly-target; do
    [ -d "$d" ] && printf '%s\n' "$d"
  done
  return 0
}

report_strays() {
  local d kb age total_kb=0 found=0
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    found=1
    kb=$(du -sk "$d" 2>/dev/null | cut -f1)
    total_kb=$((total_kb + ${kb:-0}))
    age=$(( ( $(date +%s) - $(stat -f '%m' "$d" 2>/dev/null || echo 0) ) / 86400 ))
    echo "[clean_target]   游离 target: $d  $(awk -v k="${kb:-0}" 'BEGIN{printf "%.1fG", k/1048576}')  已 ${age} 天"
  done < <(stray_targets)
  [ "$found" = "1" ] || echo "[clean_target]   游离 target: 无"
  STRAY_TOTAL_KB=$total_kb
}

clean_strays() {
  local d kb age freed_kb=0 kept=0
  if pgrep -f "cargo (build|test|check|nextest)" >/dev/null 2>&1; then
    echo "[clean_target] 检测到 cargo 编译/测试在跑，跳过游离 target 清理"
    return 0
  fi
  while IFS= read -r d; do
    [ -n "$d" ] || continue
    age=$(( ( $(date +%s) - $(stat -f '%m' "$d" 2>/dev/null || echo 0) ) / 86400 ))
    if [ "$age" -lt "$STRAY_KEEP_DAYS" ]; then
      kept=$((kept + 1))
      echo "[clean_target]   保留（${age} 天 < ${STRAY_KEEP_DAYS} 天）: $d"
      continue
    fi
    kb=$(du -sk "$d" 2>/dev/null | cut -f1)
    rm -rf "$d" && echo "[clean_target]   已删除（${age} 天）: ${d}（$(awk -v k="${kb:-0}" 'BEGIN{printf "%.1fG", k/1048576}')）"
    freed_kb=$((freed_kb + ${kb:-0}))
  done < <(stray_targets)
  [ "$kept" -gt 0 ] && echo "[clean_target]   未超期保留 ${kept} 项"
  STRAY_FREED_KB=$freed_kb
  return 0
}

# ── 仓库 target ─────────────────────────────────────────────────────────
if [ -d "$TARGET_DIR" ]; then
  SIZE_GB=$(du -sm "$TARGET_DIR" 2>/dev/null | cut -f1 | awk '{printf "%.1f", $1/1024}')
  INCR_GB=$(du -sm "$TARGET_DIR/debug/incremental" "$TARGET_DIR/release/incremental" 2>/dev/null | awk '{s+=$1} END {printf "%.1f", s/1024}')
  echo "[clean_target] target 总占用: ${SIZE_GB}G | 增量缓存: ${INCR_GB}G (阈值 ${WARN_GB}G)"
else
  SIZE_GB=0
  echo "[clean_target] target 目录不存在: $TARGET_DIR"
fi

echo "[clean_target] 游离 target（\$HOME 下，保留 ${STRAY_KEEP_DAYS} 天）:"
report_strays

if [ "$MODE" = "--check" ]; then
  TOTAL_GB=$(awk -v g="${SIZE_GB:-0}" -v k="${STRAY_TOTAL_KB:-0}" 'BEGIN{printf "%.1f", g + k/1048576}')
  echo "[clean_target] 汇总占用: ${TOTAL_GB}G（仓库 target ${SIZE_GB}G + 游离 $(awk -v k="${STRAY_TOTAL_KB:-0}" 'BEGIN{printf "%.1f", k/1048576}')G）"
  exit 0
fi

# --auto: 超阈值则执行增量清理 + 清超期游离 target，未超阈值也清超期游离
if [ "$MODE" = "--auto" ]; then
  ABOVE=$(echo "${SIZE_GB:-0}" | awk -v w="$WARN_GB" '{print ($1>w)?1:0}')
  if [ "$ABOVE" = "1" ]; then
    echo "[clean_target] 超过阈值 ${WARN_GB}G，自动清理增量缓存"
    MODE=incremental
  else
    echo "[clean_target] 仓库 target 未超阈值，仅处理游离 target"
    MODE=stray-only
  fi
  clean_strays
  [ "${STRAY_FREED_KB:-0}" -gt 0 ] && echo "[clean_target] 游离 target 释放 $(awk -v k="$STRAY_FREED_KB" 'BEGIN{printf "%.1fG", k/1048576}')"
fi

if [ "$MODE" = "--full" ]; then
  echo "[clean_target] cargo clean 全量清理..."
  cargo clean
elif [ "$MODE" = "incremental" ]; then
  echo "[clean_target] 清理增量缓存（保留最终产物）..."
  rm -rf "$TARGET_DIR/debug/incremental" "$TARGET_DIR/release/incremental"
elif [ "$MODE" = "stray-only" ]; then
  exit 0
else
  echo "用法: $0 [--check|--full|--auto]"
  exit 1
fi

AFTER_GB=$(du -sm "$TARGET_DIR" 2>/dev/null | cut -f1 | awk '{printf "%.1f", $1/1024}')
echo "[clean_target] 清理完成: ${SIZE_GB}G → ${AFTER_GB}G（节省 $(echo "${SIZE_GB:-0} ${AFTER_GB:-0}" | awk '{printf "%.1f", $1-$2}')G）"
