-- TOPEMS database migration 20260918000070
-- 深冒烟第三轮修复：
-- 1) pdm 3 表 created_at/updated_at timestamp→timestamptz（代码 decode DateTime<Utc>）
-- 2) scm.purchase_items 缺 amount
-- 3) rs.formulas.process_steps jsonb→text（代码 bind String）
-- 4) rs.research_costs.cost_date date→timestamptz（代码 bind/parse DateTime<Utc>）
-- 5) scm.audit_logs.user_id uuid→varchar（代码传 text）
-- 6) public.audit_logs 缺 action（pm audit 写它）
-- 7) rs.audit_logs 缺 tenant_id（rd audit 写它）
-- 8) qa_lab_processes.tenant_id 加默认（代码 INSERT 不传，RETURNING tenant_id 供 decode）
-- 幂等、双库安全。

DO $$
BEGIN
    -- 1. pdm 时间列 → timestamptz
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_batches') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_production_batches' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE pdm.pdm_production_batches ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_production_batches' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE pdm.pdm_production_batches ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
        END IF;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_production_steps') THEN
        -- steps 无 created_at 列，跳过
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='pdm' AND table_name='pdm_projects') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_projects' AND column_name='created_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE pdm.pdm_projects ALTER COLUMN created_at TYPE timestamp with time zone USING created_at AT TIME ZONE 'UTC';
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='pdm' AND table_name='pdm_projects' AND column_name='updated_at' AND data_type='timestamp without time zone') THEN
            ALTER TABLE pdm.pdm_projects ALTER COLUMN updated_at TYPE timestamp with time zone USING updated_at AT TIME ZONE 'UTC';
        END IF;
    END IF;

    -- 2. scm.purchase_items 补 amount
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='amount') THEN
            ALTER TABLE scm.purchase_items ADD COLUMN amount numeric;
        END IF;
    END IF;

    -- 3. rs.formulas.process_steps → text
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='formulas') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='formulas' AND column_name='process_steps' AND data_type='jsonb') THEN
            ALTER TABLE rs.formulas ALTER COLUMN process_steps TYPE text USING process_steps::text;
        END IF;
    END IF;

    -- 4. rs.research_costs.cost_date → timestamptz
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='research_costs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='research_costs' AND column_name='cost_date' AND data_type='date') THEN
            ALTER TABLE rs.research_costs ALTER COLUMN cost_date TYPE timestamp with time zone USING cost_date AT TIME ZONE 'UTC';
        END IF;
    END IF;

    -- 5. scm.audit_logs.user_id → varchar
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='audit_logs' AND column_name='user_id' AND data_type='uuid') THEN
            ALTER TABLE scm.audit_logs ALTER COLUMN user_id TYPE character varying USING user_id::text;
        END IF;
    END IF;

    -- 6. public.audit_logs 补 action
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='audit_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='audit_logs' AND column_name='action') THEN
            ALTER TABLE public.audit_logs ADD COLUMN action character varying;
        END IF;
    END IF;

    -- 7. rs.audit_logs 补 tenant_id
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='audit_logs') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='audit_logs' AND column_name='tenant_id') THEN
            ALTER TABLE rs.audit_logs ADD COLUMN tenant_id uuid;
        END IF;
    END IF;

    -- 8. qa_lab_processes.tenant_id 默认值
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lims' AND table_name='qa_lab_processes') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lab_processes' AND column_name='tenant_id' AND column_default IS NULL) THEN
            ALTER TABLE lims.qa_lab_processes ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
        END IF;
    END IF;
END $$;
