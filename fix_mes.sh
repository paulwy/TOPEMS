#!/bin/bash
# MES 编译修复脚本

set -e

echo "=== MES 编译修复脚本 ==="

# 1. 创建所有缺失表的视图
echo "1. 创建数据库视图..."
psql topems << 'EOF'
-- 在 public schema 中创建所有 MES 表的视图
CREATE OR REPLACE VIEW public.equipment AS SELECT * FROM mes.equipment;
CREATE OR REPLACE VIEW public.equipment_maintenance_records AS SELECT * FROM mes.equipment_maintenance_records;
CREATE OR REPLACE VIEW public.equipment_inspections AS SELECT * FROM mes.equipment_inspections;
CREATE OR REPLACE VIEW public.equipment_oee AS SELECT * FROM mes.equipment_oee;
CREATE OR REPLACE VIEW public.work_orders AS SELECT * FROM mes.work_orders;
CREATE OR REPLACE VIEW public.work_reports AS SELECT * FROM mes.work_reports;
CREATE OR REPLACE VIEW public.work_stations AS SELECT * FROM mes.work_stations;
CREATE OR REPLACE VIEW public.production_orders AS SELECT * FROM mes.production_orders;
CREATE OR REPLACE VIEW public.production_records AS SELECT * FROM mes.production_records;
CREATE OR REPLACE VIEW public.production_processes AS SELECT * FROM mes.production_processes;
CREATE OR REPLACE VIEW public.production_schedules AS SELECT * FROM mes.production_schedules;
CREATE OR REPLACE VIEW public.process_routes AS SELECT * FROM mes.process_routes;
CREATE OR REPLACE VIEW public.process_route_steps AS SELECT * FROM mes.process_route_steps;
CREATE OR REPLACE VIEW public.process_flows AS SELECT * FROM mes.process_flows;
CREATE OR REPLACE VIEW public.process_flow_steps AS SELECT * FROM mes.process_flow_steps;
CREATE OR REPLACE VIEW public.material_boms AS SELECT * FROM mes.material_boms;
CREATE OR REPLACE VIEW public.bom_items AS SELECT * FROM mes.bom_items;
CREATE OR REPLACE VIEW public.material_issues AS SELECT * FROM mes.material_issues;
CREATE OR REPLACE VIEW public.material_issue_items AS SELECT * FROM mes.material_issue_items;
CREATE OR REPLACE VIEW public.material_returns AS SELECT * FROM mes.material_returns;
CREATE OR REPLACE VIEW public.material_return_items AS SELECT * FROM mes.material_return_items;
CREATE OR REPLACE VIEW public.material_requirements AS SELECT * FROM mes.material_requirements;
CREATE OR REPLACE VIEW public.quality_inspections AS SELECT * FROM mes.quality_inspections;
CREATE OR REPLACE VIEW public.quality_patrols AS SELECT * FROM mes.quality_patrols;
CREATE OR REPLACE VIEW public.quality_patrol_items AS SELECT * FROM mes.quality_patrol_items;
CREATE OR REPLACE VIEW public.quality_standards AS SELECT * FROM mes.quality_standards;
CREATE OR REPLACE VIEW public.quality_standard_values AS SELECT * FROM mes.quality_standard_values;
CREATE OR REPLACE VIEW public.batch_records AS SELECT * FROM mes.batch_records;
CREATE OR REPLACE VIEW public.wips AS SELECT * FROM mes.wips;
CREATE OR REPLACE VIEW public.wip_transfers AS SELECT * FROM mes.wip_transfers;

-- 授权
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO topems;

EOF
echo "   视图创建完成"

# 2. 修复代码中的语法错误
echo "2. 修复代码语法错误..."
cd /Users/air/TOPEMS/svc/mes/src/modules

# 修复 Some(description) 语法错误
sed -i '' 's/^[[:space:]]*Some(description),/            description: Some(description),/g' equipment.rs

# 修复 naive_utc() 调用
sed -i '' 's/now\.naive_utc()/now/g' equipment_oee.rs material_bom/*.rs material_requirement.rs wip.rs production_scheduling.rs

echo "   代码修复完成"

# 3. 编译 MES
echo "3. 编译 MES 服务..."
cd /Users/air/TOPEMS/svc/mes
export DATABASE_URL="postgresql://topems@localhost:5432/topems"
export MES_FORCE_ONLINE=1

cargo build --release 2>&1 | grep "error\[" | wc -l
