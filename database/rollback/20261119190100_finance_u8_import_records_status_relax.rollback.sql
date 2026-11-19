-- 回滚：finance.finance_u8_import_records 状态约束恢复为 dev 原样窄约束
-- 对应：database/migrations/20261119190100_finance_u8_import_records_status_relax.sql
-- 注意：回滚后 U8 导入路径会重新触发 23514；仅在确认业务不再写非三态值时回滚。

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables
               WHERE table_schema='finance' AND table_name='finance_u8_import_records') THEN
        ALTER TABLE finance.finance_u8_import_records
            DROP CONSTRAINT IF EXISTS ck_finance_u8_import_records_status_standard;
        ALTER TABLE finance.finance_u8_import_records
            ADD CONSTRAINT ck_finance_u8_import_records_status_standard
            CHECK (status IS NULL OR status IN ('active','inactive','archived'));
    END IF;
END $$;
