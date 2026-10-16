-- =============================================================================
-- 20261017000001_web_contract_smoke_stub_cols_align.sql
-- web-contract-smoke 61 项存量服务端 500（stub 表缺列）对齐迁移
-- 风格：ADD COLUMN IF NOT EXISTS self-heal（参照 20261007000009_align_orphan_tables_selfheal3.sql）
-- 类型对照 Rust model：Uuid→uuid、DateTime→timestamptz、String→text/varchar、
--   bool→boolean、金额→numeric、时间日期→timestamptz（仓库 10-15 后统一 timestamptz）
-- =============================================================================

-- automation: cancel_run UPDATE 引用 completed_at（表内仅有 finished_at）
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS completed_at timestamptz;
-- automation: AutomationRun 模型经 SELECT * 引用 steps/output_data/duration_ms（表内仅有 output）
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS steps jsonb;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS output_data jsonb;
ALTER TABLE public.automation_runs ADD COLUMN IF NOT EXISTS duration_ms integer;

-- communication: notification_channels handler SELECT/RETURNING 引用 type（库中仅有 channel_type）
ALTER TABLE communication.notification_channels ADD COLUMN IF NOT EXISTS type varchar(32) NOT NULL DEFAULT 'system';

-- flow: core_workflow_tasks 补 comment/completed_at/due_time（public 全量表已有，flow stub 补齐）
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS comment text;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS completed_at timestamptz;
ALTER TABLE flow.core_workflow_tasks ADD COLUMN IF NOT EXISTS due_time timestamptz;
-- flow: core_workflow_versions 补 change_description
ALTER TABLE flow.core_workflow_versions ADD COLUMN IF NOT EXISTS change_description text;

-- finance
ALTER TABLE finance.expenses ADD COLUMN IF NOT EXISTS receipt_count INTEGER DEFAULT 0;
ALTER TABLE finance.receivables ADD COLUMN IF NOT EXISTS invoice_date TIMESTAMPTZ;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS tenant_id UUID;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS name TEXT;
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();
ALTER TABLE finance.finance_voucher_generation_rules ADD COLUMN IF NOT EXISTS created_by TEXT;
ALTER TABLE finance.finance_voucher_template_lines ADD COLUMN IF NOT EXISTS template_id UUID;
ALTER TABLE finance.reconcile_items ADD COLUMN IF NOT EXISTS tenant_id UUID;

-- lims: 无缺列（PUT maintenance 为 COALESCE 类型不匹配，走 handler 修复）

-- mes: 无缺列（PUT process-flow steps / teams 为 COALESCE 类型不匹配，走 handler 修复）

-- pm
ALTER TABLE pm.acceptance_records ADD COLUMN IF NOT EXISTS acceptance_date timestamptz;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS item_code text;
ALTER TABLE pm.budget_items ADD COLUMN IF NOT EXISTS item_name text NOT NULL DEFAULT '';
ALTER TABLE pm.contract_templates ADD COLUMN IF NOT EXISTS contract_type text;
ALTER TABLE pm.document_folders ADD COLUMN IF NOT EXISTS folder_name text NOT NULL DEFAULT '';
ALTER TABLE pm.report_templates ADD COLUMN IF NOT EXISTS template_name text NOT NULL DEFAULT '';

-- wms
ALTER TABLE wms.safety_stock_settings ADD COLUMN IF NOT EXISTS tenant_id uuid;

-- pm: acceptance_records.findings/recommendations handler 按 jsonb 强转绑定，列型 text→jsonb（存量 0 行）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='pm' AND table_name='acceptance_records' AND column_name='findings'
                 AND data_type='text') THEN
        ALTER TABLE pm.acceptance_records ALTER COLUMN findings TYPE jsonb USING NULLIF(findings,'')::jsonb;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='pm' AND table_name='acceptance_records' AND column_name='recommendations'
                 AND data_type='text') THEN
        ALTER TABLE pm.acceptance_records ALTER COLUMN recommendations TYPE jsonb USING NULLIF(recommendations,'')::jsonb;
    END IF;
END $$;

-- pm: project_risks.warning_threshold handler 按 ::int 绑定，列型 text→integer（存量 0 行）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='pm' AND table_name='project_risks' AND column_name='warning_threshold'
                 AND data_type='text') THEN
        ALTER TABLE pm.project_risks ALTER COLUMN warning_threshold TYPE integer USING NULLIF(warning_threshold,'')::integer;
    END IF;
END $$;
