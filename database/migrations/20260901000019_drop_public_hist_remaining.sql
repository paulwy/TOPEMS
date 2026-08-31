-- 2026-09-01 清理 public 剩余影子/测试/旧数据表（5 张）：
--   report_templates(12)  analytics 用 bi.report_templates 活表，public 为历史影子
--   products(21)          "测试产品-*" 测试数据，无 SQL 引用（mes 走 API 转发）
--   dashboard_stats(12)   portal 用 portal_dashboard_stats，public 为旧统计表
--   archive_config(14)    communication 硬编码响应、notification 用 notification 版，public 无引用
--   inspection_records(6) "陈/刘检验员" 测试数据，无 SQL 引用
-- 已备份（topems_pre_hist_remaining_drop）+ CSV 归档 → DROP
DROP TABLE IF EXISTS public.report_templates CASCADE;
DROP TABLE IF EXISTS public.products CASCADE;
DROP TABLE IF EXISTS public.dashboard_stats CASCADE;
DROP TABLE IF EXISTS public.archive_config CASCADE;
DROP TABLE IF EXISTS public.inspection_records CASCADE;
