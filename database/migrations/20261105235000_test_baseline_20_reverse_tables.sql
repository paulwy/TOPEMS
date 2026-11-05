-- ============================================================
-- P4 test 基线补齐：20 张「应保留」反向表（prod 独有、test 缺失）
--
-- 依据：docs/quality/p4-reverse-tables-triage-2026-11-05.md §7 / §14.4。
-- 来源：prod 2026-11-05 实测 DDL（pg_dump --schema-only，20 个 -t 逐表导出，
--   含列/类型/可空/默认值/PK/UNIQUE/索引/FK/RLS 策略/注释）。
-- 目标：test 表数 1329 → 1349；结构与 prod 逐列一致。
-- 幂等：CREATE TABLE 以 to_regclass 守卫（已存在则 NOTICE 跳过）；索引 IF NOT EXISTS；
--   PK/UNIQUE/FK 以 pg_constraint 约束名判重；策略以 pg_policies 判重；触发器以 pg_trigger 判重。
-- 安全：仅用于 test 定向补齐，不涉及 prod。
-- ============================================================

SET lock_timeout = '5s';
SET statement_timeout = '60s';


DO $$
BEGIN
  IF to_regclass('communication.core_notification_deliveries') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP communication.core_notification_deliveries: already exists';
    RETURN;
  END IF;
  CREATE TABLE communication.core_notification_deliveries ( id uuid DEFAULT gen_random_uuid() NOT NULL, notification_id uuid NOT NULL, user_id uuid, tenant_id uuid, channel text DEFAULT 'in_app'::text NOT NULL, status text DEFAULT 'pending'::text NOT NULL, recipient text DEFAULT ''::text NOT NULL, subject text, body text, sent_at timestamp with time zone, delivered_at timestamp with time zone, failed_at timestamp with time zone, failure_reason text, retry_count integer DEFAULT 0 NOT NULL, max_retries integer DEFAULT 3 NOT NULL, next_retry_at timestamp with time zone, provider_message_id text, batch_id uuid, metadata jsonb, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_deliveries') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_deliveries: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_deliveries FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_preferences') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP communication.core_notification_preferences: already exists';
    RETURN;
  END IF;
  CREATE TABLE communication.core_notification_preferences ( user_id uuid NOT NULL, categories jsonb DEFAULT '[]'::jsonb NOT NULL, quiet_hours jsonb DEFAULT '{}'::jsonb NOT NULL, global_mute jsonb DEFAULT '{}'::jsonb NOT NULL, default_channels text[] DEFAULT ARRAY['in_app'::text] NOT NULL, language text DEFAULT 'zh-CN'::text NOT NULL, timezone text DEFAULT 'Asia/Shanghai'::text NOT NULL, tenant_id uuid, updated_at timestamp with time zone DEFAULT now() NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_preferences') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_preferences: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_preferences FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_subscriptions') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP communication.core_notification_subscriptions: already exists';
    RETURN;
  END IF;
  CREATE TABLE communication.core_notification_subscriptions ( id uuid DEFAULT gen_random_uuid() NOT NULL, user_id uuid NOT NULL, tenant_id uuid, event_type text NOT NULL, event_category text, channels text[] DEFAULT ARRAY['in_app'::text] NOT NULL, status text DEFAULT 'active'::text NOT NULL, filter_expression text, priority integer DEFAULT 0 NOT NULL, expires_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_subscriptions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_subscriptions: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_subscriptions FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.hazard_control_measures: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.hazard_control_measures ( id uuid DEFAULT gen_random_uuid() NOT NULL, hazard_id uuid NOT NULL, measure_type character varying(32) DEFAULT 'engineering'::character varying NOT NULL, description text, responsible character varying(100), deadline timestamp with time zone, status character varying(32) DEFAULT 'pending'::character varying NOT NULL, effectiveness character varying(50), created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.hazard_control_measures: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_control_measures FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.hazard_risk_assessments: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.hazard_risk_assessments ( id uuid DEFAULT gen_random_uuid() NOT NULL, hazard_id uuid NOT NULL, assessment_date timestamp with time zone, assessor character varying(100), severity character varying(16) DEFAULT 'medium'::character varying NOT NULL, likelihood character varying(16) DEFAULT 'medium'::character varying NOT NULL, risklevel character varying(32), recommendations text, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.hazard_risk_assessments: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_risk_assessments FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.qa_ehs_alerts: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.qa_ehs_alerts ( id uuid DEFAULT gen_random_uuid() NOT NULL, alert_no character varying(64) NOT NULL, title character varying(256) NOT NULL, alert_type character varying(64), severity character varying(32), description text, status character varying(32) DEFAULT 'active'::character varying, source_system character varying(64), source_id uuid, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_alerts: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_alerts FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.qa_ehs_risk_controls: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.qa_ehs_risk_controls ( id uuid DEFAULT gen_random_uuid() NOT NULL, risk_id uuid NOT NULL, measure_no character varying(64), title character varying(256) DEFAULT '未命名措施'::character varying NOT NULL, description text, measure_type character varying(64), status character varying(32) DEFAULT 'active'::character varying, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_risk_controls: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_risk_controls FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.qa_ehs_treatment_actions: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.qa_ehs_treatment_actions ( id uuid DEFAULT gen_random_uuid() NOT NULL, treatment_id uuid NOT NULL, description text NOT NULL, responsible character varying(128), deadline timestamp with time zone, status character varying(32) DEFAULT 'pending'::character varying NOT NULL, completed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_treatment_actions: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_treatment_actions FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP ehs.qa_ehs_treatments: already exists';
    RETURN;
  END IF;
  CREATE TABLE ehs.qa_ehs_treatments ( id uuid DEFAULT gen_random_uuid() NOT NULL, accident_id uuid NOT NULL, responsible character varying(128), status character varying(32) DEFAULT 'in_progress'::character varying NOT NULL, started_at timestamp with time zone, completed_at timestamp with time zone, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid );
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_treatments: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_treatments FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP erp.announcements: already exists';
    RETURN;
  END IF;
  CREATE TABLE erp.announcements ( id uuid DEFAULT gen_random_uuid() NOT NULL, title character varying(255) NOT NULL, content text, author character varying(255) NOT NULL, status character varying(50) DEFAULT 'draft'::character varying NOT NULL, priority character varying(50) DEFAULT 'normal'::character varying, publish_at timestamp with time zone, expire_at timestamp with time zone, created_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, updated_at timestamp with time zone DEFAULT CURRENT_TIMESTAMP NOT NULL, deleted_at timestamp with time zone, tenant_id uuid, title_en character varying(500), content_en text );
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS erp.announcements: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY erp.announcements FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('finance.cqrs_events') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP finance.cqrs_events: already exists';
    RETURN;
  END IF;
  CREATE TABLE finance.cqrs_events ( id uuid NOT NULL, aggregate_id uuid NOT NULL, aggregate_type text NOT NULL, event_type text NOT NULL, version bigint NOT NULL, payload jsonb NOT NULL, metadata jsonb NOT NULL, occurred_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP lims.qa_lims_analytes: already exists';
    RETURN;
  END IF;
  CREATE TABLE lims.qa_lims_analytes ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid, analyte_code character varying(64) NOT NULL, analyte_name character varying(255) NOT NULL, category character varying(64), unit character varying(32), method_reference character varying(255), limit_value character varying(128), accuracy character varying(64), status character varying(32) DEFAULT 'active'::character varying, description text, created_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP pdm.pdm_drawings: already exists';
    RETURN;
  END IF;
  CREATE TABLE pdm.pdm_drawings ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid NOT NULL, drawing_no character varying(50) NOT NULL, name character varying(200) NOT NULL, name_en character varying(200), description text, drawing_type character varying(50), product_id uuid, version character varying(20) DEFAULT '1.0'::character varying NOT NULL, status character varying(20) DEFAULT 'active'::character varying NOT NULL, file_path text, file_size bigint, created_by character varying(64), created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS pdm.pdm_drawings: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY pdm.pdm_drawings FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('public.core_email_queue') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP public.core_email_queue: already exists';
    RETURN;
  END IF;
  CREATE TABLE public.core_email_queue ( id uuid DEFAULT gen_random_uuid() NOT NULL, from_email character varying(256) NOT NULL, to_email character varying(256) NOT NULL, subject character varying(512), body text, html_body text, cc text[], bcc text[], attempts integer DEFAULT 0, max_attempts integer DEFAULT 3, status character varying(32) DEFAULT 'pending'::character varying, error_message text, tenant_id uuid NOT NULL, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), sent_at timestamp with time zone, deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('public.core_email_queue') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS public.core_email_queue: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.core_email_queue FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('public.monitor_thresholds') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP public.monitor_thresholds: already exists';
    RETURN;
  END IF;
  CREATE TABLE public.monitor_thresholds ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid, name character varying(200) NOT NULL, metric_type character varying(50) NOT NULL, operator character varying(50) NOT NULL, threshold_value double precision DEFAULT 0 NOT NULL, severity character varying(50) DEFAULT 'warning'::character varying NOT NULL, service_name character varying(200), enabled boolean DEFAULT true NOT NULL, description text, deleted_at timestamp with time zone, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL );
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP public.tenant_permissions: already exists';
    RETURN;
  END IF;
  CREATE TABLE public.tenant_permissions ( id bigint NOT NULL, tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid NOT NULL, user_id character varying(64) NOT NULL, role character varying(32) DEFAULT 'member'::character varying NOT NULL, active boolean DEFAULT true NOT NULL, created_at timestamp with time zone DEFAULT now() NOT NULL, updated_at timestamp with time zone DEFAULT now() NOT NULL, deleted_at timestamp with time zone, CONSTRAINT chk_role CHECK (((role)::text = ANY (ARRAY[('owner'::character varying)::text, ('admin'::character varying)::text, ('member'::character varying)::text, ('viewer'::character varying)::text]))) );
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS public.tenant_permissions: table missing';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.tenant_permissions FORCE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions_id_seq') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP public.tenant_permissions_id_seq: already exists';
    RETURN;
  END IF;
  CREATE SEQUENCE public.tenant_permissions_id_seq START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;
END $$;


DO $$
BEGIN
  IF to_regclass('public') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP owned-by: table missing';
    RETURN;
  END IF;
  ALTER SEQUENCE public.tenant_permissions_id_seq OWNED BY public.tenant_permissions.id;
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_items') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP qms.qa_inspection_items: already exists';
    RETURN;
  END IF;
  CREATE TABLE qms.qa_inspection_items ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid, code character varying(64) NOT NULL, name character varying(255) NOT NULL, category character varying(64), specification text, method character varying(255), unit character varying(32), standard_value character varying(128), tolerance character varying(64), status character varying(32) DEFAULT 'active'::character varying, description text, created_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP qms.qa_inspection_plan_items: already exists';
    RETURN;
  END IF;
  CREATE TABLE qms.qa_inspection_plan_items ( id uuid DEFAULT gen_random_uuid() NOT NULL, plan_id uuid NOT NULL, item_id uuid NOT NULL, sample_qty integer DEFAULT 1, sort_order integer DEFAULT 0, created_at timestamp with time zone DEFAULT now() );
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plans') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP qms.qa_inspection_plans: already exists';
    RETURN;
  END IF;
  CREATE TABLE qms.qa_inspection_plans ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid, code character varying(64) NOT NULL, name character varying(255) NOT NULL, product_code character varying(128), product_name character varying(255), sampling_plan_id uuid, status character varying(32) DEFAULT 'active'::character varying, description text, created_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone );
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_sampling_plans') IS NOT NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP qms.qa_sampling_plans: already exists';
    RETURN;
  END IF;
  CREATE TABLE qms.qa_sampling_plans ( id uuid DEFAULT gen_random_uuid() NOT NULL, tenant_id uuid, code character varying(64) NOT NULL, name character varying(255) NOT NULL, level character varying(64), sample_size integer, aql character varying(32), inspection_level character varying(32), status character varying(32) DEFAULT 'active'::character varying, description text, created_by uuid, created_at timestamp with time zone DEFAULT now(), updated_at timestamp with time zone DEFAULT now(), deleted_at timestamp with time zone );
END $$;

ALTER TABLE ONLY public.tenant_permissions ALTER COLUMN id SET DEFAULT nextval('public.tenant_permissions_id_seq'::regclass);

DO $$
BEGIN
  IF to_regclass('communication.core_notification_deliveries') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_deliveries_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_notification_deliveries_pkey' AND conrelid = to_regclass('communication.core_notification_deliveries')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_deliveries_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_deliveries ADD CONSTRAINT core_notification_deliveries_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_preferences') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_preferences_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_notification_preferences_pkey' AND conrelid = to_regclass('communication.core_notification_preferences')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_preferences_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_preferences ADD CONSTRAINT core_notification_preferences_pkey PRIMARY KEY (user_id);
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_subscriptions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_subscriptions_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_notification_subscriptions_pkey' AND conrelid = to_regclass('communication.core_notification_subscriptions')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_notification_subscriptions_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY communication.core_notification_subscriptions ADD CONSTRAINT core_notification_subscriptions_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_control_measures_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hazard_control_measures_pkey' AND conrelid = to_regclass('ehs.hazard_control_measures')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_control_measures_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_control_measures ADD CONSTRAINT hazard_control_measures_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_risk_assessments_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hazard_risk_assessments_pkey' AND conrelid = to_regclass('ehs.hazard_risk_assessments')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_risk_assessments_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_risk_assessments ADD CONSTRAINT hazard_risk_assessments_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_alerts_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_ehs_alerts_pkey' AND conrelid = to_regclass('ehs.qa_ehs_alerts')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_alerts_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_alerts ADD CONSTRAINT qa_ehs_alerts_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_risk_controls_measure_no_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_ehs_risk_controls_measure_no_key' AND conrelid = to_regclass('ehs.qa_ehs_risk_controls')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_risk_controls_measure_no_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_risk_controls ADD CONSTRAINT qa_ehs_risk_controls_measure_no_key UNIQUE (measure_no);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_risk_controls_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_ehs_risk_controls_pkey' AND conrelid = to_regclass('ehs.qa_ehs_risk_controls')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_risk_controls_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_risk_controls ADD CONSTRAINT qa_ehs_risk_controls_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_treatment_actions_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_ehs_treatment_actions_pkey' AND conrelid = to_regclass('ehs.qa_ehs_treatment_actions')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_treatment_actions_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_treatment_actions ADD CONSTRAINT qa_ehs_treatment_actions_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_treatments_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_ehs_treatments_pkey' AND conrelid = to_regclass('ehs.qa_ehs_treatments')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_ehs_treatments_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_treatments ADD CONSTRAINT qa_ehs_treatments_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK uq_qa_ehs_alerts_no: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_qa_ehs_alerts_no' AND conrelid = to_regclass('ehs.qa_ehs_alerts')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK uq_qa_ehs_alerts_no: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.qa_ehs_alerts ADD CONSTRAINT uq_qa_ehs_alerts_no UNIQUE (alert_no);
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK announcements_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'announcements_pkey' AND conrelid = to_regclass('erp.announcements')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK announcements_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY erp.announcements ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('finance.cqrs_events') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK cqrs_events_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'cqrs_events_pkey' AND conrelid = to_regclass('finance.cqrs_events')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK cqrs_events_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY finance.cqrs_events ADD CONSTRAINT cqrs_events_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_lims_analytes_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_analytes_pkey' AND conrelid = to_regclass('lims.qa_lims_analytes')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_lims_analytes_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY lims.qa_lims_analytes ADD CONSTRAINT qa_lims_analytes_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_lims_analytes_tenant_id_analyte_code_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_lims_analytes_tenant_id_analyte_code_key' AND conrelid = to_regclass('lims.qa_lims_analytes')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_lims_analytes_tenant_id_analyte_code_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY lims.qa_lims_analytes ADD CONSTRAINT qa_lims_analytes_tenant_id_analyte_code_key UNIQUE (tenant_id, analyte_code);
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK pdm_drawings_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdm_drawings_pkey' AND conrelid = to_regclass('pdm.pdm_drawings')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK pdm_drawings_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY pdm.pdm_drawings ADD CONSTRAINT pdm_drawings_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK pdm_drawings_tenant_no_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'pdm_drawings_tenant_no_key' AND conrelid = to_regclass('pdm.pdm_drawings')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK pdm_drawings_tenant_no_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY pdm.pdm_drawings ADD CONSTRAINT pdm_drawings_tenant_no_key UNIQUE (tenant_id, drawing_no);
END $$;


DO $$
BEGIN
  IF to_regclass('public.core_email_queue') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_email_queue_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'core_email_queue_pkey' AND conrelid = to_regclass('public.core_email_queue')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK core_email_queue_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.core_email_queue ADD CONSTRAINT core_email_queue_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('public.monitor_thresholds') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK monitor_thresholds_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'monitor_thresholds_pkey' AND conrelid = to_regclass('public.monitor_thresholds')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK monitor_thresholds_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.monitor_thresholds ADD CONSTRAINT monitor_thresholds_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK tenant_permissions_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'tenant_permissions_pkey' AND conrelid = to_regclass('public.tenant_permissions')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK tenant_permissions_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.tenant_permissions ADD CONSTRAINT tenant_permissions_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK uk_tenant_user: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uk_tenant_user' AND conrelid = to_regclass('public.tenant_permissions')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK uk_tenant_user: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY public.tenant_permissions ADD CONSTRAINT uk_tenant_user UNIQUE (tenant_id, user_id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_items_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_items_pkey' AND conrelid = to_regclass('qms.qa_inspection_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_items_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_items ADD CONSTRAINT qa_inspection_items_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_items_tenant_id_code_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_items_tenant_id_code_key' AND conrelid = to_regclass('qms.qa_inspection_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_items_tenant_id_code_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_items ADD CONSTRAINT qa_inspection_items_tenant_id_code_key UNIQUE (tenant_id, code);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plan_items_pkey' AND conrelid = to_regclass('qms.qa_inspection_plan_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plan_items ADD CONSTRAINT qa_inspection_plan_items_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_plan_id_item_id_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plan_items_plan_id_item_id_key' AND conrelid = to_regclass('qms.qa_inspection_plan_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_plan_id_item_id_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plan_items ADD CONSTRAINT qa_inspection_plan_items_plan_id_item_id_key UNIQUE (plan_id, item_id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plans') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plans_pkey' AND conrelid = to_regclass('qms.qa_inspection_plans')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plans ADD CONSTRAINT qa_inspection_plans_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plans') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_tenant_id_code_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plans_tenant_id_code_key' AND conrelid = to_regclass('qms.qa_inspection_plans')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_tenant_id_code_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plans ADD CONSTRAINT qa_inspection_plans_tenant_id_code_key UNIQUE (tenant_id, code);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_sampling_plans') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_sampling_plans_pkey: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_sampling_plans_pkey' AND conrelid = to_regclass('qms.qa_sampling_plans')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_sampling_plans_pkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_sampling_plans ADD CONSTRAINT qa_sampling_plans_pkey PRIMARY KEY (id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_sampling_plans') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_sampling_plans_tenant_id_code_key: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_sampling_plans_tenant_id_code_key' AND conrelid = to_regclass('qms.qa_sampling_plans')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_sampling_plans_tenant_id_code_key: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_sampling_plans ADD CONSTRAINT qa_sampling_plans_tenant_id_code_key UNIQUE (tenant_id, code);
END $$;

CREATE INDEX IF NOT EXISTS idx_notification_deliveries_batch ON communication.core_notification_deliveries USING btree (batch_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_channel ON communication.core_notification_deliveries USING btree (channel);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_notif ON communication.core_notification_deliveries USING btree (notification_id);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_status ON communication.core_notification_deliveries USING btree (status);
CREATE INDEX IF NOT EXISTS idx_notification_deliveries_user ON communication.core_notification_deliveries USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_event ON communication.core_notification_subscriptions USING btree (event_type);
CREATE INDEX IF NOT EXISTS idx_notification_subscriptions_user ON communication.core_notification_subscriptions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_hazard_control_measures_hazard_id ON ehs.hazard_control_measures USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS idx_hazard_risk_assessments_hazard_id ON ehs.hazard_risk_assessments USING btree (hazard_id);
CREATE INDEX IF NOT EXISTS idx_qa_ehs_alerts_status ON ehs.qa_ehs_alerts USING btree (status);
CREATE INDEX IF NOT EXISTS idx_announcements_priority ON erp.announcements USING btree (priority);
CREATE INDEX IF NOT EXISTS idx_announcements_publish_at ON erp.announcements USING btree (publish_at);
CREATE INDEX IF NOT EXISTS idx_announcements_status ON erp.announcements USING btree (status);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_aggregate ON finance.cqrs_events USING btree (aggregate_id, version);
CREATE INDEX IF NOT EXISTS idx_cqrs_events_occurred ON finance.cqrs_events USING btree (occurred_at, id);
CREATE INDEX IF NOT EXISTS idx_pdm_drawings_status ON pdm.pdm_drawings USING btree (status);
CREATE INDEX IF NOT EXISTS idx_pdm_drawings_tenant ON pdm.pdm_drawings USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_monitor_thresholds_enabled ON public.monitor_thresholds USING btree (enabled);
CREATE INDEX IF NOT EXISTS idx_monitor_thresholds_tenant ON public.monitor_thresholds USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_active ON public.tenant_permissions USING btree (active) WHERE (deleted_at IS NULL);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_role ON public.tenant_permissions USING btree (role);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_tenant ON public.tenant_permissions USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_permissions_user ON public.tenant_permissions USING btree (user_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plan_items_plan_id ON qms.qa_inspection_plan_items USING btree (plan_id);
CREATE INDEX IF NOT EXISTS idx_qa_inspection_plans_sampling_plan_id ON qms.qa_inspection_plans USING btree (sampling_plan_id);

DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP TRIGGER update_tenant_permissions_updated_at: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'update_tenant_permissions_updated_at' AND tgrelid = to_regclass('public.tenant_permissions')) THEN
    RAISE NOTICE 'TEST-BASE SKIP TRIGGER update_tenant_permissions_updated_at: already exists';
    RETURN;
  END IF;
  CREATE TRIGGER update_tenant_permissions_updated_at BEFORE UPDATE ON public.tenant_permissions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_control_measures_hazard_id_fkey: table missing';
    RETURN;
  END IF;
  IF to_regclass('ehs.qa_ehs_hazards') IS NULL THEN RAISE NOTICE 'TEST-BASE SKIP CK hazard_control_measures_hazard_id_fkey: parent missing'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hazard_control_measures_hazard_id_fkey' AND conrelid = to_regclass('ehs.hazard_control_measures')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_control_measures_hazard_id_fkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_control_measures ADD CONSTRAINT hazard_control_measures_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id);
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_risk_assessments_hazard_id_fkey: table missing';
    RETURN;
  END IF;
  IF to_regclass('ehs.qa_ehs_hazards') IS NULL THEN RAISE NOTICE 'TEST-BASE SKIP CK hazard_risk_assessments_hazard_id_fkey: parent missing'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'hazard_risk_assessments_hazard_id_fkey' AND conrelid = to_regclass('ehs.hazard_risk_assessments')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK hazard_risk_assessments_hazard_id_fkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY ehs.hazard_risk_assessments ADD CONSTRAINT hazard_risk_assessments_hazard_id_fkey FOREIGN KEY (hazard_id) REFERENCES ehs.qa_ehs_hazards(id);
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_item_id_fkey: table missing';
    RETURN;
  END IF;
  IF to_regclass('qms.qa_inspection_items') IS NULL THEN RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_item_id_fkey: parent missing'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plan_items_item_id_fkey' AND conrelid = to_regclass('qms.qa_inspection_plan_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_item_id_fkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plan_items ADD CONSTRAINT qa_inspection_plan_items_item_id_fkey FOREIGN KEY (item_id) REFERENCES qms.qa_inspection_items(id) ON DELETE CASCADE;
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plan_items') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_plan_id_fkey: table missing';
    RETURN;
  END IF;
  IF to_regclass('qms.qa_inspection_plans') IS NULL THEN RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_plan_id_fkey: parent missing'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plan_items_plan_id_fkey' AND conrelid = to_regclass('qms.qa_inspection_plan_items')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plan_items_plan_id_fkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plan_items ADD CONSTRAINT qa_inspection_plan_items_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES qms.qa_inspection_plans(id) ON DELETE CASCADE;
END $$;


DO $$
BEGIN
  IF to_regclass('qms.qa_inspection_plans') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_sampling_plan_id_fkey: table missing';
    RETURN;
  END IF;
  IF to_regclass('qms.qa_sampling_plans') IS NULL THEN RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_sampling_plan_id_fkey: parent missing'; RETURN; END IF;
  IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'qa_inspection_plans_sampling_plan_id_fkey' AND conrelid = to_regclass('qms.qa_inspection_plans')) THEN
    RAISE NOTICE 'TEST-BASE SKIP CK qa_inspection_plans_sampling_plan_id_fkey: already exists';
    RETURN;
  END IF;
  ALTER TABLE ONLY qms.qa_inspection_plans ADD CONSTRAINT qa_inspection_plans_sampling_plan_id_fkey FOREIGN KEY (sampling_plan_id) REFERENCES qms.qa_sampling_plans(id) ON DELETE SET NULL;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_deliveries') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_deliveries: table missing';
    RETURN;
  END IF;
  ALTER TABLE communication.core_notification_deliveries ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_preferences') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_preferences: table missing';
    RETURN;
  END IF;
  ALTER TABLE communication.core_notification_preferences ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_subscriptions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS communication.core_notification_subscriptions: table missing';
    RETURN;
  END IF;
  ALTER TABLE communication.core_notification_subscriptions ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_deliveries') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_deliveries_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'communication.core_notification_deliveries' AND policyname = 'notification_deliveries_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_deliveries_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY notification_deliveries_tenant_isolation ON communication.core_notification_deliveries USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_preferences') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_preferences_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'communication.core_notification_preferences' AND policyname = 'notification_preferences_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_preferences_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY notification_preferences_tenant_isolation ON communication.core_notification_preferences USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));
END $$;


DO $$
BEGIN
  IF to_regclass('communication.core_notification_subscriptions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_subscriptions_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'communication.core_notification_subscriptions' AND policyname = 'notification_subscriptions_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY notification_subscriptions_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY notification_subscriptions_tenant_isolation ON communication.core_notification_subscriptions USING (((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (current_setting('app.tenant_id'::text, true) = ''::text)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.hazard_control_measures: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.hazard_control_measures ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.hazard_risk_assessments: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.hazard_risk_assessments ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_alerts: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.qa_ehs_alerts ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_risk_controls: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.qa_ehs_risk_controls ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_risk_controls') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_risk_controls_tenant_policy: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_risk_controls' AND policyname = 'qa_ehs_risk_controls_tenant_policy') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_risk_controls_tenant_policy: already exists';
    RETURN;
  END IF;
  CREATE POLICY qa_ehs_risk_controls_tenant_policy ON ehs.qa_ehs_risk_controls USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_treatment_actions: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.qa_ehs_treatment_actions ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_treatment_actions_tenant_policy: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_treatment_actions' AND policyname = 'qa_ehs_treatment_actions_tenant_policy') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_treatment_actions_tenant_policy: already exists';
    RETURN;
  END IF;
  CREATE POLICY qa_ehs_treatment_actions_tenant_policy ON ehs.qa_ehs_treatment_actions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS ehs.qa_ehs_treatments: table missing';
    RETURN;
  END IF;
  ALTER TABLE ehs.qa_ehs_treatments ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_treatments_tenant_policy: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_treatments' AND policyname = 'qa_ehs_treatments_tenant_policy') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY qa_ehs_treatments_tenant_policy: already exists';
    RETURN;
  END IF;
  CREATE POLICY qa_ehs_treatments_tenant_policy ON ehs.qa_ehs_treatments USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_alerts') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_alerts' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON ehs.qa_ehs_alerts USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_control_measures') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_hazard_control_measures: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.hazard_control_measures' AND policyname = 'tenant_isolation_hazard_control_measures') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_hazard_control_measures: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_hazard_control_measures ON ehs.hazard_control_measures USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.hazard_risk_assessments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_hazard_risk_assessments: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.hazard_risk_assessments' AND policyname = 'tenant_isolation_hazard_risk_assessments') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_hazard_risk_assessments: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_hazard_risk_assessments ON ehs.hazard_risk_assessments USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))) WITH CHECK ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatment_actions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_ehs_treatment_actions: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_treatment_actions' AND policyname = 'tenant_isolation_qa_ehs_treatment_actions') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_ehs_treatment_actions: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_qa_ehs_treatment_actions ON ehs.qa_ehs_treatment_actions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
END $$;


DO $$
BEGIN
  IF to_regclass('ehs.qa_ehs_treatments') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_ehs_treatments: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'ehs.qa_ehs_treatments' AND policyname = 'tenant_isolation_qa_ehs_treatments') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_ehs_treatments: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_qa_ehs_treatments ON ehs.qa_ehs_treatments USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS erp.announcements: table missing';
    RETURN;
  END IF;
  ALTER TABLE erp.announcements ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'erp.announcements' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON erp.announcements USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('erp.announcements') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_announcements: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'erp.announcements' AND policyname = 'tenant_isolation_announcements') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_announcements: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_announcements ON erp.announcements USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR ((tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid) OR (tenant_id IS NULL) OR (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text)))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL) OR (COALESCE(current_setting('app.tenant_id'::text, true), ''::text) = '00000000-0000-0000-0000-000000000000'::text))));
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS lims.qa_lims_analytes: table missing';
    RETURN;
  END IF;
  ALTER TABLE lims.qa_lims_analytes ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'lims.qa_lims_analytes' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON lims.qa_lims_analytes USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('lims.qa_lims_analytes') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_lims_analytes: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'lims.qa_lims_analytes' AND policyname = 'tenant_isolation_qa_lims_analytes') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_qa_lims_analytes: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_qa_lims_analytes ON lims.qa_lims_analytes USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL)));
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS pdm.pdm_drawings: table missing';
    RETURN;
  END IF;
  ALTER TABLE pdm.pdm_drawings ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'pdm.pdm_drawings' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON pdm.pdm_drawings USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('pdm.pdm_drawings') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_pdm_drawings: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'pdm.pdm_drawings' AND policyname = 'tenant_isolation_pdm_drawings') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_pdm_drawings: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_pdm_drawings ON pdm.pdm_drawings USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL)));
END $$;


DO $$
BEGIN
  IF to_regclass('public.core_email_queue') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS public.core_email_queue: table missing';
    RETURN;
  END IF;
  ALTER TABLE public.core_email_queue ENABLE ROW LEVEL SECURITY;
END $$;


DO $$
BEGIN
  IF to_regclass('public.core_email_queue') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'public.core_email_queue' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON public.core_email_queue USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'public.tenant_permissions' AND policyname = 'rls_tenant_isolation') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY rls_tenant_isolation: already exists';
    RETURN;
  END IF;
  CREATE POLICY rls_tenant_isolation ON public.tenant_permissions USING (((current_setting('app.tenant_id'::text, true) IS NULL) OR (current_setting('app.tenant_id'::text, true) = ''::text) OR (current_setting('app.tenant_id'::text, true) = '00000000-0000-0000-0000-000000000000'::text) OR (tenant_id IS NULL) OR ((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text))));
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_tenant_permissions: table missing';
    RETURN;
  END IF;
  IF EXISTS (SELECT 1 FROM pg_policies WHERE schemaname || '.' || tablename = 'public.tenant_permissions' AND policyname = 'tenant_isolation_tenant_permissions') THEN
    RAISE NOTICE 'TEST-BASE SKIP POLICY tenant_isolation_tenant_permissions: already exists';
    RETURN;
  END IF;
  CREATE POLICY tenant_isolation_tenant_permissions ON public.tenant_permissions USING ((((tenant_id)::text = NULLIF(current_setting('app.tenant_id'::text, true), ''::text)) OR (tenant_id IS NULL)));
END $$;


DO $$
BEGIN
  IF to_regclass('public.tenant_permissions') IS NULL THEN
    RAISE NOTICE 'TEST-BASE SKIP FORCE RLS public.tenant_permissions: table missing';
    RETURN;
  END IF;
  ALTER TABLE public.tenant_permissions ENABLE ROW LEVEL SECURITY;
END $$;

