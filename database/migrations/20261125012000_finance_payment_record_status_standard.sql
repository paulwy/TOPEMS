-- B287: finance.erp_payment_records.status 生命周期收口
-- 背景：281 行历史数据 status 全为 NULL；现有 CHECK 只允许 NULL/active/inactive/archived，
--   但 write_off_payment 直接写 'written_off'，每次核销都会触发 CHECK 违反。
-- 处置：NULL 归 active、默认 active、SET NOT NULL；CHECK 扩充为
--   active/inactive/archived/written_off 四态并 VALIDATE。
-- 回滚：database/rollback/20261125012000_finance_payment_record_status_standard.rollback.sql

ALTER TABLE finance.erp_payment_records
    ALTER COLUMN status SET DEFAULT 'active';

-- destructive-gate: allow
-- destructive-kind: UPDATE
-- destructive-reason: 把 281 条历史付款记录的空状态补为 active，随后收紧 NOT NULL
-- destructive-owner: finance-core
-- destructive-ticket: W5-B-B287
-- destructive-expires: 2027-05-01
-- destructive-max-rows: 1000000
-- destructive-backup: 窗口前 pg_dump -t finance.erp_payment_records
UPDATE finance.erp_payment_records
SET status = 'active'
WHERE status IS NULL;

ALTER TABLE finance.erp_payment_records
    ALTER COLUMN status SET NOT NULL;

ALTER TABLE finance.erp_payment_records
    DROP CONSTRAINT IF EXISTS ck_erp_payment_records_status_standard;

ALTER TABLE finance.erp_payment_records
    ADD CONSTRAINT ck_erp_payment_records_status_standard
    CHECK (status IN ('active', 'inactive', 'archived', 'written_off'))
    NOT VALID;

ALTER TABLE finance.erp_payment_records
    VALIDATE CONSTRAINT ck_erp_payment_records_status_standard;
