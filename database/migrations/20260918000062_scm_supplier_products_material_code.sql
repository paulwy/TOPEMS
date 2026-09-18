-- TOPEMS database migration 20260918000062
-- scm.supplier_products 补 material_code text（MRP 计算 SELECT sp.material_code）
-- 幂等且双库安全。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='scm' AND table_name='supplier_products')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
                       WHERE table_schema='scm' AND table_name='supplier_products' AND column_name='material_code') THEN
        ALTER TABLE scm.supplier_products ADD COLUMN material_code text;
    END IF;
END $$;
