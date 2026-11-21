-- CRM 合同状态候选约束（仅本地演练，NOT VALID，未进入迁移）
-- 唯一值源：draft / pending / active / completed / expired / terminated
BEGIN;

ALTER TABLE crm.contracts
    ADD CONSTRAINT ck_crm_contracts_status_canonical
    CHECK (status::text = ANY (ARRAY['draft','pending','active','completed','expired','terminated']::text[]))
    NOT VALID;

-- 预期：23514 check_violation
INSERT INTO crm.contracts (id, tenant_id, contract_no, title, status)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', 'CT-BOGUS', '非法状态合同', 'bogus');

ROLLBACK;
