-- ================================================================================
-- R-3: ck_*_status_standard 窄约束正式放宽（同族 6+1 张表）
-- 来源：go-live-checklist R-3 / regression-baseline-r2 P3-2
--
-- 根因：
--   P3-2（20260809000002）给全库 492 张表带 status 列的表加了窄约束
--   ck_*_status_standard（仅允许 active/inactive/archived）。
--   后续放宽迁移：
--     - 20260821000001（V252：DROP 全部窄约束）——在 5432 未生效
--       （数百条窄约束仍在）；
--     - 20260920000097 §3（erp.financial_vouchers 放宽到含 draft/pending/posted）
--       用 EXCEPTION WHEN OTHERS THEN NULL 吞错，DDL 静默失败，账本却记 success=t。
--   R2 已手工放宽 erp.financial_vouchers / erp.erp_production_orders（未记账）。
--
-- 本迁移：正式、逐表 DROP 窄约束 + ADD 放宽约束（含代码实际写入的业务状态）。
-- 幂等：IF EXISTS 守卫；表不存在则跳过。
-- 不吞错：去掉 EXCEPTION WHEN OTHERS THEN NULL——错误直接传播，防静默失败。
-- ================================================================================

-- 1. hrm.payroll_runs
--    代码状态机：create→draft → calculate→calculated → pay→paid（WHERE 守卫 pending）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='hrm' AND table_name='payroll_runs' AND column_name='status') THEN
        ALTER TABLE hrm.payroll_runs DROP CONSTRAINT IF EXISTS ck_payroll_runs_status_standard;
        ALTER TABLE hrm.payroll_runs ADD CONSTRAINT ck_payroll_runs_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'draft','pending','calculated','paid'
            ));
    END IF;
END $$;

-- 2. erp.financial_vouchers
--    代码 INSERT 'draft'；链①工资→凭证事件写 draft/pending/posted
--    （R2 已手工放宽同集，此处幂等重放）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='financial_vouchers' AND column_name='status') THEN
        ALTER TABLE erp.financial_vouchers DROP CONSTRAINT IF EXISTS ck_financial_vouchers_status_standard;
        ALTER TABLE erp.financial_vouchers ADD CONSTRAINT ck_financial_vouchers_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'draft','pending','posted'
            ));
    END IF;
END $$;

-- 3. erp.erp_production_orders
--    代码/事件写 dispatched→in_progress→completed；也允许 draft/pending/cancelled/open/new
--    （R2 已手工放宽同集，此处幂等重放）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='erp' AND table_name='erp_production_orders' AND column_name='status') THEN
        ALTER TABLE erp.erp_production_orders DROP CONSTRAINT IF EXISTS ck_erp_production_orders_status_standard;
        ALTER TABLE erp.erp_production_orders ADD CONSTRAINT ck_erp_production_orders_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'draft','pending','dispatched','in_progress','completed','cancelled','open','new'
            ));
    END IF;
END $$;

-- 4. public.qa_lab_samples
--    lims sample.rs INSERT 'received'；integration.rs 默认 'registered'
--    （注：表在 public schema，非 lims.qa_lab_samples——后者已被 20260921000100 cleanup）
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='public' AND table_name='qa_lab_samples' AND column_name='status') THEN
        ALTER TABLE public.qa_lab_samples DROP CONSTRAINT IF EXISTS ck_qa_lab_samples_status_standard;
        ALTER TABLE public.qa_lab_samples ADD CONSTRAINT ck_qa_lab_samples_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'received','registered'
            ));
    END IF;
END $$;

-- 5. crm.audit_logs
--    schema_defense 默认 'success'；R2 测试插入 status='success' 被窄约束拦
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='crm' AND table_name='audit_logs' AND column_name='status') THEN
        ALTER TABLE crm.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
        ALTER TABLE crm.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'success','failure'
            ));
    END IF;
END $$;

-- 6. wms.audit_logs
--    同 crm.audit_logs 同族；默认 'success'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='wms' AND table_name='audit_logs' AND column_name='status') THEN
        ALTER TABLE wms.audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_status_standard;
        ALTER TABLE wms.audit_logs ADD CONSTRAINT ck_audit_logs_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'success','failure'
            ));
    END IF;
END $$;

-- 7. lims.qa_lims_audit_logs（调查发现的同族表）
--    lims schema_defense.rs:533 / models/mod.rs:939 默认 'success'
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='lims' AND table_name='qa_lims_audit_logs' AND column_name='status') THEN
        ALTER TABLE lims.qa_lims_audit_logs DROP CONSTRAINT IF EXISTS ck_qa_lims_audit_logs_status_standard;
        ALTER TABLE lims.qa_lims_audit_logs ADD CONSTRAINT ck_qa_lims_audit_logs_status_standard
            CHECK (status IS NULL OR status IN (
                'active','inactive','archived',
                'success','failure'
            ));
    END IF;
END $$;
