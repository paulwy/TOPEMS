-- B130 · crm.contacts.status 生命周期状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/contact_status.rs（ContactStatus: active/inactive/archived）
-- 流转：active ↔ inactive；active/inactive → archived；archived 只能先回 inactive。
-- 本地：6 行全 active，列 NOT NULL DEFAULT 'active'，已有同名 VALID CHECK。
-- 生产快照：0 行，列 nullable、默认 active、无 CHECK。

UPDATE crm.contacts SET status = 'active' WHERE status IS NULL;
ALTER TABLE crm.contacts ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE crm.contacts ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.contacts'::regclass
      AND conname = 'ck_contacts_status_standard'
  ) THEN
    ALTER TABLE crm.contacts
      ADD CONSTRAINT ck_contacts_status_standard
      CHECK (status = ANY (ARRAY['active','inactive','archived']))
      NOT VALID;
  END IF;
END $$;

-- 窗口内验证：
-- ALTER TABLE crm.contacts VALIDATE CONSTRAINT ck_contacts_status_standard;
-- 回滚：
-- ALTER TABLE crm.contacts DROP CONSTRAINT IF EXISTS ck_contacts_status_standard;
-- ALTER TABLE crm.contacts ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.contacts ALTER COLUMN status DROP DEFAULT;
