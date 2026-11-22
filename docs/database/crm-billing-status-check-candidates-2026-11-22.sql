-- B138 · crm.billing_records.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/billing_status.rs（BillingStatus）
-- pending → paid/overdue/cancelled；overdue → paid/cancelled；paid/cancelled 终态。
-- 本地：0 行，nullable 无默认；已有同名 VALID CHECK，但值集错误（active/inactive/archived/pending/paid），会拦截 overdue/cancelled。
-- 生产快照：0 行，nullable 无默认，无 CHECK。
-- 本候选必须替换同名错误约束，不能仅在缺失时追加。

ALTER TABLE crm.billing_records
  DROP CONSTRAINT IF EXISTS ck_billing_records_status_standard;

UPDATE crm.billing_records SET status = 'pending' WHERE status IS NULL;
ALTER TABLE crm.billing_records ALTER COLUMN status SET DEFAULT 'pending';
ALTER TABLE crm.billing_records ALTER COLUMN status SET NOT NULL;

ALTER TABLE crm.billing_records
  ADD CONSTRAINT ck_billing_records_status_standard
  CHECK (status = ANY (ARRAY['pending','paid','overdue','cancelled']))
  NOT VALID;

COMMENT ON COLUMN crm.billing_records.status IS '状态：pending, paid, overdue, cancelled';

-- 窗口内验证：
-- ALTER TABLE crm.billing_records VALIDATE CONSTRAINT ck_billing_records_status_standard;
-- 回滚：
-- ALTER TABLE crm.billing_records DROP CONSTRAINT IF EXISTS ck_billing_records_status_standard;
-- ALTER TABLE crm.billing_records ADD CONSTRAINT ck_billing_records_status_standard CHECK (status IS NULL OR status = ANY (ARRAY['active','inactive','archived','pending','paid'])) NOT VALID;
-- ALTER TABLE crm.billing_records ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.billing_records ALTER COLUMN status DROP DEFAULT;
