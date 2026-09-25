-- TOPEMS database migration 20260918000068
-- 深冒烟真实写路径（200 但 DB 错误被业务层包装）暴露的 DB 坑批量修复：
-- 1) pdm_production_steps/batches/projects：5432 缺表（5433 有）→ 对齐补建
-- 2) erp.meeting_rooms：5432 缺表（5433 有）→ 对齐补建
-- 3) scm.purchase_items 缺 product_code（代码 INSERT 用）
-- 4) mes.production_processes 缺 equipment_required（代码 INSERT 用）
-- 5) qa_lab_processes：代码 INSERT 用 process_name/is_active，表用 name/status → 加列 + name 可空
-- 6) pm.projects/contracts 状态约束枚举过窄（同 scm 模式）→ 扩展
-- 7) scm.audit_logs 缺 user_id；erp.audit_logs tenant_id/organization_id NOT NULL 但代码不传 → 放宽
-- 8) rs.formulas/patents/research_costs/audit_logs：5432/5433 均缺表 → 按代码 INSERT 列补建
-- 全部幂等、双库安全（IF EXISTS / IF NOT EXISTS 守卫）。

DO $$
BEGIN
    -- 0. 补建 pdm/erp schema（5432 缺 pdm；5433 已有自动跳过）
    CREATE SCHEMA IF NOT EXISTS pdm;
    CREATE SCHEMA IF NOT EXISTS erp;
    CREATE SCHEMA IF NOT EXISTS rs;
    -- ============ 1. pdm 三表补建（5432 缺，5433 有） ============
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_steps') THEN
        CREATE TABLE pdm.pdm_production_steps (
            id uuid PRIMARY KEY,
            tenant_id uuid NOT NULL,
            process_id uuid NOT NULL,
            step_no integer NOT NULL,
            name character varying NOT NULL,
            description text,
            standard_time numeric,
            equipment_requirement character varying,
            quality_check character varying,
            status character varying,
            deleted_at timestamptz without time zone
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_batches') THEN
        CREATE TABLE pdm.pdm_production_batches (
            id uuid PRIMARY KEY,
            tenant_id uuid NOT NULL,
            batch_no character varying NOT NULL,
            product_id uuid,
            product_name character varying,
            quantity numeric,
            unit character varying,
            start_date timestamptz without time zone,
            end_date timestamptz without time zone,
            status character varying,
            notes text,
            created_at timestamptz without time zone NOT NULL DEFAULT now(),
            updated_at timestamptz without time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz without time zone
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_projects') THEN
        CREATE TABLE pdm.pdm_projects (
            id uuid PRIMARY KEY,
            tenant_id uuid NOT NULL,
            project_no character varying NOT NULL,
            name character varying NOT NULL,
            description text,
            status character varying,
            phase character varying,
            start_date timestamptz without time zone,
            end_date timestamptz without time zone,
            manager_id character varying,
            manager_name character varying,
            budget double precision,
            progress integer,
            created_by character varying,
            created_at timestamptz without time zone NOT NULL DEFAULT now(),
            updated_at timestamptz without time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz without time zone
        );
    END IF;
    -- pdm 表索引
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='pdm' AND tablename='pdm_production_steps' AND indexname='idx_pdm_production_steps_process_id') THEN
        CREATE INDEX idx_pdm_production_steps_process_id ON pdm.pdm_production_steps(process_id);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='pdm' AND tablename='pdm_production_batches' AND indexname='idx_pdm_production_batches_batch_no') THEN
        CREATE INDEX idx_pdm_production_batches_batch_no ON pdm.pdm_production_batches(batch_no);
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_indexes WHERE schemaname='pdm' AND tablename='pdm_projects' AND indexname='idx_pdm_projects_project_no') THEN
        CREATE INDEX idx_pdm_projects_project_no ON pdm.pdm_projects(project_no);
    END IF;

    -- ============ 2. erp.meeting_rooms 补建（5432 缺） ============
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='erp' AND table_name='meeting_rooms') THEN
        CREATE TABLE erp.meeting_rooms (
            id uuid PRIMARY KEY,
            name character varying NOT NULL,
            capacity integer NOT NULL,
            location character varying,
            facilities text[],
            status character varying NOT NULL DEFAULT 'active',
            created_at timestamptz without time zone NOT NULL DEFAULT now(),
            updated_at timestamptz without time zone NOT NULL DEFAULT now()
        );
    END IF;

    -- ============ 3. scm.purchase_items 补列 ============
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='product_code') THEN
            ALTER TABLE scm.purchase_items ADD COLUMN product_code character varying;
        END IF;
    END IF;

    -- ============ 4. mes.production_processes 补列 ============
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='mes' AND table_name='production_processes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='equipment_required') THEN
            ALTER TABLE mes.production_processes ADD COLUMN equipment_required character varying;
        END IF;
    END IF;

    -- ============ 5. qa_lab_processes：加 process_name/is_active，name 可空 ============
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lims' AND table_name='qa_lab_processes') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lab_processes' AND column_name='process_name') THEN
            ALTER TABLE lims.qa_lab_processes ADD COLUMN process_name character varying;
        END IF;
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lab_processes' AND column_name='is_active') THEN
            ALTER TABLE lims.qa_lab_processes ADD COLUMN is_active boolean DEFAULT true;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lab_processes' AND column_name='name' AND is_nullable='NO') THEN
            ALTER TABLE lims.qa_lab_processes ALTER COLUMN name DROP NOT NULL;
        END IF;
    END IF;

    -- ============ 6. pm.projects/contracts 状态约束扩展 ============
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_projects_status_standard') THEN
        ALTER TABLE pm.projects DROP CONSTRAINT ck_projects_status_standard;
        ALTER TABLE pm.projects ADD CONSTRAINT ck_projects_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived','draft','pending','completed','cancelled'));
    END IF;
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname='ck_contracts_status_standard') THEN
        ALTER TABLE pm.contracts DROP CONSTRAINT ck_contracts_status_standard;
        ALTER TABLE pm.contracts ADD CONSTRAINT ck_contracts_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived','draft','pending','completed','cancelled'));
    END IF;

    -- ============ 7. scm.audit_logs 补 user_id；erp.audit_logs 放宽 NOT NULL ============
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='audit_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='audit_logs' AND column_name='user_id') THEN
            ALTER TABLE scm.audit_logs ADD COLUMN user_id uuid;
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='erp' AND table_name='audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='audit_logs' AND column_name='tenant_id' AND is_nullable='NO') THEN
            ALTER TABLE erp.audit_logs ALTER COLUMN tenant_id DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='audit_logs' AND column_name='organization_id' AND is_nullable='NO') THEN
            ALTER TABLE erp.audit_logs ALTER COLUMN organization_id DROP NOT NULL;
        END IF;
    END IF;

    -- ============ 8. rs.* 表补建（双库均缺） ============
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='formulas') THEN
        CREATE TABLE rs.formulas (
            id uuid PRIMARY KEY,
            tenant_id uuid,
            name character varying NOT NULL,
            code character varying,
            version character varying DEFAULT 'v1',
            category character varying,
            description text,
            project_id uuid,
            status character varying DEFAULT 'draft',
            approval_status character varying DEFAULT 'pending',
            effective_date date,
            expiration_date date,
            ingredients jsonb,
            process_steps jsonb,
            process_params jsonb,
            properties jsonb,
            created_by character varying,
            created_at timestamptz with time zone NOT NULL DEFAULT now(),
            updated_at timestamptz with time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz with time zone
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='patents') THEN
        CREATE TABLE rs.patents (
            id uuid PRIMARY KEY,
            tenant_id uuid,
            name character varying NOT NULL,
            patent_number character varying,
            project_id uuid,
            application_date date,
            grant_date date,
            status character varying DEFAULT 'draft',
            type character varying,
            inventors jsonb,
            assignee character varying,
            description text,
            abstract text,
            created_by character varying,
            created_at timestamptz with time zone NOT NULL DEFAULT now(),
            updated_at timestamptz with time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz with time zone
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='research_costs') THEN
        CREATE TABLE rs.research_costs (
            id uuid PRIMARY KEY,
            tenant_id uuid,
            project_id uuid,
            category character varying,
            sub_category character varying,
            amount numeric,
            currency character varying DEFAULT 'CNY',
            description text,
            cost_date date,
            payer character varying,
            payment_method character varying,
            receipt_no character varying,
            status character varying DEFAULT 'active',
            created_by character varying,
            created_at timestamptz with time zone NOT NULL DEFAULT now(),
            updated_at timestamptz with time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz with time zone
        );
    END IF;
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='audit_logs') THEN
        CREATE TABLE rs.audit_logs (
            id uuid PRIMARY KEY,
            user_id uuid,
            action character varying NOT NULL,
            resource_type character varying,
            resource_id uuid,
            details jsonb,
            ip_address text,
            user_agent text,
            created_at timestamptz with time zone NOT NULL DEFAULT now(),
            deleted_at timestamptz with time zone,
            entity_type text,
            entity_id uuid,
            entity_ids jsonb,
            user_name text,
            request_details jsonb,
            response_details jsonb,
            status character varying,
            error_message text,
            success boolean
        );
    END IF;
END $$;
