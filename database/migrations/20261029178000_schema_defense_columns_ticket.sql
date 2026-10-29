-- schema_defense 服务级补列批次 [ticket]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- ticket.core_ticket_activities: +6 列
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "from_value" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "to_value" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "user_id" UUID;

-- ticket.core_ticket_comments: +6 列
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN;
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_name" TEXT;

-- ticket.core_ticket_sla_escalations: +6 列
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalated_to" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalation_time" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "level" INTEGER;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;

-- ticket.core_ticket_sla_policies: +19 列
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_end" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_start" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_1" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_2" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_3" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_levels" INTEGER;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "resolution_hours" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "response_hours" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "ticket_type" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "weekend_excluded" BOOLEAN;
ALTER TABLE IF EXISTS "ticket"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "working_hours_only" BOOLEAN;

-- ticket.core_tickets: +17 列
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "assignee_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "reporter_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "sla_due_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "source_business_id" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "source_service" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_no" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_type" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE IF EXISTS "ticket"."core_tickets" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
