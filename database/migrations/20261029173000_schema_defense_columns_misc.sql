-- schema_defense 服务级补列批次 [misc]
-- 来源：服务自建 DDL（svc/*/src + lib/*/src）与门禁同口径提取；迁移权威缺列补齐
-- 幂等：ALTER TABLE ADD COLUMN IF NOT EXISTS；仅补列与类型（created_at/updated_at 保留 DEFAULT CURRENT_TIMESTAMP），
-- 不含 NOT NULL 等约束（已有行安全，约束治理另行评估）；目标 schema 取自本地库 information_schema

-- analytics.reports: +1 列
ALTER TABLE IF EXISTS "analytics"."reports" ADD COLUMN IF NOT EXISTS "output_format" VARCHAR(32);

-- bi.reports: +1 列
ALTER TABLE IF EXISTS "bi"."reports" ADD COLUMN IF NOT EXISTS "output_format" VARCHAR(32);

-- doc.documents: +7 列
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "doc"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- erp.documents: +7 列
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "erp"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- erp.leave_requests: +16 列
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "approved_by" VARCHAR(128);
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "days" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "employee_id" UUID;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "employee_name" VARCHAR(128);
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "end_date" DATE;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "end_half_day" BOOLEAN;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "leave_type" VARCHAR(32);
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "rejected_reason" TEXT;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "start_date" DATE;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "start_half_day" BOOLEAN;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "status" VARCHAR(16);
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "erp"."leave_requests" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- mes.production_processes: +9 列
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP;
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "process_code" VARCHAR(100);
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "process_name" VARCHAR(255);
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "sequence" INT;
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "standard_time_minutes" NUMERIC(10,2);
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "status" VARCHAR(32);
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMP;
ALTER TABLE IF EXISTS "mes"."production_processes" ADD COLUMN IF NOT EXISTS "version" VARCHAR(32);

-- mes.work_calendars: +1 列
ALTER TABLE IF EXISTS "mes"."work_calendars" ADD COLUMN IF NOT EXISTS "work_date" DATE;

-- mobile.documents: +7 列
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "mobile"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- pm.documents: +7 列
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "pm"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- public.core_geofences: +17 列
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "chat_id" UUID;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "coordinates" JSONB;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "creator_id" UUID;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "creator_name" VARCHAR(255);
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "end_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "event_types" JSONB;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "gis_fence_id" UUID;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "notify_channels" JSONB;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "notify_users" JSONB;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "radius" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "shape_type" VARCHAR(50);
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "start_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);
ALTER TABLE IF EXISTS "public"."core_geofences" ADD COLUMN IF NOT EXISTS "trigger_cooldown" INTEGER;

-- public.core_ticket_activities: +6 列
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "action" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "from_value" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "to_value" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_activities" ADD COLUMN IF NOT EXISTS "user_id" UUID;

-- public.core_ticket_comments: +6 列
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "content" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "is_internal" BOOLEAN;
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_comments" ADD COLUMN IF NOT EXISTS "user_name" TEXT;

-- public.core_ticket_sla_escalations: +6 列
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalated_to" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "escalation_time" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "level" INTEGER;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "reason" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_escalations" ADD COLUMN IF NOT EXISTS "ticket_id" UUID;

-- public.core_ticket_sla_policies: +19 列
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_end" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "business_hours_start" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_1" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_2" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_hours_3" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "escalation_levels" INTEGER;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "is_default" BOOLEAN;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "name" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "resolution_hours" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "response_hours" DOUBLE PRECISION;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "ticket_type" TEXT;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "weekend_excluded" BOOLEAN;
ALTER TABLE IF EXISTS "public"."core_ticket_sla_policies" ADD COLUMN IF NOT EXISTS "working_hours_only" BOOLEAN;

-- public.core_tickets: +17 列
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "assignee_id" UUID;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "closed_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "reporter_id" UUID;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "resolved_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "severity" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "sla_due_at" TIMESTAMPTZ;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "source_business_id" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "source_service" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "status" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "tags" TEXT[];
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_no" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "ticket_type" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "title" TEXT;
ALTER TABLE IF EXISTS "public"."core_tickets" ADD COLUMN IF NOT EXISTS "updated_at" TIMESTAMPTZ;

-- public.reports: +1 列
ALTER TABLE IF EXISTS "public"."reports" ADD COLUMN IF NOT EXISTS "output_format" VARCHAR(32);

-- report.reports: +1 列
ALTER TABLE IF EXISTS "report"."reports" ADD COLUMN IF NOT EXISTS "output_format" VARCHAR(32);

-- unified_core.documents: +7 列
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "chunk_count" INTEGER;
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "content_hash" VARCHAR(64);
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "error_message" TEXT;
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "knowledge_base_id" UUID;
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "mime_type" VARCHAR(100);
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "processed_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "unified_core"."documents" ADD COLUMN IF NOT EXISTS "tags" TEXT[];

-- wms.locations: +9 列
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "address" TEXT;
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "code" VARCHAR(100);
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "created_at" TIMESTAMP WITH TIME ZONE;
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "description" TEXT;
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "location_type" VARCHAR(100);
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "name" VARCHAR(255);
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "position" JSONB;
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "properties" JSONB;
ALTER TABLE IF EXISTS "wms"."locations" ADD COLUMN IF NOT EXISTS "status" VARCHAR(50);

-- wms.wms_approval_events: +8 列
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "action" VARCHAR(32);
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "comment" TEXT;
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "entity_id" UUID;
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "entity_type" VARCHAR(32);
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "operator" VARCHAR(64);
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "status_from" VARCHAR(32);
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "status_to" VARCHAR(32);
ALTER TABLE IF EXISTS "wms"."wms_approval_events" ADD COLUMN IF NOT EXISTS "tenant_id" UUID;
