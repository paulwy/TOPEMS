-- 20261121190000: rd 6 张运行期表收口（W2-D2 第二十四个模块）
--
-- 背景：svc/rd/src/schema_defense.rs 的 TABLE_DEFS 声明 6 张表，schema 为 rs，
-- 启动时由 schema_defense 建表/补列。live rs 另有 formulas/experiments/patents
-- 等由既有迁移维护，不在 TABLE_DEFS 内，不纳入、不改动。
-- 迁移内容：6 表 / 106 列 / 61 约束 / 11 索引 / 6 策略 / 6 RLS；五项 diff 为 0。
-- 以 baseline+forward 库真实形状固化；删除运行期 DDL 后由迁移链唯一维护。
-- 幂等：CREATE TABLE IF NOT EXISTS；约束用 pg_constraint 存在性守卫；
-- 索引 IF NOT EXISTS；策略先 DROP IF EXISTS 再建。不删除数据、不改已有列类型。

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- CREATE SCHEMA 已归位：由 database/scripts/bootstrap_schemas.sql 预置（迁移不再自建 schema）

CREATE TABLE IF NOT EXISTS rs.change_orders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    change_request_id uuid NOT NULL,
    title text NOT NULL,
    execution_plan text,
    status text DEFAULT 'planned'::text NOT NULL,
    executed_by text,
    executed_at timestamp with time zone,
    notes text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.change_requests (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid,
    title text NOT NULL,
    description text,
    change_type text NOT NULL,
    priority text DEFAULT 'medium'::text NOT NULL,
    status text DEFAULT 'submitted'::text NOT NULL,
    impact_score integer DEFAULT 0 NOT NULL,
    scope_docs integer DEFAULT 0 NOT NULL,
    scope_phases integer DEFAULT 0 NOT NULL,
    proposed_by text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.project_members (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    employee_id uuid NOT NULL,
    role character varying(50) DEFAULT 'OTHER'::character varying NOT NULL,
    responsibility text,
    allocation double precision DEFAULT 1.0,
    join_date timestamp with time zone NOT NULL,
    leave_date timestamp with time zone,
    status character varying(50) DEFAULT 'ACTIVE'::character varying NOT NULL,
    hourly_rate double precision,
    cost_rate double precision,
    budgeted_hours double precision,
    actual_hours double precision,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.project_milestones (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    tenant_id uuid NOT NULL,
    project_id uuid NOT NULL,
    phase_id uuid,
    name character varying(200) NOT NULL,
    description text,
    target_date timestamp with time zone NOT NULL,
    actual_date timestamp with time zone,
    status character varying(50) DEFAULT 'PENDING'::character varying NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deliverable_type character varying(100),
    acceptance_criteria text,
    acceptance_status character varying(50),
    accepted_by character varying(255),
    accepted_at timestamp with time zone,
    deleted_at timestamp with time zone
);

CREATE TABLE IF NOT EXISTS rs.project_phases (
    id uuid DEFAULT public.uuid_generate_v4() NOT NULL,
    project_id uuid NOT NULL,
    phase_number integer NOT NULL,
    name character varying(200) NOT NULL,
    description text,
    start_date timestamp with time zone,
    end_date timestamp with time zone,
    planned_duration_days integer,
    actual_duration_days integer,
    status character varying(50) DEFAULT 'NOT_STARTED'::character varying NOT NULL,
    progress integer DEFAULT 0,
    predecessor_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    deleted_at timestamp with time zone,
    tenant_id uuid NOT NULL,
    weight integer
);

CREATE TABLE IF NOT EXISTS rs.projects (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name character varying(255) NOT NULL,
    code character varying(100) NOT NULL,
    description text,
    project_type character varying(100) NOT NULL,
    status character varying(50) DEFAULT 'active'::character varying NOT NULL,
    leader character varying(255) NOT NULL,
    team_members jsonb,
    start_date timestamp with time zone DEFAULT now() NOT NULL,
    end_date timestamp with time zone,
    budget double precision,
    progress integer DEFAULT 0 NOT NULL,
    created_by character varying(255) NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    project_config jsonb,
    benefit_target jsonb,
    risk_level character varying(32),
    parent_id uuid,
    workspace_id uuid,
    tags jsonb,
    priority integer,
    tenant_id uuid DEFAULT '00000000-0000-0000-0000-000000000001'::uuid,
    deleted_at timestamp with time zone,
    source_type character varying(50),
    source_id uuid,
    actual_cost double precision DEFAULT 0 NOT NULL,
    actual_end_date timestamp with time zone
);

CREATE INDEX IF NOT EXISTS idx_project_phases_predecessor_id ON rs.project_phases USING btree (predecessor_id);
CREATE INDEX IF NOT EXISTS idx_project_phases_project_id ON rs.project_phases USING btree (project_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON rs.projects USING btree (status);
CREATE INDEX IF NOT EXISTS idx_projects_tenant ON rs.projects USING btree (tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_type ON rs.projects USING btree (project_type);
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.change_orders'::regclass AND conname='change_orders_pkey') THEN
        ALTER TABLE rs.change_orders ADD CONSTRAINT "change_orders_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.change_requests'::regclass AND conname='change_requests_pkey') THEN
        ALTER TABLE rs.change_requests ADD CONSTRAINT "change_requests_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.project_members'::regclass AND conname='project_members_pkey') THEN
        ALTER TABLE rs.project_members ADD CONSTRAINT "project_members_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.project_milestones'::regclass AND conname='project_milestones_pkey') THEN
        ALTER TABLE rs.project_milestones ADD CONSTRAINT "project_milestones_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.project_phases'::regclass AND conname='project_phases_pkey') THEN
        ALTER TABLE rs.project_phases ADD CONSTRAINT "project_phases_pkey" PRIMARY KEY (id);
    END IF;
END $$;

DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid='rs.projects'::regclass AND conname='projects_pkey') THEN
        ALTER TABLE rs.projects ADD CONSTRAINT "projects_pkey" PRIMARY KEY (id);
    END IF;
END $$;


ALTER TABLE rs.change_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.change_orders FORCE ROW LEVEL SECURITY;
ALTER TABLE rs.change_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.change_requests FORCE ROW LEVEL SECURITY;
ALTER TABLE rs.project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.project_members FORCE ROW LEVEL SECURITY;
ALTER TABLE rs.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.project_milestones FORCE ROW LEVEL SECURITY;
ALTER TABLE rs.project_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.project_phases FORCE ROW LEVEL SECURITY;
ALTER TABLE rs.projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE rs.projects FORCE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.change_orders;
CREATE POLICY "rls_tenant_isolation" ON rs.change_orders AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.change_requests;
CREATE POLICY "rls_tenant_isolation" ON rs.change_requests AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.project_members;
CREATE POLICY "rls_tenant_isolation" ON rs.project_members AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.project_milestones;
CREATE POLICY "rls_tenant_isolation" ON rs.project_milestones AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.project_phases;
CREATE POLICY "rls_tenant_isolation" ON rs.project_phases AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
DROP POLICY IF EXISTS "rls_tenant_isolation" ON rs.projects;
CREATE POLICY "rls_tenant_isolation" ON rs.projects AS PERMISSIVE FOR ALL USING (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid))) WITH CHECK (((COALESCE(current_setting('app.rls_system'::text, true), 'off'::text) = 'on'::text) OR (tenant_id = (NULLIF(current_setting('app.tenant_id'::text, true), ''::text))::uuid)));
