#!/bin/bash
# MES 编译修复脚本（v2）
#
# 历史问题（已修复）：
#   v1 曾在 public schema 创建 30 个"表视图"（CREATE VIEW public.equipment AS SELECT * FROM mes.equipment），
#   但 PostgreSQL 视图列被 information_schema 保守推断为可空（is_nullable=YES），
#   导致 sqlx 宏把 NOT NULL 列（id/flow_id/name 等）解析成 Option<T>，编译报 353 个类型错误。
#   同时 public 遗留的旧表（process_flows/process_flow_steps 等）结构与 mes schema 不一致，同样污染解析。
#
# 正确做法：
#   1. public schema 不得有 mes 同名视图/旧表遮蔽；
#   2. 编译时 DATABASE_URL 必须带 search_path=mes,public，让 sqlx 宏解析到 mes schema 的真实表（NOT NULL 语义正确）。
#
# 若日后出现 "table does not exist" / "Option<Uuid> 类型不匹配" 类错误，按上面两点排查。

set -e

echo "=== MES 编译修复脚本 v2 ==="

# 0. 清理 public schema 中可能存在的 mes 遮蔽对象（幂等，安全）
echo "0. 清理 public 中 mes 遮蔽对象（视图/旧表，幂等）..."
psql "postgresql://topems_app:topems_app_secret@localhost:5432/topems" << 'EOF'
-- 历史 v1 创建的视图（DROP VIEW 失败即非视图，继续）
DROP VIEW IF EXISTS public.equipment, public.equipment_maintenance_records, public.equipment_inspections, public.equipment_oee, public.work_orders, public.work_reports, public.work_stations, public.production_orders, public.production_records, public.production_processes, public.production_schedules, public.process_routes, public.process_route_steps, public.material_boms, public.bom_items, public.material_issues, public.material_issue_items, public.material_returns, public.material_return_items, public.material_requirements, public.quality_inspections, public.quality_patrols, public.quality_patrol_items, public.quality_standards, public.quality_standard_values, public.batch_records, public.wips, public.wip_transfers;
-- 历史遗留旧表（与 mes schema 重复且结构不一致）
DROP TABLE IF EXISTS public.process_flows, public.process_flow_steps, public.material_plans, public.production_plans, public.quality_records, public.material_categories, public.material_requirement_items;
EOF
echo "   清理完成"

# 1. 修复代码语法错误（幂等）
echo "1. 修复代码语法错误..."
cd /Users/air/TOPEMS/svc/mes/src/modules

# 修复 Some(description) 语法错误
sed -i '' 's/^[[:space:]]*Some(description),/            description: Some(description),/g' equipment.rs

# 修复 naive_utc() 调用
sed -i '' 's/now\.naive_utc()/now/g' equipment_oee.rs material_bom/*.rs material_requirement.rs wip.rs production_scheduling.rs

echo "   代码修复完成"

# 2. 编译 MES（search_path 必须指向 mes schema）
echo "2. 编译 MES 服务..."
cd /Users/air/TOPEMS/svc/mes
# 注意：?options=-csearch_path%3Dmes%2Cpublic 让 sqlx 宏在线解析到 mes schema 真实表
# 重要：必须删除 .sqlx 离线缓存（gitignore，不入库）。prepare 中断产生的残留缓存
#       会让宏走离线解析并命中错误类型（Option<T>），导致 167 个编译错误。
rm -f .sqlx/query-*.json
export DATABASE_URL="postgresql://topems@localhost:5432/topems?options=-csearch_path%3Dmes%2Cpublic"
export MES_FORCE_ONLINE=1

cargo build --release 2>&1 | grep -E "error\[|Finished|error: could not compile" | head -20
