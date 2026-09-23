-- 补列迁移类型修正（续）：integration.erp_wms_sync.quantity NUMERIC → FLOAT8
-- 代码 ErpWmsSyncRow.quantity 为 Option<f64>（sqlx 映射 FLOAT8），列误为 NUMERIC。
-- 幂等：仅当列当前为 numeric 时转换；表为空或新列全 NULL，无数据迁移负担。
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema='integration' AND table_name='erp_wms_sync'
                 AND column_name='quantity' AND data_type='numeric') THEN
        ALTER TABLE integration.erp_wms_sync ALTER COLUMN quantity TYPE FLOAT8 USING quantity::FLOAT8;
    END IF;
END $$;
