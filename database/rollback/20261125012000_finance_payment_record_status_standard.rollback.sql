-- B287 回滚：恢复可空与旧三态 CHECK（written_off 数据存在时回滚会失败）
ALTER TABLE finance.erp_payment_records
    ALTER COLUMN status DROP NOT NULL;

ALTER TABLE finance.erp_payment_records
    DROP CONSTRAINT IF EXISTS ck_erp_payment_records_status_standard;

ALTER TABLE finance.erp_payment_records
    ADD CONSTRAINT ck_erp_payment_records_status_standard
    CHECK (status IS NULL OR status IN ('active', 'inactive', 'archived'))
    NOT VALID;

ALTER TABLE finance.erp_payment_records
    VALIDATE CONSTRAINT ck_erp_payment_records_status_standard;
