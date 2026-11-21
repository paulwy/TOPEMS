-- CRM 账单状态候选约束（仅本地演练，NOT VALID，未进入迁移）
-- 唯一值源：pending / paid / overdue / cancelled
-- 现有 ck_billing_records_status_standard 仅允许 active/inactive/archived/pending/paid，
-- 会把 overdue/cancelled 判为非法，必须替换而不是叠加。
BEGIN;

ALTER TABLE crm.billing_records
    DROP CONSTRAINT IF EXISTS ck_billing_records_status_standard;

ALTER TABLE crm.billing_records
    ADD CONSTRAINT ck_crm_billing_records_status_canonical
    CHECK (status::text = ANY (ARRAY['pending','paid','overdue','cancelled']::text[]))
    NOT VALID;

-- 预期：4 行全部成功（overdue/cancelled 在旧约束下会被拒）
INSERT INTO crm.billing_records (tenant_id, invoice_no, status)
SELECT '00000000-0000-0000-0000-000000000001',
       'BR-' || status,
       status
FROM unnest(ARRAY['pending','overdue','cancelled','paid']) AS status;

-- 预期：23514 check_violation
INSERT INTO crm.billing_records (tenant_id, invoice_no, status)
VALUES ('00000000-0000-0000-0000-000000000001', 'BR-BOGUS', 'bogus');

ROLLBACK;
