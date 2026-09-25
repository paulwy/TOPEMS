-- ============================================================================
-- 补齐 bi/rs schema reports 系表缺失列（幂等，按 5432 权威结构 + 代码需求）
-- 背景：analytics 代码 SELECT reports.template_id/last_run_at、report_schedules.template_id/parameters/recipients、
--       report_templates.output_format → 5432 部分缺列、5433 重建库骨架表缺大量列。
-- 守卫：表存在才 ALTER（5433 无 rs 表 → 跳过；bi 表存在 → 补齐）。
-- ============================================================================

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='reports' AND c.relkind='r') THEN
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS name character varying NOT NULL;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS report_type character varying NOT NULL;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'draft'::character varying;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS template_id uuid;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS data_source_id uuid;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS config jsonb NOT NULL;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS layout jsonb;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS schedule_config jsonb;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS last_generated_at timestamptz;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE bi.reports ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='reports' AND c.relkind='r') THEN
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS name character varying NOT NULL;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS report_type character varying NOT NULL;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'draft'::character varying;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS template_id uuid;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS data_source_id uuid;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS config jsonb NOT NULL;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS layout jsonb;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS schedule_config jsonb;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS last_generated_at timestamptz;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE rs.reports ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='report_schedules' AND c.relkind='r') THEN
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS report_id uuid NOT NULL;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS schedule_type character varying NOT NULL;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS cron_expression text;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS interval_minutes integer;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS name character varying NOT NULL DEFAULT ''::character varying;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS schedule_expression character varying NOT NULL DEFAULT ''::character varying;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active'::character varying;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS template_id uuid;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS parameters jsonb;
    ALTER TABLE bi.report_schedules ADD COLUMN IF NOT EXISTS recipients jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='report_schedules' AND c.relkind='r') THEN
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS report_id uuid NOT NULL;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS schedule_type character varying NOT NULL;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS cron_expression text;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS interval_minutes integer;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS next_run_at timestamptz;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS last_run_at timestamptz;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS name character varying NOT NULL DEFAULT ''::character varying;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS schedule_expression character varying NOT NULL DEFAULT ''::character varying;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS status character varying DEFAULT 'active'::character varying;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS template_id uuid;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS parameters jsonb;
    ALTER TABLE rs.report_schedules ADD COLUMN IF NOT EXISTS recipients jsonb;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='bi' AND c.relname='report_templates' AND c.relkind='r') THEN
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS name character varying NOT NULL;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS template_type character varying NOT NULL;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS template_content jsonb NOT NULL;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS default_config jsonb;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS code character varying;
    ALTER TABLE bi.report_templates ADD COLUMN IF NOT EXISTS output_format text;
  END IF;
END $$;

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='rs' AND c.relname='report_templates' AND c.relkind='r') THEN
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS id uuid NOT NULL DEFAULT gen_random_uuid();
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS name character varying NOT NULL;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS description text;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS template_type character varying NOT NULL;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS template_content jsonb NOT NULL;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS default_config jsonb;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS created_by uuid;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT CURRENT_TIMESTAMP;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS is_active boolean DEFAULT true;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS tenant_id uuid;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS deleted_at timestamptz;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS code character varying;
    ALTER TABLE rs.report_templates ADD COLUMN IF NOT EXISTS output_format text;
  END IF;
END $$;
