-- 2026-09-01 影子表清理：public 残留的 pdm/mes/analytics 旧表（代码经 search_path 用 pdm/mes/bi schema 同名新表，public 为历史遗留空表/影子表）
-- 治理依据：database-schema-ownership-review.md 归属矩阵（pdm_*/production_*/equipment_*/work_*/wip*/bom_items/quality_records→pdm|mes；analytics_*→bi）
-- 已审计：46 张表无显式 public.* 代码引用、无视图依赖、30+13 张 0 行（production_records 3 行/analytics_comparison_* 各 1 行为历史残留，备份 topems_pre_shadow_drop_20260901_0009.dump）
-- 备份：database/backup/topems_pre_shadow_drop_20260901_0009.dump

DROP TABLE IF EXISTS public.wip_transfers CASCADE;
DROP TABLE IF EXISTS public.wips CASCADE;
DROP TABLE IF EXISTS public.work_orders CASCADE;
DROP TABLE IF EXISTS public.work_reports CASCADE;
DROP TABLE IF EXISTS public.work_stations CASCADE;
DROP TABLE IF EXISTS public.pdm_master_data_refs CASCADE;
DROP TABLE IF EXISTS public.analytics_comparison_analyses CASCADE;
DROP TABLE IF EXISTS public.analytics_comparison_results CASCADE;
DROP TABLE IF EXISTS public.analytics_dashboard_shares CASCADE;
DROP TABLE IF EXISTS public.analytics_dashboard_templates CASCADE;
DROP TABLE IF EXISTS public.analytics_dashboards CASCADE;
DROP TABLE IF EXISTS public.analytics_datasets CASCADE;
DROP TABLE IF EXISTS public.analytics_datasources CASCADE;
DROP TABLE IF EXISTS public.analytics_drilldown_history CASCADE;
DROP TABLE IF EXISTS public.analytics_drilldown_paths CASCADE;
DROP TABLE IF EXISTS public.analytics_report_schedules CASCADE;
DROP TABLE IF EXISTS public.analytics_report_templates CASCADE;
DROP TABLE IF EXISTS public.analytics_reports CASCADE;
DROP TABLE IF EXISTS public.analytics_row_level_permissions CASCADE;
DROP TABLE IF EXISTS public.analytics_self_service_reports CASCADE;
DROP TABLE IF EXISTS public.analytics_widgets CASCADE;
DROP TABLE IF EXISTS public.bom_items CASCADE;
DROP TABLE IF EXISTS public.equipment_inspections CASCADE;
DROP TABLE IF EXISTS public.equipment_maintenance_records CASCADE;
DROP TABLE IF EXISTS public.equipment_oee CASCADE;
DROP TABLE IF EXISTS public.pdm_bom_items CASCADE;
DROP TABLE IF EXISTS public.pdm_boms CASCADE;
DROP TABLE IF EXISTS public.pdm_change_notices CASCADE;
DROP TABLE IF EXISTS public.pdm_configurations CASCADE;
DROP TABLE IF EXISTS public.pdm_documents CASCADE;
DROP TABLE IF EXISTS public.pdm_materials CASCADE;
DROP TABLE IF EXISTS public.pdm_production_batches CASCADE;
DROP TABLE IF EXISTS public.pdm_production_formulas CASCADE;
DROP TABLE IF EXISTS public.pdm_production_processes CASCADE;
DROP TABLE IF EXISTS public.pdm_production_steps CASCADE;
DROP TABLE IF EXISTS public.pdm_products CASCADE;
DROP TABLE IF EXISTS public.pdm_versions CASCADE;
DROP TABLE IF EXISTS public.pdm_workflow_instances CASCADE;
DROP TABLE IF EXISTS public.pdm_workflows CASCADE;
DROP TABLE IF EXISTS public.production_kanbans CASCADE;
DROP TABLE IF EXISTS public.production_plans CASCADE;
DROP TABLE IF EXISTS public.production_processes CASCADE;
DROP TABLE IF EXISTS public.production_records CASCADE;
DROP TABLE IF EXISTS public.production_schedules CASCADE;
DROP TABLE IF EXISTS public.quality_records CASCADE;
DROP TABLE IF EXISTS public.production_orders CASCADE;

-- 收尾：收敛 public 262 → 216（拆分阈值"最大 schema 表数"改善）
