-- 2026-09-01 剩余归位收尾：
-- DROP ticket 服务旧二进制测试重建的 3 张 public 影子表（0 行，正式二进制用 ticket schema）
-- 归位 vehicle_requests/vehicles → erp（仅 erp 引用、0 行）
-- DROP public.batch_records 影子（mes schema 有同名活表，mes 引用解析到 mes）
DROP TABLE IF EXISTS public.core_tickets CASCADE;
DROP TABLE IF EXISTS public.ticket_automation_rules CASCADE;
DROP TABLE IF EXISTS public.ticket_knowledge_articles CASCADE;
ALTER TABLE public.vehicle_requests SET SCHEMA erp;
ALTER TABLE public.vehicles SET SCHEMA erp;
DROP TABLE IF EXISTS public.batch_records CASCADE;
