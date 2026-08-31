-- 2026-09-01 通用名影子表清理：引用服务 search_path 主 schema 已有同名活表，public 版为影子（全 0 行）
-- mes: equipment/process_routes/process_route_steps → mes schema 同名
-- erp: financial_vouchers/voucher_items/materials → erp schema 同名
-- bi: reports/report_schedules/report_subscriptions/report_execution_records/report_data/dashboards/data_sources → bi schema 同名
-- 已验证：14 张全 0 行（report_templates 12 行保留待迁移评估）、SQL 引用解析到主 schema、无视图依赖
DROP TABLE IF EXISTS public.equipment CASCADE;
DROP TABLE IF EXISTS public.process_routes CASCADE;
DROP TABLE IF EXISTS public.process_route_steps CASCADE;
DROP TABLE IF EXISTS public.financial_vouchers CASCADE;
DROP TABLE IF EXISTS public.voucher_items CASCADE;
DROP TABLE IF EXISTS public.materials CASCADE;
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.report_schedules CASCADE;
DROP TABLE IF EXISTS public.report_subscriptions CASCADE;
DROP TABLE IF EXISTS public.report_execution_records CASCADE;
DROP TABLE IF EXISTS public.report_data CASCADE;
DROP TABLE IF EXISTS public.dashboards CASCADE;
DROP TABLE IF EXISTS public.data_sources CASCADE;
