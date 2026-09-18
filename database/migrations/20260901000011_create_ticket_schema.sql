-- 2026-09-01 ticket schema 化：建 ticket schema + 归位 ticket 服务 7 张表
-- core_tickets 系列虽带 core_ 前缀但审计确认仅 ticket 服务引用（非平台级）→ 归位 ticket schema
-- ticket_automation_rules/ticket_knowledge_articles 为 ticket 业务表
-- 已验证：7 张全 0 行、仅 ticket 服务引用、无显式 public.* 代码引用
CREATE SCHEMA IF NOT EXISTS ticket;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_tickets' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='core_tickets' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_tickets" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_ticket_comments' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='core_ticket_comments' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_ticket_comments" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_ticket_activities' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='core_ticket_activities' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_ticket_activities" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_ticket_sla_policies' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_policies' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_ticket_sla_policies" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='core_ticket_sla_escalations' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='core_ticket_sla_escalations' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."core_ticket_sla_escalations" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='ticket_automation_rules' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='ticket_automation_rules' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."ticket_automation_rules" SET SCHEMA ticket';
  END IF;
END $rehome$;
DO $rehome$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='public' AND c.relname='ticket_knowledge_articles' AND c.relkind='r')
     AND NOT EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
             WHERE n.nspname='ticket' AND c.relname='ticket_knowledge_articles' AND c.relkind='r')
  THEN
    EXECUTE 'ALTER TABLE public."ticket_knowledge_articles" SET SCHEMA ticket';
  END IF;
END $rehome$;
