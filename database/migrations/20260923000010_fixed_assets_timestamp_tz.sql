-- fixed_assets 时间戳列类型对齐：TIMESTAMP → TIMESTAMPTZ
-- 代码 created_at/updated_at 为 DateTime<Utc>（sqlx 映射 TIMESTAMPTZ），列误为 TIMESTAMP。
-- 与 9-19 全库时间戳治理（R1 全库 TIMESTAMPTZ 对齐）同法。
-- 幂等：仅当列当前为 timestamp without time zone 时转换；表 0 行，无数据负担。
DO $$
DECLARE
    c record;
BEGIN
    FOR c IN
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'erp' AND table_name = 'fixed_assets'
          AND data_type = 'timestamp without time zone'
          AND column_name IN ('created_at','updated_at','deleted_at')
    LOOP
        EXECUTE format('ALTER TABLE erp.fixed_assets ALTER COLUMN %I TYPE TIMESTAMPTZ USING %I::TIMESTAMPTZ', c.column_name, c.column_name);
    END LOOP;
END $$;
