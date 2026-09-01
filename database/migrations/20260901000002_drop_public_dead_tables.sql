-- 2026-09-01 死表清理：public 无代码引用空表（代码经 search_path 用 erp/bi schema 同名表）
-- 已验证：4 张全部 0 行、svc 全库（rs+sql）无引用、目标 schema（erp/bi）有同名活表
DROP TABLE IF EXISTS public.payment_schedules CASCADE;
DROP TABLE IF EXISTS public.project_budget_items CASCADE;
DROP TABLE IF EXISTS public.saved_analysis_results CASCADE;
DROP TABLE IF EXISTS public.visualization_data CASCADE;
