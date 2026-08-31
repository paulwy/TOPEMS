-- 2026-09-01 杂项死表/影子表清理：无 public 版 SQL 引用（代码用显式 schema / 带前缀表名 / 仅函数名）
-- 影子：mobile(mobile_push_notifications/mobile_tasks)、erp(project_budgets/project_contracts)、im(chat_rooms)
-- 死表：mobile_approvals/financial_records/report_schedule_history/stocktake_records/stocktake_tasks/chat_messages/quality_traceability_records/defect_records/aps_master_data_refs
-- 已验证：全 0 行、svc+lib 无 public 版引用（communication 用 core_chat_*、mobile 用显式 mobile.* 或仅函数名）
DROP TABLE IF EXISTS public.mobile_approvals CASCADE;
DROP TABLE IF EXISTS public.mobile_push_notifications CASCADE;
DROP TABLE IF EXISTS public.mobile_tasks CASCADE;
DROP TABLE IF EXISTS public.project_budgets CASCADE;
DROP TABLE IF EXISTS public.project_contracts CASCADE;
DROP TABLE IF EXISTS public.financial_records CASCADE;
DROP TABLE IF EXISTS public.report_schedule_history CASCADE;
DROP TABLE IF EXISTS public.stocktake_records CASCADE;
DROP TABLE IF EXISTS public.stocktake_tasks CASCADE;
DROP TABLE IF EXISTS public.chat_messages CASCADE;
DROP TABLE IF EXISTS public.chat_rooms CASCADE;
DROP TABLE IF EXISTS public.quality_traceability_records CASCADE;
DROP TABLE IF EXISTS public.defect_records CASCADE;
DROP TABLE IF EXISTS public.aps_master_data_refs CASCADE;
