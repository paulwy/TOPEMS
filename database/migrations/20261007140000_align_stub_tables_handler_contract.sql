-- ============================================================================
-- 20261007140000_align_stub_tables_handler_contract.sql
-- 对齐开发库 stub 表与 handler 契约（2026-10-07 web 契约冒烟 291 FAIL 的根因修复）
--
-- 背景: 早期迁移以 `CREATE TABLE IF NOT EXISTS ... (id ...)` 建了 stub 表,
--       后续"全量"迁移因 IF NOT EXISTS 被静默跳过, 导致 handler 查询的
--       tenant_id/status/name 等列缺失 → handler_error(500)。
-- 本迁移: 对已知 stub 表逐列 ALTER TABLE ADD COLUMN IF NOT EXISTS, 幂等。
-- 列定义取自 handler 模型/INSERT 语句与既有迁移的完整 CREATE 定义。
-- ============================================================================

-- ================= unified-core: automation (public schema) ================
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS code TEXT NOT NULL DEFAULT '';
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS trigger JSONB;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS action JSONB;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS on_success JSONB;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS on_error JSONB;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS canvas JSONB;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'draft';
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS last_run_at TIMESTAMPTZ;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS run_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS success_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS failed_count INTEGER NOT NULL DEFAULT 0;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_rules ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS key TEXT NOT NULL DEFAULT '';
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS scope TEXT;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS is_secret BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_variables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS rule_id UUID;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS rule_name TEXT;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS trigger_type TEXT;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS input_variables JSONB;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS output JSONB;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= unified-core: flow (public.core_workflow_*) ==============
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS initiator_id UUID;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS current_node_id TEXT;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.core_workflow_instances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS definition JSONB;
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS isactive BOOLEAN DEFAULT TRUE;
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.core_workflow_versions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= communication: notification_channels =====================
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS code VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS channel_type VARCHAR(50) NOT NULL DEFAULT 'system';
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS config JSONB DEFAULT '{}'::jsonb;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS enabled BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ================= monitor: monitor_settings ================================
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS key VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.monitor_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ================= ai: ai_models ============================================
ALTER TABLE ai.ai_models ADD COLUMN IF NOT EXISTS token_count INTEGER DEFAULT 0;
ALTER TABLE ai.ai_models ADD COLUMN IF NOT EXISTS input_tokens BIGINT DEFAULT 0;
ALTER TABLE ai.ai_models ADD COLUMN IF NOT EXISTS output_tokens BIGINT DEFAULT 0;
ALTER TABLE ai.ai_models ADD COLUMN IF NOT EXISTS usage JSONB DEFAULT '{}'::jsonb;

-- ================= integration: erp_connections / erp_mappings（缺表）========
CREATE TABLE IF NOT EXISTS integration.erp_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT '',
    name VARCHAR(200) NOT NULL DEFAULT '',
    type VARCHAR(50) NOT NULL DEFAULT 'erp',
    api_url TEXT,
    api_version VARCHAR(50),
    app_key VARCHAR(200),
    app_secret VARCHAR(200),
    sync_direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
    sync_mode VARCHAR(20) NOT NULL DEFAULT 'manual',
    sync_interval INTEGER DEFAULT 60,
    status VARCHAR(20) NOT NULL DEFAULT 'active',
    isactive BOOLEAN NOT NULL DEFAULT TRUE,
    last_sync_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS integration.erp_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id VARCHAR(100) NOT NULL DEFAULT '',
    connection_id UUID,
    mapping_type VARCHAR(50) NOT NULL DEFAULT 'sku',
    local_id VARCHAR(100),
    local_code VARCHAR(100),
    local_name VARCHAR(200),
    external_code VARCHAR(100),
    external_name VARCHAR(200),
    direction VARCHAR(20) NOT NULL DEFAULT 'inbound',
    isactive BOOLEAN NOT NULL DEFAULT TRUE,
    priority INTEGER NOT NULL DEFAULT 0,
    condition TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS sync_type VARCHAR(50) NOT NULL DEFAULT 'manual';
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS source_module VARCHAR(50);
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS target_module VARCHAR(50);
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS operation VARCHAR(20);
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS entity_type VARCHAR(50);
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS entity_ids JSONB;
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS finished_at TIMESTAMPTZ;
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.core_inter_module_sync ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= pm =======================================================
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS plan_code TEXT;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS plan_name TEXT;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS acceptance_type TEXT;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS milestone_id UUID;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS phase_id UUID;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS acceptance_criteria TEXT;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS expected_date TIMESTAMPTZ;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS participants JSONB;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS documents_required JSONB;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.acceptance_plans ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS record_code TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS record_name TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS acceptance_type TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS conclusion TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS participants JSONB;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS attachments JSONB;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS template_code TEXT;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS template_type TEXT;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS content JSONB;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS file_name TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS file_size BIGINT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS file_type TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS folder_id UUID;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS parent_id UUID;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS budget_id UUID;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS planned_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS actual_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'planned';
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS milestone_type TEXT;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS planned_date TIMESTAMPTZ;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS actual_date TIMESTAMPTZ;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS notify_events JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS notify_channels JSONB DEFAULT '[]'::jsonb;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= scm ======================================================
ALTER TABLE scm.mrp_suggestions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.incoming_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.supplier_quotes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.purchase_contracts ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.purchase_requisitions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.sync_logs ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- ================= srm ======================================================
ALTER TABLE srm.bid_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE srm.bids ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- srm.bid_comparisons 无独立表: handler get_bid_comparison 直接查 srm.bids, 无需建表
ALTER TABLE srm.bids ADD COLUMN IF NOT EXISTS comparison_note TEXT;

-- ================= finance ==================================================
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS expense_number TEXT;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS applicant_name TEXT;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS expense_type TEXT;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS expense_date TIMESTAMPTZ;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS budget_type TEXT;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS total_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS used_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS project_name TEXT;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS amount_received NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid';
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS invoice_number TEXT;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS contract_id UUID;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS amount_paid NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'unpaid';
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;



-- ================= ehs ======================================================
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS risk_no TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS risk_type TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS hazard_factor TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS likelihood INTEGER DEFAULT 1;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS severity INTEGER DEFAULT 1;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS risk_level TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'identified';
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS department_id UUID;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS mitigation JSONB;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ehs.qa_ehs_risks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS hazard_no TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS level TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'identified';
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS location TEXT;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS assessments JSONB;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS controls JSONB;
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ehs.qa_ehs_hazards ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= rd (rs.audit_logs) =======================================
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS action VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS entity_type VARCHAR(100);
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS details JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS request_details JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS response_details JSONB;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS ip_address INET;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS user_agent TEXT;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE rs.audit_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ================= erp: system_settings（handler 无 schema 前缀, search_path 落到 public）==
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS key VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS value TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE public.system_settings ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= mobile ===================================================
CREATE TABLE IF NOT EXISTS mobile.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL DEFAULT '',
    description TEXT,
    category TEXT,
    file_name TEXT,
    file_size BIGINT,
    file_type TEXT,
    url TEXT,
    status TEXT NOT NULL DEFAULT 'active',
    author_id UUID,
    tenant_id UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS policy_key TEXT;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS policy_value JSONB;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- ================= wms: batches ============================================
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS batch_no VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS sku VARCHAR(100);
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS material_name VARCHAR(300);
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS specification TEXT;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS unit VARCHAR(50);
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS quantity NUMERIC(15,3) DEFAULT 0;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS available_quantity NUMERIC(15,3) DEFAULT 0;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS warehouse_name TEXT;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS location_code TEXT;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS production_date TIMESTAMPTZ;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS expiry_date TIMESTAMPTZ;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS receipt_date TIMESTAMPTZ;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS quality_status TEXT DEFAULT 'pending';
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS manufacture_date TIMESTAMPTZ;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS shelf_life_days INTEGER;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS remaining_days INTEGER;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS unit_price NUMERIC(15,4);
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS total_value NUMERIC(15,2);
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE wms.batches ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= lims =====================================================
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS instrument_id UUID;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS instrument_id UUID;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS inspection_no TEXT;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS sample_id UUID;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS sample_code TEXT;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS inspection_type TEXT;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS inspector TEXT;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS inspected_at TIMESTAMPTZ;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE lims.inspection_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= mes =======================================================
ALTER TABLE mes.quality_inspections ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mes.quality_standards ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mes.quality_patrols ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mes.process_flows ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS process_flow_id UUID;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS step_no INTEGER;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS step_name TEXT;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS operation_type TEXT;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS duration_seconds INTEGER;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE mes.process_flow_steps ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= gis =======================================================
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6);
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.business_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS device_id UUID;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS device_name TEXT;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS device_info JSONB;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6);
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS altitude NUMERIC(10,2);
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS speed NUMERIC(10,2);
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'online';
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS located_at TIMESTAMPTZ;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS map_type TEXT;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS floor_level INTEGER DEFAULT 1;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS width NUMERIC(10,2);
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS height NUMERIC(10,2);
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS scale NUMERIC(10,4) DEFAULT 1;
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.factory_maps ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS warehouse_id UUID;
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS longitude NUMERIC(10,6);
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS latitude NUMERIC(10,6);
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS radius NUMERIC(10,2);
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.warehouse_locations ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS location_id UUID;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS location_type TEXT;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS photo_url TEXT;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS taken_at TIMESTAMPTZ;
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.location_photos ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
-- ============================================================================
-- 20261007140000_align_stub_tables_handler_contract.sql —— 第二批
-- (直接以 psql 追加执行; 追加内容已并入迁移文件)
-- ============================================================================

-- ================= flow (主连接池 search_path=flow,... 解析到 flow.*) ========
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS initiator_id UUID;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS current_node_id TEXT;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS variables JSONB DEFAULT '{}'::jsonb;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS version INTEGER;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS definition JSONB;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS isactive BOOLEAN DEFAULT TRUE;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS definition JSONB;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflows ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS instance_id UUID;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS task_key TEXT;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS title TEXT;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS workflow_instance_id UUID;
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'pending';
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.approvals ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS approval_id UUID;
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS actor_id UUID;
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE flow.approval_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= finance ==================================================
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS payment_no VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS invoice_no VARCHAR(100);
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS amount_threshold NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS max_amount NUMERIC(15,2);
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS is_active BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS config_id UUID;
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS node_level INTEGER NOT NULL DEFAULT 1;
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS node_name TEXT;
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS approver_type TEXT DEFAULT 'user';
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= pm.settlement_items ======================================
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS settlement_id UUID;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

-- ================= gis.device_location_records ==============================
ALTER TABLE gis.device_location_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.device_location_records ADD COLUMN IF NOT EXISTS located_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
-- ============ batch-4 ============
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'pending';
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS effective_date TIMESTAMPTZ;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMPTZ;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS ingredients JSONB;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS process_steps JSONB;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS process_params JSONB;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS properties JSONB;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE rs.formulas ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS phase_code TEXT;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS sequence INTEGER DEFAULT 0;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS planned_start TIMESTAMPTZ;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS planned_end TIMESTAMPTZ;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS actual_start TIMESTAMPTZ;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS actual_end TIMESTAMPTZ;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS deliverables JSONB;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_phases ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS risk_code TEXT;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS risk_type TEXT;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS probability INTEGER DEFAULT 1;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS impact INTEGER DEFAULT 1;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS severity INTEGER DEFAULT 1;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS mitigation TEXT;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'identified';
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_risks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS phase_id UUID;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS task_code TEXT;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_apqp_tasks ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS report_no TEXT;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS title TEXT NOT NULL DEFAULT '';
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d1_team JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d2_description JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d3_interim JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d4_root_cause JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d5_corrective JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d6_implement JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d7_prevent JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS d8_celebrate JSONB;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE qms.qa_eightd_reports ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS check_id UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS defect_code TEXT;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS severity TEXT DEFAULT 'medium';
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'open';
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS assignee_id UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;

ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS module TEXT;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS action TEXT;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE mobile.core_mobile_offline_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- 冒烟测试用户种子（mobile user/profile 404 根因: sub 无对应 core_users 行）
INSERT INTO public.core_users (id, username, email, password_hash, full_name, status, is_superuser, tenant_id)
VALUES ('e91e2228-ab9d-4ac3-99f4-fdcd9c723f21', 'test_admin', 'smoke@test.local', 'x', 'Smoke Tester', 'active', true, '00000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;
-- ============ batch-5：完整对齐（handler 精确列清单） ============

-- integration: 服务自带 schema_defense 建了不同列集，CREATE IF NOT EXISTS 被跳过 → 用 ALTER 补齐
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'erp';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS api_url TEXT;
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS api_version VARCHAR(50);
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS app_key VARCHAR(200);
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS app_secret VARCHAR(200);
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS sync_direction VARCHAR(20) NOT NULL DEFAULT 'inbound';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS sync_mode VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS sync_interval INTEGER DEFAULT 60;
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'active';
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS connection_id UUID;
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS mapping_type VARCHAR(50) NOT NULL DEFAULT 'sku';
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS local_id VARCHAR(100);
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS local_code VARCHAR(100);
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS local_name VARCHAR(200);
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS external_code VARCHAR(100);
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS external_name VARCHAR(200);
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS direction VARCHAR(20) NOT NULL DEFAULT 'inbound';
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS condition TEXT;
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.erp_mappings ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS tenant_id VARCHAR(100) NOT NULL DEFAULT '';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS connection_id UUID;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS entity VARCHAR(50);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS direction VARCHAR(20) NOT NULL DEFAULT 'inbound';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS sync_type VARCHAR(50) NOT NULL DEFAULT 'manual';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS total_records INTEGER DEFAULT 0;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS success_count INTEGER DEFAULT 0;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS failed_count INTEGER DEFAULT 0;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS api_url TEXT;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS api_version VARCHAR(50);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS app_key VARCHAR(200);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS app_secret VARCHAR(200);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS sync_mode VARCHAR(20) NOT NULL DEFAULT 'manual';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS sync_interval INTEGER DEFAULT 60;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS isactive BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS last_sync_at TIMESTAMPTZ;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS name VARCHAR(200) NOT NULL DEFAULT '';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS type VARCHAR(50) NOT NULL DEFAULT 'erp';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS mapping_type VARCHAR(50) NOT NULL DEFAULT 'sku';
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS local_id VARCHAR(100);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS local_code VARCHAR(100);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS local_name VARCHAR(200);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS external_code VARCHAR(100);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS external_name VARCHAR(200);
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS priority INTEGER NOT NULL DEFAULT 0;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS condition TEXT;

-- finance: handler 期望列
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS received_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS payment_schedule JSONB;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS payment_schedule JSONB;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.payables ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS reimbursed_at TIMESTAMPTZ;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS paid_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS total_budget NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS usage_rate NUMERIC(8,4) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS approver_id UUID;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS start_date TIMESTAMPTZ;
ALTER TABLE finance.budgets ADD COLUMN IF NOT EXISTS end_date TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS approval_levels INTEGER DEFAULT 1;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS priority INTEGER DEFAULT 0;

-- finance: handler 用 reconciliation_orders / settlements（此前误删，需建表）
CREATE TABLE IF NOT EXISTS finance.reconciliation_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    recon_code TEXT,
    customer_id UUID,
    customer_name TEXT,
    period_start TIMESTAMPTZ,
    period_end TIMESTAMPTZ,
    total_amount NUMERIC(15,2) DEFAULT 0,
    matched_amount NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    items JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS finance.settlements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID,
    project_id UUID,
    settlement_no TEXT,
    settlement_type TEXT,
    amount NUMERIC(15,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    items JSONB,
    created_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- pm
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS folder_name TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS tags JSONB;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS change_note TEXT;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS document_id UUID;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS document_code TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS change_note TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS file_hash TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS report_type TEXT;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS template_code TEXT;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS content TEXT;
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS score NUMERIC(8,2);
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS findings TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS attendees JSONB;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS actual_result TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS recommendations TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS required_standard TEXT;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS budget_code TEXT;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS allocated_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS spent_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS subcategory TEXT;

-- flow: core_workflow_versions
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS code TEXT;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS name TEXT NOT NULL DEFAULT '';
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- communication
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS category TEXT;

-- gis: device_locations 补 properties/registered_by
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS properties JSONB;
ALTER TABLE gis.device_locations ADD COLUMN IF NOT EXISTS registered_by UUID;

-- lims: maintenance_records
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS maintenance_type TEXT;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS result TEXT;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS performed_by UUID;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS planned_date TIMESTAMPTZ;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS actual_start_date TIMESTAMPTZ;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS actual_end_date TIMESTAMPTZ;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS conclusion TEXT;

-- scm: supplier_admissions（服务自带 defense 建了裸表，CREATE IF NOT EXISTS 被跳过 → ALTER 补齐）
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS admission_no TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS supplier_name TEXT NOT NULL DEFAULT '';
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS short_name TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS supplier_category TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS contact_person TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS contact_phone TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS contact_email TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS legal_representative TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS organization_code TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS business_license TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS tax_registration TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS registered_capital NUMERIC(15,2);
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS established_date TIMESTAMPTZ;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS business_scope TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS approval_status TEXT DEFAULT 'draft';
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS applicant TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS application_date TIMESTAMPTZ;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS approver TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- mobile: mobile_users（profile 端点查 mobile.mobile_users，非 core_users）
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS username TEXT NOT NULL DEFAULT '';
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS nickname TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS position TEXT;
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE mobile.mobile_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
INSERT INTO mobile.mobile_users (id, username, nickname, phone, email, department, position, password_hash)
VALUES ('e91e2228-ab9d-4ac3-99f4-fdcd9c723f21', 'test_admin', 'Smoke Tester', '13800000000', 'smoke@test.local', 'QA', 'Engineer', 'x')
ON CONFLICT (id) DO NOTHING;

-- automation: runs 表补 logs 列（run logs 端点）
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS logs TEXT;

-- mes: work_stations 种子（APS 排程需要可用工位）
INSERT INTO mes.work_stations (id, tenant_id, station_no, name, status, capacity, station_name, station_code, created_at, updated_at)
VALUES ('e91e2228-ab9d-4ac3-99f4-fdcd9c723f20', '00000000-0000-0000-0000-000000000001', 'WS-001', 'Workstation 1', 'active', 10, 'Workstation 1', 'WS-001', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- bi: reports 种子（PUT /{id} 数据断言）
INSERT INTO bi.reports (id, tenant_id, name, report_type, config, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', 'Smoke Report', 'summary', '{}'::jsonb, 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ai: ai_models 种子（usage/{id} 数据断言）
INSERT INTO ai.ai_models (id, tenant_id, name, provider, type, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000099', NULL, 'smoke-model', 'smoke', 'chat', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- ============ batch-6：最终收口 ============

-- gis: devices（列表端点查 gis.devices，非 device_locations）
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS device_code TEXT;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS device_name TEXT NOT NULL DEFAULT '';
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS device_type TEXT;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS properties JSONB;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS registered_by UUID;
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE gis.devices ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();

-- iam: auth_sessions 建表（会话列表端点）
CREATE TABLE IF NOT EXISTS iam.auth_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID,
    token TEXT,
    device_info TEXT,
    ip_address TEXT,
    user_agent TEXT,
    active BOOLEAN DEFAULT TRUE,
    expires_at TIMESTAMPTZ,
    last_active_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    deleted_at TIMESTAMPTZ
);

-- pm
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS plan_id UUID;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS actual_result TEXT;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS expected_result TEXT;
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS accepted_by UUID;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS budget_amount NUMERIC(15,2) DEFAULT 0;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS project_milestone_id UUID;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_number TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE pm.document_versions ADD COLUMN IF NOT EXISTS file_path TEXT;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS notification_type TEXT;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS user_id UUID;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS defect_name TEXT;
ALTER TABLE pm.risks ADD COLUMN IF NOT EXISTS mitigation_strategy TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS risk_id UUID;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS item_code TEXT;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS item_name TEXT;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS settlement_id UUID;

-- finance
ALTER TABLE finance.core_finance_approval_nodes ADD COLUMN IF NOT EXISTS node_config JSONB;
ALTER TABLE finance.core_finance_vouchers ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS fiscal_year INTEGER;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS payable_no TEXT;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE finance.finance_v55_invoices ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_v55_invoices ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE finance.finance_v55_invoices ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.finance_v55_reconciliation_rules ADD COLUMN IF NOT EXISTS recon_code TEXT;
ALTER TABLE finance.finance_v55_reconciliation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_v55_reconciliation_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.finance_v55_reconciliation_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_v55_payment_requests ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_v55_payment_requests ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.finance_v55_payment_results ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_v55_payment_results ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';

-- scm（此前漏了 tenant_id）
ALTER TABLE scm.supplier_admissions ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.sync_records ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE scm.materials ADD COLUMN IF NOT EXISTS tenant_id UUID;
-- scm/srm audit_logs: table_name NOT NULL 但 INSERT 未提供 → 放宽 + 补 entity_ids
ALTER TABLE scm.audit_logs ADD COLUMN IF NOT EXISTS entity_ids JSONB;
ALTER TABLE scm.audit_logs ALTER COLUMN table_name SET DEFAULT '';
ALTER TABLE srm.audit_logs ADD COLUMN IF NOT EXISTS entity_ids JSONB;
ALTER TABLE srm.audit_logs ALTER COLUMN table_name SET DEFAULT '';

-- flow: instances 补 tenant_id
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE flow.core_workflow_instances ADD COLUMN IF NOT EXISTS cancel_reason TEXT;

-- lims
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS description TEXT;

-- communication
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS provider_id UUID;

-- bi: status 列类型引用缺失的枚举 report_status → 改回 TEXT（先删依赖视图）
DROP VIEW IF EXISTS bi.report_stats;
ALTER TABLE bi.reports ALTER COLUMN status TYPE TEXT USING status::text;
ALTER TABLE bi.reports ALTER COLUMN status SET DEFAULT 'active';

-- ai: model_usage_stats 补 token_count 等
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS token_count BIGINT DEFAULT 0;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS input_tokens BIGINT DEFAULT 0;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS output_tokens BIGINT DEFAULT 0;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS requests INTEGER DEFAULT 0;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS cost NUMERIC(12,4) DEFAULT 0;
ALTER TABLE ai.usage_logs ADD COLUMN IF NOT EXISTS token_count BIGINT DEFAULT 0;

-- mobile: sync_policies 补唯一约束（ON CONFLICT (user_id)）
CREATE UNIQUE INDEX IF NOT EXISTS sync_policies_user_id_key ON mobile.sync_policies (user_id);

-- qms: eightd 种子（d1-team 端点需已存在报告）
INSERT INTO qms.qa_eightd_reports (id, tenant_id, report_no, title, status, created_at, updated_at)
VALUES ('00000000-0000-0000-0000-000000000099', '00000000-0000-0000-0000-000000000001', '8D-099', 'Smoke 8D', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
-- ============ batch-8：DB 列型与 sqlx 离线缓存/模型解码对齐 ============
ALTER TABLE mes.production_orders ALTER COLUMN quantity TYPE BIGINT USING quantity::bigint;
ALTER TABLE mes.production_orders ALTER COLUMN completed_quantity TYPE BIGINT USING completed_quantity::bigint;
ALTER TABLE mes.production_orders ADD COLUMN IF NOT EXISTS qualified_quantity BIGINT DEFAULT 0;
ALTER TABLE mes.quality_standards ALTER COLUMN effective_date TYPE TEXT USING effective_date::text;
ALTER TABLE mes.quality_inspections ALTER COLUMN inspection_time TYPE TEXT USING inspection_time::text;
ALTER TABLE mes.quality_patrols ALTER COLUMN patrol_time TYPE TEXT USING patrol_time::text;
-- mes.process_flow_steps.equipment_ids 保持 uuid[]（mes 池 UPDATE 按 uuid[] 绑定）
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS voucher_id UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS payment_no TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS bank_account_id UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS bank_name TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS bank_account_no TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY';
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS exchange_rate NUMERIC DEFAULT 1;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS payment_date TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS actual_payment_date TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS bank_transaction_no TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS executed_by UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS executed_at TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS attachment_url TEXT;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS approved_by UUID;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS line_no INT;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS invoice_id UUID;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS payable_id UUID;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS payable_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS write_off_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS write_off_status TEXT;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS write_off_date TIMESTAMPTZ;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS write_off_by UUID;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS remaining_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE finance.core_finance_payment_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS payment_id UUID;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS workflow_id UUID;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS workflow_name TEXT;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS current_level INT DEFAULT 1;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS current_approver UUID;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS comment TEXT;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.core_finance_payment_workflow ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS collected_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS reference_no TEXT;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS supplier_id UUID;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS supplier_name TEXT;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY';
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;
ALTER TABLE finance.core_finance_accounts ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE finance.core_finance_payment_approval_config ADD COLUMN IF NOT EXISTS node_config JSONB;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS recon_code TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS recon_name TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS recon_type TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS period TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS total_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS matched_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS unmatched_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS reconciliation_id UUID;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS item_type TEXT;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS business_id UUID;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS business_no TEXT;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS status TEXT;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS remark TEXT;
ALTER TABLE finance.reconciliation_item_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS item_description TEXT;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS is_passed BOOLEAN;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_name TEXT;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS enabled BOOLEAN DEFAULT TRUE;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS defect_description TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS mitigation_strategy TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS event_type TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS event_name TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS event_date TIMESTAMPTZ;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS impact TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS budget_amount NUMERIC DEFAULT 0;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS actual_amount NUMERIC DEFAULT 0;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS adjustment_type TEXT;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS adjustment_name TEXT;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS reason TEXT;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS document_code TEXT;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS document_name TEXT;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS is_default BOOLEAN DEFAULT FALSE;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS request_count BIGINT DEFAULT 0;
ALTER TABLE public.core_sessions ADD COLUMN IF NOT EXISTS device_info TEXT;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS performed_at TIMESTAMPTZ;
ALTER TABLE scm.sync_record_details ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE integration.erp_connections ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE integration.external_erp_sync_logs ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS project_id UUID;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS settlement_no TEXT;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS settlement_type TEXT;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'draft';
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS settlement_date TIMESTAMPTZ;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS remarks TEXT;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS entity_id UUID;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS source_id TEXT;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS sync_type TEXT;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS total_count INT DEFAULT 0;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS success_count INT DEFAULT 0;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS failed_count INT DEFAULT 0;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS error_message TEXT;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS started_at TIMESTAMPTZ;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE integration.integration_sync_logs ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS rate_limit_per_minute INT DEFAULT 0;
ALTER TABLE public.core_sessions ADD COLUMN IF NOT EXISTS last_active_at TIMESTAMPTZ;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS next_maintenance_date TIMESTAMPTZ;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS required_standard TEXT;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS comments TEXT;
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS target_date TIMESTAMPTZ;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_percent NUMERIC DEFAULT 0;
ALTER TABLE pm.project_documents ADD COLUMN IF NOT EXISTS document_type TEXT;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS notify_before_days INT DEFAULT 0;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS priority TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS contingency_plan TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS event_description TEXT;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS variance_amount NUMERIC DEFAULT 0;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS adjustment_code TEXT;
ALTER TABLE mes.process_flow_steps ALTER COLUMN equipment_ids TYPE uuid[] USING equipment_ids::uuid[];
ALTER TABLE finance.core_finance_accounts ADD COLUMN IF NOT EXISTS is_leaf BOOLEAN DEFAULT FALSE;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS receivable_no TEXT;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS customer_id UUID;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS customer_name TEXT;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS invoice_no TEXT;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS amount NUMERIC DEFAULT 0;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY';
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS received_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'pending';
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_receivables ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE finance.erp_payables ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS source_type TEXT;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS source_filter TEXT;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS mapping_config JSONB;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS output_voucher_type TEXT;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS entity_type TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE finance.settlement_snapshots ADD COLUMN IF NOT EXISTS synced_at TIMESTAMPTZ;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS date TIMESTAMPTZ;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS retry_count INT DEFAULT 0;
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.acceptance_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS payment_amount NUMERIC DEFAULT 0;
ALTER TABLE pm.notification_settings ADD COLUMN IF NOT EXISTS preferred_channel TEXT;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS assignee TEXT;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS trigger_condition TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS occurred_at TIMESTAMPTZ;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS variance_percent NUMERIC DEFAULT 0;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS cost NUMERIC DEFAULT 0;
ALTER TABLE ai.model_usage_stats ADD COLUMN IF NOT EXISTS model_id UUID;
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_collection_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS paid_amount NUMERIC DEFAULT 0;
ALTER TABLE lims.maintenance_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS payment_percent NUMERIC DEFAULT 0;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS due_date TIMESTAMPTZ;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS warning_threshold TEXT;
ALTER TABLE pm.risk_events ADD COLUMN IF NOT EXISTS reported_by UUID;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE pm.settlement_adjustments ADD COLUMN IF NOT EXISTS supporting_documents TEXT;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS currency TEXT DEFAULT 'CNY';
ALTER TABLE finance.reconciliation_snapshots ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE pm.contract_milestones ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE pm.contract_payment_schedule ADD COLUMN IF NOT EXISTS actual_payment_date TIMESTAMPTZ;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS resolution TEXT;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS expense_ref_id UUID;
ALTER TABLE pm.project_risks ADD COLUMN IF NOT EXISTS response_due_date TIMESTAMPTZ;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE pm.defects ADD COLUMN IF NOT EXISTS resolved_at TIMESTAMPTZ;
ALTER TABLE pm.settlement_items ADD COLUMN IF NOT EXISTS contract_ref_id UUID;
ALTER TABLE finance.erp_payment_records ADD COLUMN IF NOT EXISTS description TEXT;
ALTER TABLE public.core_notification_templates ADD COLUMN IF NOT EXISTS priority INT DEFAULT 0;
ALTER TABLE public.core_notification_templates ADD COLUMN IF NOT EXISTS data JSONB;
ALTER TABLE wms.audit_logs ALTER COLUMN ip_address TYPE text USING ip_address::text;
ALTER TABLE scm.audit_logs ALTER COLUMN record_id DROP NOT NULL;
ALTER TABLE hrm.audit_logs ALTER COLUMN tenant_id DROP NOT NULL;
ALTER TABLE erp.audit_logs ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE wms.audit_logs ALTER COLUMN org_id DROP NOT NULL;
ALTER TABLE wms.audit_logs ALTER COLUMN organization_id DROP NOT NULL;
ALTER TABLE wms.audit_logs ALTER COLUMN resource DROP NOT NULL;
