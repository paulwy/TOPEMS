-- CRM 商机状态候选约束（仅本地演练，NOT VALID，未进入迁移）
-- 唯一值源：open / won / lost / archived
BEGIN;

ALTER TABLE crm.opportunities
    ADD CONSTRAINT ck_crm_opportunities_status_canonical
    CHECK (status::text = ANY (ARRAY['open','won','lost','archived']::text[]))
    NOT VALID;

-- 预期：23514 check_violation
INSERT INTO crm.opportunities (id, tenant_id, name, stage, status)
VALUES (gen_random_uuid(), '00000000-0000-0000-0000-000000000001', '非法状态商机', 'draft', 'bogus');

ROLLBACK;
