-- 2026-09-01 死表清理（bi 组）：public 无 SQL 引用空表，bi schema 已有同名活表
-- 已验证：全 0 行、无 FROM/INTO/UPDATE/JOIN 引用（analysis_history 为 ai 内存 API 函数名，非 DB 查询）
DROP TABLE IF EXISTS public.analysis_history CASCADE;
DROP TABLE IF EXISTS public.analysis_queries CASCADE;
DROP TABLE IF EXISTS public.dashboard_widgets CASCADE;
DROP TABLE IF EXISTS public.datasource_fields CASCADE;
DROP TABLE IF EXISTS public.datasource_tables CASCADE;
DROP TABLE IF EXISTS public.saved_analysis_results CASCADE;
DROP TABLE IF EXISTS public.visualization_data CASCADE;
DROP TABLE IF EXISTS public.visualizations CASCADE;
