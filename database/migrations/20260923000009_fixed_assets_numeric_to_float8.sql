-- fixed_assets 金额列类型对齐：NUMERIC → FLOAT8
-- 代码 FixedAsset 金额字段为 f64（sqlx 映射 FLOAT8），列误为 NUMERIC 导致解码 mismatched。
-- 与 20260917000003_erp_purchase_orders_type_align.sql 同法（金额 NUMERIC→FLOAT8 治理）。
-- 生成列 net_value/monthly_depreciation 依赖被改列，需先 DROP 再重建。
-- 表 0 行（测试数据已清），无数据迁移负担。
DO $$
DECLARE
    c record;
BEGIN
    -- 1. DROP 生成列（释放对 original_value/accumulated_depreciation/salvage_value/expected_life 的依赖）
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='fixed_assets' AND column_name='net_value' AND is_generated='ALWAYS') THEN
        ALTER TABLE erp.fixed_assets DROP COLUMN net_value;
    END IF;
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='erp' AND table_name='fixed_assets' AND column_name='monthly_depreciation' AND is_generated='ALWAYS') THEN
        ALTER TABLE erp.fixed_assets DROP COLUMN monthly_depreciation;
    END IF;

    -- 2. NUMERIC → FLOAT8
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'fixed_assets'
          AND data_type = 'numeric'
          AND column_name IN ('original_value','accumulated_depreciation','net_value',
                              'monthly_depreciation','salvage_value')
    LOOP
        EXECUTE format('ALTER TABLE erp.fixed_assets ALTER COLUMN %I TYPE FLOAT8 USING %I::FLOAT8', c.column_name, c.column_name);
    END LOOP;

    -- 3. 重建生成列（原表达式语义：net_value = original_value - accumulated_depreciation；
    --    monthly_depreciation = (original_value - salvage_value) / expected_life）
    ALTER TABLE erp.fixed_assets ADD COLUMN net_value FLOAT8 GENERATED ALWAYS AS (original_value - accumulated_depreciation) STORED;
    ALTER TABLE erp.fixed_assets ADD COLUMN monthly_depreciation FLOAT8 GENERATED ALWAYS AS ((original_value - salvage_value) / (expected_life)::float8) STORED;
END $$;
