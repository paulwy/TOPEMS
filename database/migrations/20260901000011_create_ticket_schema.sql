-- 2026-09-01 ticket schema 化：建 ticket schema + 归位 ticket 服务 7 张表
-- core_tickets 系列虽带 core_ 前缀但审计确认仅 ticket 服务引用（非平台级）→ 归位 ticket schema
-- ticket_automation_rules/ticket_knowledge_articles 为 ticket 业务表
-- 已验证：7 张全 0 行、仅 ticket 服务引用、无显式 public.* 代码引用
CREATE SCHEMA IF NOT EXISTS ticket;
ALTER TABLE public.core_tickets SET SCHEMA ticket;
ALTER TABLE public.core_ticket_comments SET SCHEMA ticket;
ALTER TABLE public.core_ticket_activities SET SCHEMA ticket;
ALTER TABLE public.core_ticket_sla_policies SET SCHEMA ticket;
ALTER TABLE public.core_ticket_sla_escalations SET SCHEMA ticket;
ALTER TABLE public.ticket_automation_rules SET SCHEMA ticket;
ALTER TABLE public.ticket_knowledge_articles SET SCHEMA ticket;
