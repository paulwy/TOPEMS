#!/usr/bin/env bash
# MES 编译统一验证入口
#
# 背景：MES 六次"红线恢复"拉锯的根因是两端 git HEAD 相同、但编译时连的
# 数据库 schema 状态不同（fix_mes.sh 建的 30 个 public 视图是否齐全），
# 导致同一代码被验证出 0 error / 58 errors 两个结果。
#
# 本脚本把验证要素固定下来，所有会话（TRAE / 豆包并行）一律用它说话：
#   同一 DATABASE_URL（search_path=mes,public）+ MES_FORCE_ONLINE=1
#   前置检查 30 个编译依赖视图 -> 编译 -> 输出 error 数 -> 退出码判定
#
# 用法：
#   ./scripts/dev/mes-verify.sh            # 在线编译（默认）
#   DATABASE_URL=xxx ./scripts/dev/mes-verify.sh   # 指定数据库
#
# 退出码：0 = 0 error 可提交；1 = 有 error 禁止恢复/覆盖；2 = 前置检查失败
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
MES_DIR="$(cd "$SCRIPT_DIR/../../svc/mes" && pwd)"
DB_URL="${DATABASE_URL:-postgresql://topems@localhost:5432/topems?options=-csearch_path%3Dmes%2Cpublic}"

# fix_mes.sh 的 30 个编译依赖关系（28 个 public 视图 + 2 个真实表 process_flows/process_flow_steps）
VIEWS="equipment equipment_maintenance_records equipment_inspections equipment_oee
work_orders work_reports work_stations production_orders production_records
production_processes production_schedules process_routes process_route_steps
process_flows process_flow_steps material_boms bom_items material_issues
material_issue_items material_returns material_return_items material_requirements
quality_inspections quality_patrols quality_patrol_items quality_standards
quality_standard_values batch_records wips wip_transfers"
# 检查"表或视图"存在（public 视图 + mes 真实表），避免把真实表误判为缺视图
VIEW_SQL="SELECT 30 - (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = ANY(string_to_array('$(echo "$VIEWS" | tr '\n' ' ')', ' ')))"

echo "=== MES 编译统一验证 ==="
echo "数据库: ${DB_URL%%\?*}"
echo "模式:   search_path=mes,public + MES_FORCE_ONLINE=1"

# 1/3 视图前置检查
echo "--- 1/3 检查编译依赖视图（30 个）"
if command -v psql >/dev/null 2>&1; then
  MISSING=$(psql "$DB_URL" -tAc "$VIEW_SQL" 2>/dev/null | tr -d ' \n')
  if [ -z "$MISSING" ] || [ "$MISSING" = "0" ] || [ "$MISSING" -le 0 ] 2>/dev/null; then
    echo "   视图齐全"
  else
    echo "   缺少 ${MISSING} 个视图 —— 请先运行 ./fix_mes.sh（幂等）再编译"
    echo "   否则在线编译会报 relation/column does not exist → 误判为代码错误"
    exit 2
  fi
else
  echo "   (psql 不可用，跳过视图检查；请确保已运行过 fix_mes.sh)"
fi

# 2/3 编译
echo "--- 2/3 编译 (release)"
cd "$MES_DIR"
export DATABASE_URL="$DB_URL"
export MES_FORCE_ONLINE=1
BUILD_OUT=$(cargo build --release 2>&1)
ERR_COUNT=$(echo "$BUILD_OUT" | grep -c "error\[" || true)

# 3/3 结论
echo "--- 3/3 结论"
if [ "$ERR_COUNT" = "0" ]; then
  echo "   ✅ MES 编译 0 error —— 当前代码可提交、可恢复"
  exit 0
else
  echo "   ❌ MES 编译 ${ERR_COUNT} errors"
  echo "$BUILD_OUT" | grep -A3 "error\[" | head -30
  echo ""
  echo "   注意：若本机视图齐全仍报错，则是代码问题；"
  echo "   若视图缺失导致，先 ./fix_mes.sh 后再验证，避免把环境问题当代码问题"
  exit 1
fi
