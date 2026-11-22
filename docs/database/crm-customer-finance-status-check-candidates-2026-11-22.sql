-- B133 · crm.customer_finance.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/customer_status.rs（CustomerStatus，复用）
-- active/inactive：启用/停用；archived：归档终态。
-- 本地：1 行 active，NOT NULL DEFAULT 'active'，已有同名 VALID CHECK（允许 NULL）。
-- 生产快照：0 行，NOT NULL DEFAULT 'active'，无 CHECK。

UPDATE crm.customer_finance SET status = 'active' WHERE status IS NULL;
ALTER TABLE crm.customer_finance ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE crm.customer_finance ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.customer_finance'::regclass
      AND conname = 'ck_customer_finance_status_standard'
  ) THEN
    ALTER TABLE crm.customer_finance
      ADD CONSTRAINT ck_customer_finance_status_standard
      CHECK (status = ANY (ARRAY['active','inactive','archived']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN crm.customer_finance.status IS '状态：active, inactive, archived';

-- 窗口内验证：
-- ALTER TABLE crm.customer_finance VALIDATE CONSTRAINT ck_customer_finance_status_standard;
-- 回滚：
-- ALTER TABLE crm.customer_finance DROP CONSTRAINT IF EXISTS ck_customer_finance_status_standard;
-- ALTER TABLE crm.customer_finance ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.customer_finance ALTER COLUMN status DROP DEFAULT;
