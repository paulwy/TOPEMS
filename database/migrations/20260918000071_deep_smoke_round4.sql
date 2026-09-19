-- TOPEMS database migration 20260918000071
-- 深冒烟第四轮修复：
-- 1) scm.purchase_items.item_no NOT NULL 但代码 INSERT 不传 → DROP NOT NULL
-- 2) scm.audit_logs.table_name NOT NULL 但代码 INSERT 不传 → DROP NOT NULL
-- 3) rs.formulas 缺 approved_by（代码 INSERT 用）
-- 4) rs.audit_logs.id 无默认（代码 INSERT 不传 id）→ gen_random_uuid()
-- 5) qa_lims_pt_plans.tenant_id 无默认（代码 INSERT 不传，RETURNING 供 decode）→ 默认租户
-- 幂等、双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='item_no' AND is_nullable='NO') THEN
            ALTER TABLE scm.purchase_items ALTER COLUMN item_no DROP NOT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='audit_logs' AND column_name='table_name' AND is_nullable='NO') THEN
            ALTER TABLE scm.audit_logs ALTER COLUMN table_name DROP NOT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='formulas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='formulas' AND column_name='approved_by') THEN
            ALTER TABLE rs.formulas ADD COLUMN approved_by character varying;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='audit_logs' AND column_name='id' AND column_default IS NULL) THEN
            ALTER TABLE rs.audit_logs ALTER COLUMN id SET DEFAULT gen_random_uuid();
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='lims' AND table_name='qa_lims_pt_plans') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='lims' AND table_name='qa_lims_pt_plans' AND column_name='tenant_id' AND column_default IS NULL) THEN
            ALTER TABLE lims.qa_lims_pt_plans ALTER COLUMN tenant_id SET DEFAULT '00000000-0000-0000-0000-000000000001';
        END IF;
    END IF;
END $$;
