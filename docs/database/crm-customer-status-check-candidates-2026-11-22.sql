-- B129 · crm.customers.status 生命周期状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/customer_status.rs（CustomerStatus: active/inactive/archived）
-- 流转：active ↔ inactive；active/inactive → archived；archived 只能先回 inactive。
-- 本地：301 行全 active，列 NOT NULL DEFAULT 'active'，已有同名 VALID CHECK。
-- 生产快照：302 行全 active，列 nullable、无默认、无 CHECK。

-- 1) 列定义对齐：非空 + 默认 active；历史 NULL 归一到 active。
UPDATE crm.customers SET status = 'active' WHERE status IS NULL;
ALTER TABLE crm.customers ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE crm.customers ALTER COLUMN status SET NOT NULL;

-- 2) 值域约束：本地已存在同名 VALID 约束则跳过；生产缺失时以 NOT VALID 追加。
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.customers'::regclass
      AND conname = 'ck_customers_status_standard'
  ) THEN
    ALTER TABLE crm.customers
      ADD CONSTRAINT ck_customers_status_standard
      CHECK (status = ANY (ARRAY['active','inactive','archived']))
      NOT VALID;
  END IF;
END $$;

-- 窗口内验证：
-- ALTER TABLE crm.customers VALIDATE CONSTRAINT ck_customers_status_standard;
-- 回滚：
-- ALTER TABLE crm.customers DROP CONSTRAINT IF EXISTS ck_customers_status_standard;
-- ALTER TABLE crm.customers ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.customers ALTER COLUMN status DROP DEFAULT;
