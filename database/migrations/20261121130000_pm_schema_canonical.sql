-- 20261121130000: pm 18 张运行期表收口（W2-D2 第十八个模块）
--
-- 背景：svc/pm/src/schema_defense.rs 的 TABLE_DEFS 声明 18 张表（项目/阶段/里程碑/成员/资源/费用/收益/预算/风险/审批/合同/质检/验收/结算/文档/项目类型配置/通知/任务），
-- 启动时由 schema_defense 建表并逐列补列。live pm 另有 19 张由既有迁移维护的业务表（acceptance_*、contract_*、settlement_*、report_* 等），
-- 不在 TABLE_DEFS 内，本迁移不纳入、不改动。
-- 迁移内容：18 表 / 332 列 / 192 约束 / 31 索引 / 19 策略 / 18 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS pm.acceptances (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    acceptance_no character varying(50) NOT NULL,
    acceptance_type character varying(50) NOT NULL,
    acceptance_date timestamp with time zone NOT NULL,
    acceptor character varying(100) NOT NULL,
    result character varying(20) NOT NULL,
    comments text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.budgets (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    project_id uuid NOT NULL,
    budget_type character varying(50) NOT NULL,
    planned_amount numeric(15,2) NOT NULL,
    actual_amount numeric(15,2) DEFAULT 0,
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    period character varying(20),
    description text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid NOT NULL,
    budget_code character varying(64) DEFAULT ''::character varying NOT NULL,
    budget_name character varying(200) DEFAULT ''::character varying NOT NULL,
    total_amount double precision DEFAULT 0 NOT NULL,
    allocated_amount double precision DEFAULT 0 NOT NULL,
    spent_amount double precision DEFAULT 0 NOT NULL,
    remaining_amount numeric(18,2) DEFAULT 0 NOT NULL,
    status character varying(32) DEFAULT 'draft'::character varying NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_by character varying(64),
    version integer DEFAULT 1 NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.contracts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    tax_rate numeric(12,2),
    description text,
    amount numeric(15,2),
    contract_name character varying(200) NOT NULL,
    contract_no character varying(50) NOT NULL,
    contract_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    end_date timestamp with time zone,
    party_a character varying(200) NOT NULL,
    party_b character varying(200) NOT NULL,
    project_id uuid NOT NULL,
    sign_date timestamp with time zone,
    start_date timestamp with time zone,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.documents (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    document_type character varying(50) NOT NULL,
    document_name character varying(200) NOT NULL,
    file_path character varying(500),
    file_size integer,
    version character varying(20),
    author character varying(100),
    status character varying(20) DEFAULT 'active'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    priority text,
    metadata jsonb,
    due_date timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    content text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    notification_type character varying(50) NOT NULL,
    project_id uuid,
    recipient character varying(100) NOT NULL,
    sent_at timestamp with time zone DEFAULT now() NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.pm_tasks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    task_number character varying(50),
    title character varying(200) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'todo'::character varying NOT NULL,
    priority character varying(20) DEFAULT 'medium'::character varying NOT NULL,
    assignee character varying(100),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    progress integer DEFAULT 0 NOT NULL,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    title_en character varying(255),
    description_en text
);

CREATE TABLE IF NOT EXISTS pm.project_approvals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    approvals jsonb,
    created_by uuid,
    current_step integer,
    total_steps integer,
    applicant character varying(100) NOT NULL,
    approval_type character varying(50) NOT NULL,
    approved_at timestamp with time zone,
    approver character varying(100),
    comments text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    description text,
    project_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    submitted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    title character varying(200) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.project_benefits (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    period_type text,
    period_date date,
    planned_cost double precision,
    actual_cost double precision,
    planned_progress integer,
    actual_progress integer,
    planned_value double precision,
    earned_value double precision,
    actual_cost_eva double precision,
    cpi double precision,
    spi double precision,
    cv double precision,
    sv double precision,
    eac double precision,
    etc double precision,
    roi double precision,
    notes text,
    amount numeric(15,2) NOT NULL,
    benefit_date timestamp with time zone NOT NULL,
    benefit_type character varying(50) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    description text,
    project_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.project_expenses (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    phase_id uuid,
    budget_item_id uuid,
    resource_id uuid,
    expense_ref_id character varying,
    approval_workflow_id uuid,
    attachment_ids uuid[],
    amount numeric(15,2) NOT NULL,
    approved_date timestamp with time zone,
    approver character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    description text,
    expense_date timestamp with time zone NOT NULL,
    expense_type character varying(50) NOT NULL,
    project_id uuid NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    user_id character varying(100) NOT NULL,
    role character varying(50) NOT NULL,
    responsibilities text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    tenant_id uuid,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS pm.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid,
    name character varying(100) NOT NULL,
    description text,
    due_date timestamp with time zone,
    completed_date timestamp with time zone,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    date timestamp with time zone,
    acceptance_criteria text
);

CREATE TABLE IF NOT EXISTS pm.project_phases (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    project_id uuid NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    progress integer DEFAULT 0 NOT NULL,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    sequence_number integer,
    predecessor_ids uuid[]
);

CREATE TABLE IF NOT EXISTS pm.project_resources (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    resource_service character varying,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    allocation_percent integer,
    created_by character varying,
    cost numeric(15,2),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    project_id uuid NOT NULL,
    quantity numeric(10,2),
    resource_name character varying(100) NOT NULL,
    resource_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'allocated'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    unit character varying(20),
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    resource_id character varying(64),
    role character varying(64),
    actual_hours numeric(12,2),
    actual_cost numeric(14,2)
);

CREATE TABLE IF NOT EXISTS pm.project_type_configs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    default_milestones jsonb,
    default_phases jsonb,
    default_workflow uuid,
    description text,
    is_active boolean DEFAULT true NOT NULL,
    tenant_id uuid,
    type_code character varying(20) NOT NULL,
    type_name character varying(50) NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    name_en character varying(50)
);

CREATE TABLE IF NOT EXISTS pm.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(200) NOT NULL,
    code character varying(50) NOT NULL,
    description text,
    project_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying NOT NULL,
    leader character varying(100),
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    budget numeric(18,4),
    progress integer DEFAULT 0 NOT NULL,
    project_config jsonb,
    benefit_target jsonb,
    risk_level character varying(20),
    priority integer,
    parent_id uuid,
    workspace_id uuid,
    created_by character varying(100),
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    name_en character varying(500),
    cost_center_id character varying(64),
    cost_center_name character varying(256),
    tags jsonb DEFAULT '{}'::jsonb,
    settled_amount numeric(15,2),
    settled_at timestamp with time zone,
    settled_by character varying(100)
);

CREATE TABLE IF NOT EXISTS pm.quality_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    phase_id uuid,
    milestone_id uuid,
    acceptance_standard text,
    result_details jsonb,
    nonconformities jsonb,
    corrective_actions jsonb,
    follow_up_date timestamp with time zone,
    check_date timestamp with time zone NOT NULL,
    check_name character varying(200) NOT NULL,
    check_type character varying(50) NOT NULL,
    checker character varying(100) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    issues text,
    project_id uuid NOT NULL,
    result character varying(20) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE TABLE IF NOT EXISTS pm.risks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    contingency_plan text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    description text,
    impact character varying(20) NOT NULL,
    mitigation_plan text,
    owner character varying(100),
    probability character varying(20) NOT NULL,
    project_id uuid NOT NULL,
    risk_level character varying(20) NOT NULL,
    risk_name character varying(200) NOT NULL,
    risk_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'identified'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    mitigation_strategy text
);

CREATE TABLE IF NOT EXISTS pm.settlements (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    deleted_at timestamp with time zone,
    settlement_name character varying,
    settlement_period_start timestamp with time zone,
    settlement_period_end timestamp with time zone,
    approved_at timestamp with time zone,
    amount numeric(15,2) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    created_by character varying(100),
    currency character varying(10) DEFAULT 'CNY'::character varying NOT NULL,
    project_id uuid NOT NULL,
    remarks text,
    settlement_date timestamp with time zone NOT NULL,
    settlement_no character varying(50) NOT NULL,
    settlement_type character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying NOT NULL,
    tenant_id uuid NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_budgets_project_id ON pm.budgets USING btree (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_project_benefits_period ON pm.project_benefits USING btree (project_id, period_type, period_date);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON pm.project_members USING btree (project_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_pm_project_members_project_user ON pm.project_members USING btree (project_id, user_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_phase_id ON pm.project_milestones USING btree (phase_id);
CREATE INDEX IF NOT EXISTS idx_project_milestones_project_id ON pm.project_milestones USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON pm.project_phases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_pm_projects_created_at ON pm.projects USING btree (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pm_projects_tenant_id ON pm.projects USING btree (tenant_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_code_unique ON pm.projects USING btree (code);
CREATE INDEX IF NOT EXISTS idx_projects_parent_id ON pm.projects USING btree (parent_id);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.acceptances'::regclass AND conname='acceptances_pkey') THEN
        ALTER TABLE pm.acceptances ADD CONSTRAINT "acceptances_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.budgets'::regclass AND conname='budgets_pkey') THEN
        ALTER TABLE pm.budgets ADD CONSTRAINT "budgets_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.contracts'::regclass AND conname='contracts_pkey') THEN
        ALTER TABLE pm.contracts ADD CONSTRAINT "contracts_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.documents'::regclass AND conname='documents_pkey') THEN
        ALTER TABLE pm.documents ADD CONSTRAINT "documents_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.notifications'::regclass AND conname='notifications_pkey') THEN
        ALTER TABLE pm.notifications ADD CONSTRAINT "notifications_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.pm_tasks'::regclass AND conname='pm_tasks_pkey') THEN
        ALTER TABLE pm.pm_tasks ADD CONSTRAINT "pm_tasks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_approvals'::regclass AND conname='project_approvals_pkey') THEN
        ALTER TABLE pm.project_approvals ADD CONSTRAINT "project_approvals_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_benefits'::regclass AND conname='project_benefits_pkey') THEN
        ALTER TABLE pm.project_benefits ADD CONSTRAINT "project_benefits_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_expenses'::regclass AND conname='project_expenses_pkey') THEN
        ALTER TABLE pm.project_expenses ADD CONSTRAINT "project_expenses_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_members'::regclass AND conname='project_members_pkey') THEN
        ALTER TABLE pm.project_members ADD CONSTRAINT "project_members_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_milestones'::regclass AND conname='project_milestones_pkey') THEN
        ALTER TABLE pm.project_milestones ADD CONSTRAINT "project_milestones_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_phases'::regclass AND conname='project_phases_pkey') THEN
        ALTER TABLE pm.project_phases ADD CONSTRAINT "project_phases_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_resources'::regclass AND conname='project_resources_pkey') THEN
        ALTER TABLE pm.project_resources ADD CONSTRAINT "project_resources_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_type_configs'::regclass AND conname='project_type_configs_pkey') THEN
        ALTER TABLE pm.project_type_configs ADD CONSTRAINT "project_type_configs_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.projects'::regclass AND conname='projects_pkey') THEN
        ALTER TABLE pm.projects ADD CONSTRAINT "projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.quality_checks'::regclass AND conname='quality_checks_pkey') THEN
        ALTER TABLE pm.quality_checks ADD CONSTRAINT "quality_checks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.risks'::regclass AND conname='risks_pkey') THEN
        ALTER TABLE pm.risks ADD CONSTRAINT "risks_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.settlements'::regclass AND conname='settlements_pkey') THEN
        ALTER TABLE pm.settlements ADD CONSTRAINT "settlements_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.project_type_configs'::regclass AND conname='project_type_configs_tenant_type_code_key') THEN
        ALTER TABLE pm.project_type_configs ADD CONSTRAINT "project_type_configs_tenant_type_code_key" UNIQUE (tenant_id, type_code);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='pm.projects'::regclass AND conname='projects_code_key') THEN
        ALTER TABLE pm.projects ADD CONSTRAINT "projects_code_key" UNIQUE (code);
    END IF;
END $$;


ALTER TABLE pm.acceptances ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.acceptances FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.budgets FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.contracts FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.notifications FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.pm_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.pm_tasks FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_approvals ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_approvals FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_benefits ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_benefits FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_expenses FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_members FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_phases FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_resources ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_resources FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.project_type_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.project_type_configs FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.projects FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.quality_checks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.quality_checks FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.risks ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.risks FORCE ROW LEVEL SECURITY;
ALTER TABLE pm.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE pm.settlements FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tenant_isolation_acceptances" ON pm.acceptances;
CREATE POLICY "tenant_isolation_acceptances" ON pm.acceptances AS PERMISSIVE FOR ALL USING ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.budgets;
CREATE POLICY "rls_tenant_isolation" ON pm.budgets AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.contracts;
CREATE POLICY "rls_tenant_isolation" ON pm.contracts AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "tenant_isolation_documents" ON pm.documents;
CREATE POLICY "tenant_isolation_documents" ON pm.documents AS PERMISSIVE FOR ALL USING ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK ((((NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid = '00000000-0000-0000-0000-000000000000'::uuid) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.notifications;
CREATE POLICY "rls_tenant_isolation" ON pm.notifications AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.pm_tasks;
CREATE POLICY "rls_tenant_isolation" ON pm.pm_tasks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_approvals;
CREATE POLICY "rls_tenant_isolation" ON pm.project_approvals AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_benefits;
CREATE POLICY "rls_tenant_isolation" ON pm.project_benefits AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_expenses;
CREATE POLICY "rls_tenant_isolation" ON pm.project_expenses AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_members;
CREATE POLICY "rls_tenant_isolation" ON pm.project_members AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_milestones;
CREATE POLICY "rls_tenant_isolation" ON pm.project_milestones AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_phases;
CREATE POLICY "rls_tenant_isolation" ON pm.project_phases AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_resources;
CREATE POLICY "rls_tenant_isolation" ON pm.project_resources AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_platform_read" ON pm.project_type_configs;
CREATE POLICY "rls_platform_read" ON pm.project_type_configs AS PERMISSIVE FOR SELECT USING (((tenant_id = '00000000-0000-0000-0000-000000000000'::uuid) AND (NULLIF(current_setting('app.tenant_id'::text, true), ''::text) IS NOT NULL)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.project_type_configs;
CREATE POLICY "rls_tenant_isolation" ON pm.project_type_configs AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.projects;
CREATE POLICY "rls_tenant_isolation" ON pm.projects AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.quality_checks;
CREATE POLICY "rls_tenant_isolation" ON pm.quality_checks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.risks;
CREATE POLICY "rls_tenant_isolation" ON pm.risks AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON pm.settlements;
CREATE POLICY "rls_tenant_isolation" ON pm.settlements AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
