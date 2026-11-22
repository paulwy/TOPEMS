-- B132 · crm.interactions.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/interaction_status.rs（InteractionStatus）
-- scheduled：已计划；in_progress：进行中（历史 1 行）；completed/cancelled：终态。
-- 本地：1 行（in_progress），status NOT NULL DEFAULT 'scheduled'，无 CHECK。
-- 生产快照：0 行，status nullable、默认 'pending'、无 CHECK。

UPDATE crm.interactions SET status = 'scheduled' WHERE status IS NULL;
ALTER TABLE crm.interactions ALTER COLUMN status SET DEFAULT 'scheduled';
ALTER TABLE crm.interactions ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.interactions'::regclass
      AND conname = 'ck_interactions_status_standard'
  ) THEN
    ALTER TABLE crm.interactions
      ADD CONSTRAINT ck_interactions_status_standard
      CHECK (status = ANY (ARRAY['scheduled','in_progress','completed','cancelled']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN crm.interactions.status IS '状态：scheduled, in_progress, completed, cancelled';

-- 窗口内验证：
-- ALTER TABLE crm.interactions VALIDATE CONSTRAINT ck_interactions_status_standard;
-- 回滚：
-- ALTER TABLE crm.interactions DROP CONSTRAINT IF EXISTS ck_interactions_status_standard;
-- ALTER TABLE crm.interactions ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.interactions ALTER COLUMN status DROP DEFAULT;
