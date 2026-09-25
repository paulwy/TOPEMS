-- TOPEMS database migration 20260918000069
-- 深冒烟第二轮修复后仍暴露的 DB 坑：
-- 1) 000067 补建的 pdm 表 id 无默认（代码 INSERT 不含 id，search_path 命中 pdm）→ gen_random_uuid()
-- 2) pdm_project_members 缺表（5433 有）→ 对齐补建
-- 3) erp.meeting_rooms created_at/updated_at timestamp→timestamptz（代码 decode DateTime<Utc>）
-- 4) scm.purchase_items 缺 product_name
-- 5) mes.production_processes.equipment_required varchar→boolean（代码 Option<bool>）
-- 6) qa_lab_processes.process_no NOT NULL 但代码 INSERT 不传 → DROP NOT NULL
-- 7) rs.formulas effective_date/expiration_date date→varchar（代码传 text）
-- 8) rs.research_costs.amount numeric→double precision（代码 decode f64）
-- 9) public.audit_logs 缺 tenant_id（pm/rd audit 写它）
-- 幂等、双库安全。

DO $$
BEGIN
    -- 1. pdm 表 id 默认
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_batches') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_production_batches' AND column_name='id' AND column_default IS NULL) THEN
            ALTER TABLE pdm.pdm_production_batches ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_steps') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_production_steps' AND column_name='id' AND column_default IS NULL) THEN
            ALTER TABLE pdm.pdm_production_steps ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_projects') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_projects' AND column_name='id' AND column_default IS NULL) THEN
            ALTER TABLE pdm.pdm_projects ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
    END IF;

    -- 2. pdm_project_members 补建
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_project_members') THEN
        CREATE TABLE pdm.pdm_project_members (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            tenant_id uuid,
            project_id uuid NOT NULL,
            user_id character varying,
            user_name character varying,
            user_email text,
            role character varying,
            joined_at timestamptz without time zone DEFAULT now(),
            updated_at timestamptz without time zone DEFAULT now(),
            deleted_at timestamptz with time zone
        );
        CREATE INDEX idx_pdm_project_members_project_id ON pdm.pdm_project_members(project_id);
    END IF;

    -- 3. erp.meeting_rooms 时间列类型
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='erp' AND table_name='meeting_rooms') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='meeting_rooms' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE erp.meeting_rooms ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='meeting_rooms' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE erp.meeting_rooms ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
        END IF;
    END IF;

    -- 4. scm.purchase_items 补 product_name
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='product_name') THEN
            ALTER TABLE scm.purchase_items ADD COLUMN product_name character varying;
        END IF;
    END IF;

    -- 5. mes.production_processes.equipment_required → boolean
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='mes' AND table_name='production_processes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='mes' AND table_name='production_processes' AND column_name='equipment_required' AND data_type='character varying') THEN
            ALTER TABLE mes.production_processes DROP COLUMN equipment_required;
            ALTER TABLE mes.production_processes ADD COLUMN equipment_required boolean DEFAULT false;
        END IF;
    END IF;

    -- 6. qa_lab_processes.process_no 可空
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lims' AND table_name='qa_lab_processes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lab_processes' AND column_name='process_no' AND is_nullable='NO') THEN
            ALTER TABLE lims.qa_lab_processes ALTER COLUMN process_no DROP NOT NULL;
        END IF;
    END IF;

    -- 7. rs.formulas 日期列 → varchar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='formulas') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='formulas' AND column_name='effective_date' AND data_type='date') THEN
            ALTER TABLE rs.formulas ALTER COLUMN effective_date TYPE character varying USING effective_date::text;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='formulas' AND column_name='expiration_date' AND data_type='date') THEN
            ALTER TABLE rs.formulas ALTER COLUMN expiration_date TYPE character varying USING expiration_date::text;
        END IF;
    END IF;

    -- 8. rs.research_costs.amount → double precision
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='research_costs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='research_costs' AND column_name='amount' AND data_type='numeric') THEN
            ALTER TABLE rs.research_costs ALTER COLUMN amount TYPE double precision USING amount::double precision;
        END IF;
    END IF;

    -- 9. public.audit_logs 补 tenant_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='tenant_id') THEN
            ALTER TABLE public.audit_logs ADD COLUMN tenant_id uuid;
        END IF;
    END IF;
END $$;
