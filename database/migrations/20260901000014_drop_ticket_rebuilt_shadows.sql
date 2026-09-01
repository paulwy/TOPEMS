-- 2026-09-01 清理 ticket 服务旧二进制测试重建的 public 影子表（0 行；正式表在 ticket schema）
DROP TABLE IF EXISTS public.core_ticket_activities CASCADE;
DROP TABLE IF EXISTS public.core_ticket_comments CASCADE;
DROP TABLE IF EXISTS public.core_ticket_sla_escalations CASCADE;
DROP TABLE IF EXISTS public.core_ticket_sla_policies CASCADE;
