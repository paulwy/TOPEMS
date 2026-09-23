-- fixed_assets.purchase_date 类型对齐：DATE → TIMESTAMPTZ
-- 代码 FixedAsset.purchase_date 为 Option<DateTime<Utc>>（sqlx 映射 TIMESTAMPTZ），
-- 补列迁移误建为 DATE，导致 INSERT/RETURNING 解码报 mismatched types。
-- 幂等：仅当列当前为 date 时转换；表 0 行（测试数据已清），无数据迁移负担。
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'fixed_assets'
          AND column_name = 'purchase_date' AND data_type = 'date'
    ) THEN
        ALTER TABLE erp.fixed_assets ALTER COLUMN purchase_date TYPE TIMESTAMPTZ USING purchase_date::TIMESTAMPTZ;
    END IF;
END $$;
