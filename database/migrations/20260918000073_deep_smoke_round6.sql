-- TOPEMS database migration 20260918000073
-- 深冒烟第六轮修复：scm.purchase_items.unit_price 代码 Option 缺省传 NULL → DROP NOT NULL
-- 幂等、双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='purchase_items') THEN
        IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='scm' AND table_name='purchase_items' AND column_name='unit_price' AND is_nullable='NO') THEN
            ALTER TABLE scm.purchase_items ALTER COLUMN unit_price DROP NOT NULL;
        END IF;
    END IF;
END $$;
