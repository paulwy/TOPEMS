#!/usr/bin/env bash
# MES 编译统一验证入口
#
# 背景（六次"红线恢复"拉锯的根因）：
#   MES 源码在两端 git HEAD 相同，但编译结果 0 error / 58 errors 不同。
#   真因不是代码差异，而是"编译用哪个 schema 事实源"：
#     - 离线编译（默认，SQLX_OFFLINE=true + 根 .sqlx/ 缓存，308 条）：用权威库
#       prepare 出的缓存 -> 任何环境结果一致 -> 0 error（红线恢复方所见）
#     - 在线编译（连库）：本机 topems 库非 MES 权威 schema（mes 仅 2 表，
#       30 个 public 视图为悬空兜底、列全可空）-> 解析出 Option<Uuid> 等
#       类型差异 -> E0308 等错误（types 适配方所见 58 errors）
#   两边都"实测"过，但测的是不同事实源，于是同一提交被验证出相反结论。
#
# 本脚本默认走离线（权威事实源），杜绝"两个结果"：
#   ./scripts/dev/mes-verify.sh          # 离线编译（默认，推荐，CI 亦如此）
#   ./scripts/dev/mes-verify.sh -o       # 在线编译（连 DATABASE_URL 库，仅供排查）
#
# 退出码：0 = 0 error 可提交；1 = 有 error 禁止恢复/覆盖；2 = 环境缺失
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MES_DIR="$(cd "$SCRIPT_DIR/../../svc/mes" && pwd)"
ROOT_DIR="$(cd "$SCRIPT_DIR/../.." && pwd)"
MODE="offline"
if [ "${1:-}" = "-o" ]; then MODE="online"; fi

echo "=== MES 编译统一验证 ==="
echo "模式:   ${MODE}（$([ "$MODE" = offline ] && echo "离线/根 .sqlx/ 缓存（权威事实源）" || echo "在线/连库（本机库非权威 schema，仅作排查参考）")"

# 前置检查
if [ "$MODE" = "offline" ]; then
  CACHE_COUNT=$(ls "$ROOT_DIR/.sqlx/"*.json 2>/dev/null | wc -l | tr -d ' ')
  if [ "$CACHE_COUNT" -lt 100 ]; then
    echo "   ❌ 根 .sqlx/ 缓存不足（${CACHE_COUNT} 条）——请连权威库刷新："
    echo "      DATABASE_URL=<权威库> SQLX_OFFLINE=false ./scripts/dev/sqlx-prepare.sh -p topems-mes"
    exit 2
  fi
  echo "   离线缓存: ${CACHE_COUNT} 条（.sqlx/，已入库，CI 同源）"
else
  DB_URL="${DATABASE_URL:-postgresql://topems@localhost:5432/topems?options=-csearch_path%3Dmes%2Cpublic}"
  echo "   数据库:   ${DB_URL%%\?*}"
  echo "   ⚠ 本机库非 MES 权威 schema（mes 仅 2 表，public 视图悬空可空）"
  echo "     prepare/在线结果不代表代码真实错误，仅用于差异排查"
fi

# 编译
echo "--- 编译 (release)"
cd "$MES_DIR"
unset DATABASE_URL MES_FORCE_ONLINE SQLX_OFFLINE
if [ "$MODE" = "online" ]; then
  export DATABASE_URL="$DB_URL"
  export SQLX_OFFLINE=false
fi
BUILD_OUT=$(cargo build --release 2>&1)
ERR_COUNT=$(echo "$BUILD_OUT" | grep -c "error\[" || true)

# 结论
echo "--- 结论"
if [ "$ERR_COUNT" = "0" ]; then
  echo "   ✅ MES 编译 0 error —— 当前代码可提交、可恢复"
  exit 0
else
  echo "   ❌ MES 编译 ${ERR_COUNT} errors"
  echo "$BUILD_OUT" | grep -A3 "error\[" | head -30
  if [ "$MODE" = "online" ]; then
    echo ""
    echo "   注意：在线错误多源于本机库非权威 schema（视图悬空/列可空），"
    echo "   请先以离线模式验证；离线 0 error 即代码可提交。"
  fi
  exit 1
fi
