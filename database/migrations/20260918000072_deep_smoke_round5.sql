-- TOPEMS database migration 20260918000072
-- 深冒烟第五轮修复：
-- 1) scm.purchase_items：item_name/total_price NOT NULL 但代码 INSERT 不含 → DROP NOT NULL
-- 2) scm.audit_logs：record_id NOT NULL 但代码 INSERT 不传 → DROP NOT NULL
-- 3) rs.formulas：RETURNING 引用 approved_at 但表缺列 → 补列
-- 幂等、双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='item_name' AND is_nullable='NO') THEN
            ALTER TABLE scm.purchase_items ALTER COLUMN item_name DROP NOT NULL;
        END IF;
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='total_price' AND is_nullable='NO') THEN
            ALTER TABLE scm.purchase_items ALTER COLUMN total_price DROP NOT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='audit_logs') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='audit_logs' AND column_name='record_id' AND is_nullable='NO') THEN
            ALTER TABLE scm.audit_logs ALTER COLUMN record_id DROP NOT NULL;
        END IF;
    END IF;

    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='rs' AND table_name='formulas') THEN
        IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='rs' AND table_name='formulas' AND column_name='approved_at') THEN
            ALTER TABLE rs.formulas ADD COLUMN approved_at timestamptz;
        END IF;
    END IF;
END $$;
