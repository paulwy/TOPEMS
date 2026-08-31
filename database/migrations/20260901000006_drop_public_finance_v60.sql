-- 2026-09-01 finance_v60 影子表补清：上轮 finance_v5x 清理遗漏 v60 系列（finance schema 有同名 + 全 0 行）
DROP TABLE IF EXISTS public.finance_v60_alert_channels CASCADE;
DROP TABLE IF EXISTS public.finance_v60_alert_rules CASCADE;
DROP TABLE IF EXISTS public.finance_v60_alerts CASCADE;
DROP TABLE IF EXISTS public.finance_v60_decision_results CASCADE;
DROP TABLE IF EXISTS public.finance_v60_decision_scenarios CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_dependencies CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_executions CASCADE;
DROP TABLE IF EXISTS public.finance_v60_schedule_tasks CASCADE;
