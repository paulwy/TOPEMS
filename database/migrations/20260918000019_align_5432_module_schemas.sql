-- ============================================================================
-- 对齐 5432 模块 schema：qms/ticket/rd/report/plugin_finance/lims（用户拍板方案 A）
-- 背景：5432 历史库模块表滞留 public（rehome DDL 从未实际执行），代码以 schema 前缀查询
--       导致 5432 上 qms/ticket/rd/lims 模块 relation/schema 不存在。
-- 策略：① public 同名完整表 → LIKE 拷贝结构 + 幂等数据拷贝；
--       ② 无 public 源 → 按 5433 权威结构建完整表（空表）；
--       ③ 双端均为骨架 → 按代码引用列建结构（标注 manual）。
-- 全程幂等：IF NOT EXISTS / WHERE NOT EXISTS / DO 块存在性守卫；不修改 public 旧表。
-- ============================================================================

CREATE SCHEMA IF NOT EXISTS qms;
CREATE SCHEMA IF NOT EXISTS ticket;
CREATE SCHEMA IF NOT EXISTS rd;
CREATE SCHEMA IF NOT EXISTS report;
CREATE SCHEMA IF NOT EXISTS plugin_finance;
CREATE SCHEMA IF NOT EXISTS lims;

-- qms.qa_alert_messages ← public.qa_alert_messages（14 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_alert_messages' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_alert_messages (LIKE public.qa_alert_messages INCLUDING ALL);
    INSERT INTO qms.qa_alert_messages SELECT * FROM public.qa_alert_messages WHERE NOT EXISTS (SELECT 1 FROM qms.qa_alert_messages LIMIT 1);
  END IF;
END $$;

-- qms.qa_alert_rules ← public.qa_alert_rules（16 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_alert_rules' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_alert_rules (LIKE public.qa_alert_rules INCLUDING ALL);
    INSERT INTO qms.qa_alert_rules SELECT * FROM public.qa_alert_rules WHERE NOT EXISTS (SELECT 1 FROM qms.qa_alert_rules LIMIT 1);
  END IF;
END $$;

-- qms.qa_apqp_approvals ← public.qa_apqp_approvals（11 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_apqp_approvals' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_apqp_approvals (LIKE public.qa_apqp_approvals INCLUDING ALL);
    INSERT INTO qms.qa_apqp_approvals SELECT * FROM public.qa_apqp_approvals WHERE NOT EXISTS (SELECT 1 FROM qms.qa_apqp_approvals LIMIT 1);
  END IF;
END $$;

-- qms.qa_apqp_phases ← public.qa_apqp_phases（15 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_apqp_phases' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_apqp_phases (LIKE public.qa_apqp_phases INCLUDING ALL);
    INSERT INTO qms.qa_apqp_phases SELECT * FROM public.qa_apqp_phases WHERE NOT EXISTS (SELECT 1 FROM qms.qa_apqp_phases LIMIT 1);
  END IF;
END $$;

-- qms.qa_apqp_projects ← public.qa_apqp_projects（20 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_apqp_projects' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_apqp_projects (LIKE public.qa_apqp_projects INCLUDING ALL);
    INSERT INTO qms.qa_apqp_projects SELECT * FROM public.qa_apqp_projects WHERE NOT EXISTS (SELECT 1 FROM qms.qa_apqp_projects LIMIT 1);
  END IF;
END $$;

-- qms.qa_apqp_risks ← public.qa_apqp_risks（16 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_apqp_risks' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_apqp_risks (LIKE public.qa_apqp_risks INCLUDING ALL);
    INSERT INTO qms.qa_apqp_risks SELECT * FROM public.qa_apqp_risks WHERE NOT EXISTS (SELECT 1 FROM qms.qa_apqp_risks LIMIT 1);
  END IF;
END $$;

-- qms.qa_apqp_tasks ← public.qa_apqp_tasks（15 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_apqp_tasks' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_apqp_tasks (LIKE public.qa_apqp_tasks INCLUDING ALL);
    INSERT INTO qms.qa_apqp_tasks SELECT * FROM public.qa_apqp_tasks WHERE NOT EXISTS (SELECT 1 FROM qms.qa_apqp_tasks LIMIT 1);
  END IF;
END $$;

-- qms.qa_audit_findings ← public.qa_audit_findings（17 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_audit_findings' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_audit_findings (LIKE public.qa_audit_findings INCLUDING ALL);
    INSERT INTO qms.qa_audit_findings SELECT * FROM public.qa_audit_findings WHERE NOT EXISTS (SELECT 1 FROM qms.qa_audit_findings LIMIT 1);
  END IF;
END $$;

-- qms.qa_audit_plans ← public.qa_audit_plans（15 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_audit_plans' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_audit_plans (LIKE public.qa_audit_plans INCLUDING ALL);
    INSERT INTO qms.qa_audit_plans SELECT * FROM public.qa_audit_plans WHERE NOT EXISTS (SELECT 1 FROM qms.qa_audit_plans LIMIT 1);
  END IF;
END $$;

-- qms.qa_audit_tasks ← public.qa_audit_tasks（12 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_audit_tasks' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_audit_tasks (LIKE public.qa_audit_tasks INCLUDING ALL);
    INSERT INTO qms.qa_audit_tasks SELECT * FROM public.qa_audit_tasks WHERE NOT EXISTS (SELECT 1 FROM qms.qa_audit_tasks LIMIT 1);
  END IF;
END $$;

-- qms.qa_corrective_action_items ← public.qa_corrective_action_items（10 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_corrective_action_items' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_corrective_action_items (LIKE public.qa_corrective_action_items INCLUDING ALL);
    INSERT INTO qms.qa_corrective_action_items SELECT * FROM public.qa_corrective_action_items WHERE NOT EXISTS (SELECT 1 FROM qms.qa_corrective_action_items LIMIT 1);
  END IF;
END $$;

-- qms.qa_corrective_actions ← public.qa_corrective_actions（17 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_corrective_actions' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_corrective_actions (LIKE public.qa_corrective_actions INCLUDING ALL);
    INSERT INTO qms.qa_corrective_actions SELECT * FROM public.qa_corrective_actions WHERE NOT EXISTS (SELECT 1 FROM qms.qa_corrective_actions LIMIT 1);
  END IF;
END $$;

-- qms.qa_eightd_audit_logs ← public.qa_eightd_audit_logs（8 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_eightd_audit_logs' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_eightd_audit_logs (LIKE public.qa_eightd_audit_logs INCLUDING ALL);
    INSERT INTO qms.qa_eightd_audit_logs SELECT * FROM public.qa_eightd_audit_logs WHERE NOT EXISTS (SELECT 1 FROM qms.qa_eightd_audit_logs LIMIT 1);
  END IF;
END $$;

-- qms.qa_eightd_reports ← public.qa_eightd_reports（26 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_eightd_reports' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_eightd_reports (LIKE public.qa_eightd_reports INCLUDING ALL);
    INSERT INTO qms.qa_eightd_reports SELECT * FROM public.qa_eightd_reports WHERE NOT EXISTS (SELECT 1 FROM qms.qa_eightd_reports LIMIT 1);
  END IF;
END $$;

-- qms.qa_fmea_analyses ← public.qa_fmea_analyses（18 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_fmea_analyses' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_fmea_analyses (LIKE public.qa_fmea_analyses INCLUDING ALL);
    INSERT INTO qms.qa_fmea_analyses SELECT * FROM public.qa_fmea_analyses WHERE NOT EXISTS (SELECT 1 FROM qms.qa_fmea_analyses LIMIT 1);
  END IF;
END $$;

-- qms.qa_fmea_items ← public.qa_fmea_items（24 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_fmea_items' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_fmea_items (LIKE public.qa_fmea_items INCLUDING ALL);
    INSERT INTO qms.qa_fmea_items SELECT * FROM public.qa_fmea_items WHERE NOT EXISTS (SELECT 1 FROM qms.qa_fmea_items LIMIT 1);
  END IF;
END $$;

-- qms.qa_inspection_audits ← public.qa_inspection_audits（9 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_inspection_audits' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_inspection_audits (LIKE public.qa_inspection_audits INCLUDING ALL);
    INSERT INTO qms.qa_inspection_audits SELECT * FROM public.qa_inspection_audits WHERE NOT EXISTS (SELECT 1 FROM qms.qa_inspection_audits LIMIT 1);
  END IF;
END $$;

-- qms.qa_inspection_results ← public.qa_inspection_results（9 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_inspection_results' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_inspection_results (LIKE public.qa_inspection_results INCLUDING ALL);
    INSERT INTO qms.qa_inspection_results SELECT * FROM public.qa_inspection_results WHERE NOT EXISTS (SELECT 1 FROM qms.qa_inspection_results LIMIT 1);
  END IF;
END $$;

-- qms.qa_qms_sync_records ← public.qa_qms_sync_records（13 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_qms_sync_records' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_qms_sync_records (LIKE public.qa_qms_sync_records INCLUDING ALL);
    INSERT INTO qms.qa_qms_sync_records SELECT * FROM public.qa_qms_sync_records WHERE NOT EXISTS (SELECT 1 FROM qms.qa_qms_sync_records LIMIT 1);
  END IF;
END $$;

-- qms.qa_quality_costs ← public.qa_quality_costs（13 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_quality_costs' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_quality_costs (LIKE public.qa_quality_costs INCLUDING ALL);
    INSERT INTO qms.qa_quality_costs SELECT * FROM public.qa_quality_costs WHERE NOT EXISTS (SELECT 1 FROM qms.qa_quality_costs LIMIT 1);
  END IF;
END $$;

-- qms.qa_quality_inspections ← public.qa_quality_inspections（21 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_quality_inspections' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_quality_inspections (LIKE public.qa_quality_inspections INCLUDING ALL);
    INSERT INTO qms.qa_quality_inspections SELECT * FROM public.qa_quality_inspections WHERE NOT EXISTS (SELECT 1 FROM qms.qa_quality_inspections LIMIT 1);
  END IF;
END $$;

-- qms.qa_quality_issues ← public.qa_quality_issues（14 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_quality_issues' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_quality_issues (LIKE public.qa_quality_issues INCLUDING ALL);
    INSERT INTO qms.qa_quality_issues SELECT * FROM public.qa_quality_issues WHERE NOT EXISTS (SELECT 1 FROM qms.qa_quality_issues LIMIT 1);
  END IF;
END $$;

-- qms.qa_spc_charts ← public.qa_spc_charts（19 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_spc_charts' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_spc_charts (LIKE public.qa_spc_charts INCLUDING ALL);
    INSERT INTO qms.qa_spc_charts SELECT * FROM public.qa_spc_charts WHERE NOT EXISTS (SELECT 1 FROM qms.qa_spc_charts LIMIT 1);
  END IF;
END $$;

-- qms.qa_spc_data_points ← public.qa_spc_data_points（10 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_spc_data_points' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_spc_data_points (LIKE public.qa_spc_data_points INCLUDING ALL);
    INSERT INTO qms.qa_spc_data_points SELECT * FROM public.qa_spc_data_points WHERE NOT EXISTS (SELECT 1 FROM qms.qa_spc_data_points LIMIT 1);
  END IF;
END $$;

-- qms.qa_standard_revisions ← public.qa_standard_revisions（12 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_standard_revisions' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_standard_revisions (LIKE public.qa_standard_revisions INCLUDING ALL);
    INSERT INTO qms.qa_standard_revisions SELECT * FROM public.qa_standard_revisions WHERE NOT EXISTS (SELECT 1 FROM qms.qa_standard_revisions LIMIT 1);
  END IF;
END $$;

-- qms.qa_standards ← public.qa_standards（14 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_standards' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS qms.qa_standards (LIKE public.qa_standards INCLUDING ALL);
    INSERT INTO qms.qa_standards SELECT * FROM public.qa_standards WHERE NOT EXISTS (SELECT 1 FROM qms.qa_standards LIMIT 1);
  END IF;
END $$;

-- ticket.core_ticket_activities ← public.core_ticket_activities（9 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='core_ticket_activities' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS ticket.core_ticket_activities (LIKE public.core_ticket_activities INCLUDING ALL);
    INSERT INTO ticket.core_ticket_activities SELECT * FROM public.core_ticket_activities WHERE NOT EXISTS (SELECT 1 FROM ticket.core_ticket_activities LIMIT 1);
  END IF;
END $$;

-- ticket.core_ticket_comments ← public.core_ticket_comments（9 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='core_ticket_comments' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS ticket.core_ticket_comments (LIKE public.core_ticket_comments INCLUDING ALL);
    INSERT INTO ticket.core_ticket_comments SELECT * FROM public.core_ticket_comments WHERE NOT EXISTS (SELECT 1 FROM ticket.core_ticket_comments LIMIT 1);
  END IF;
END $$;

-- ticket.core_tickets ← public.core_tickets（20 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='core_tickets' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS ticket.core_tickets (LIKE public.core_tickets INCLUDING ALL);
    INSERT INTO ticket.core_tickets SELECT * FROM public.core_tickets WHERE NOT EXISTS (SELECT 1 FROM ticket.core_tickets LIMIT 1);
  END IF;
END $$;

-- ticket.ticket_attachments（5433 权威结构 12 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS ticket.ticket_attachments (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    ticket_id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    file_name text NOT NULL,
    mime_type text,
    file_size bigint DEFAULT 0,
    file_type text,
    file_data bytea,
    created_by uuid,
    created_at timestamptz with time zone DEFAULT now(),
    updated_at timestamptz with time zone DEFAULT now(),
    deleted_at timestamptz with time zone
);

-- rd.bugs（5433 权威结构 11 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS rd.bugs (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    bug_no text NOT NULL,
    bug_title text NOT NULL,
    severity text NOT NULL DEFAULT 'medium'::text,
    priority text NOT NULL DEFAULT 'medium'::text,
    status text NOT NULL DEFAULT 'open'::text,
    assignee text,
    create_time timestamptz with time zone NOT NULL DEFAULT now(),
    description text,
    updated_at timestamptz with time zone NOT NULL DEFAULT now(),
    created_at timestamptz with time zone
);

-- rd.builds（5433 权威结构 14 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS rd.builds (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    build_no text NOT NULL,
    project_id uuid,
    project_name text,
    branch text,
    commit_hash text,
    build_type text DEFAULT 'ci'::text,
    trigger_type text DEFAULT 'manual'::text,
    status text NOT NULL DEFAULT 'pending'::text,
    duration integer NOT NULL DEFAULT 0,
    build_time timestamptz with time zone NOT NULL DEFAULT now(),
    logs text,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- rd.deploys（5433 权威结构 18 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS rd.deploys (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    deploy_no text NOT NULL,
    project_id uuid,
    project_name text,
    build_id uuid,
    env text,
    deploy_type text DEFAULT 'rolling'::text,
    environment text,
    app_name text,
    version text,
    status text NOT NULL DEFAULT 'pending'::text,
    deploy_time timestamptz with time zone NOT NULL DEFAULT now(),
    deployer text,
    operator text,
    target_url text,
    logs text,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- rd.test_cases（5433 权威结构 9 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS rd.test_cases (
    id uuid NOT NULL DEFAULT gen_random_uuid(),
    case_no text NOT NULL,
    case_name text NOT NULL,
    case_type text NOT NULL DEFAULT 'function'::text,
    priority text NOT NULL DEFAULT 'medium'::text,
    status text NOT NULL DEFAULT 'active'::text,
    related_requirement text,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- plugin_finance.reconciliation_settlement_links（5433 权威结构 11 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS plugin_finance.reconciliation_settlement_links (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    reconciliation_id uuid NOT NULL,
    settlement_id uuid NOT NULL,
    link_type character varying NOT NULL,
    amount double precision,
    status character varying NOT NULL DEFAULT 'linked'::character varying,
    remark text,
    created_by uuid,
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- plugin_finance.reconciliation_snapshots（5433 权威结构 21 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS plugin_finance.reconciliation_snapshots (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    recon_code character varying,
    recon_name character varying NOT NULL,
    recon_type character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'draft'::character varying,
    period character varying NOT NULL,
    entity_id uuid,
    entity_type character varying,
    total_debit double precision,
    total_credit double precision,
    difference double precision,
    matched_count integer DEFAULT 0,
    unmatched_count integer DEFAULT 0,
    description text,
    created_by character varying,
    approved_by character varying,
    approved_at timestamptz with time zone,
    synced_at timestamptz with time zone NOT NULL DEFAULT now(),
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- plugin_finance.settlement_snapshots（5433 权威结构 15 列，5432 无 public 源 → 建空表）
CREATE TABLE IF NOT EXISTS plugin_finance.settlement_snapshots (
    id uuid NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    settlement_no character varying NOT NULL,
    settlement_type character varying NOT NULL,
    status character varying NOT NULL DEFAULT 'pending'::character varying,
    amount double precision,
    settlement_date timestamptz with time zone,
    remarks text,
    created_by character varying,
    approved_by character varying,
    approved_at timestamptz with time zone,
    synced_at timestamptz with time zone NOT NULL DEFAULT now(),
    created_at timestamptz with time zone NOT NULL DEFAULT now(),
    updated_at timestamptz with time zone NOT NULL DEFAULT now()
);

-- lims.maintenance_records：按代码引用列建完整结构（instrument.rs INSERT/UPDATE 列）
DO $$ BEGIN
  CREATE TABLE IF NOT EXISTS lims.maintenance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL,
    organization_id UUID,
    instrument_id UUID NOT NULL,
    maintenance_type VARCHAR(100) NOT NULL,
    description TEXT,
    performed_by UUID,
    performed_at TIMESTAMPTZ,
    next_maintenance_date TIMESTAMPTZ,
    cost NUMERIC(14,2),
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    deleted_at TIMESTAMPTZ
  );
END $$;

-- lims.qa_lab_tasks ← public.qa_lab_tasks（14 列完整结构拷贝）
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace=n.oid
             WHERE n.nspname='public' AND c.relname='qa_lab_tasks' AND c.relkind='r') THEN
    CREATE TABLE IF NOT EXISTS lims.qa_lab_tasks (LIKE public.qa_lab_tasks INCLUDING ALL);
    INSERT INTO lims.qa_lab_tasks SELECT * FROM public.qa_lab_tasks WHERE NOT EXISTS (SELECT 1 FROM lims.qa_lab_tasks LIMIT 1);
  END IF;
END $$;
