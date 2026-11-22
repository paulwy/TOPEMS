-- B135 · crm.crm_master_data_refs.status 状态收敛候选 DDL
-- 值集来源：svc/crm/src/modules/master_data_ref_status.rs（MasterDataRefStatus）
-- 主数据动作映射：created/updated/activated → active，deactivated → inactive，deleted → deleted。
-- 本地：832 行（active 822 / deleted 10 / inactive 0），nullable DEFAULT 'active'，无 CHECK。
-- 生产快照：158 行（active 140 / deleted 18），nullable DEFAULT 'active'，无 CHECK。

UPDATE crm.crm_master_data_refs SET status = 'active' WHERE status IS NULL;
ALTER TABLE crm.crm_master_data_refs ALTER COLUMN status SET DEFAULT 'active';
ALTER TABLE crm.crm_master_data_refs ALTER COLUMN status SET NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'crm.crm_master_data_refs'::regclass
      AND conname = 'ck_crm_master_data_refs_status_standard'
  ) THEN
    ALTER TABLE crm.crm_master_data_refs
      ADD CONSTRAINT ck_crm_master_data_refs_status_standard
      CHECK (status = ANY (ARRAY['active','inactive','deleted']))
      NOT VALID;
  END IF;
END $$;

COMMENT ON COLUMN crm.crm_master_data_refs.status IS '本地投影状态：active, inactive, deleted';

-- 窗口内验证：
-- ALTER TABLE crm.crm_master_data_refs VALIDATE CONSTRAINT ck_crm_master_data_refs_status_standard;
-- 回滚：
-- ALTER TABLE crm.crm_master_data_refs DROP CONSTRAINT IF EXISTS ck_crm_master_data_refs_status_standard;
-- ALTER TABLE crm.crm_master_data_refs ALTER COLUMN status DROP NOT NULL;
-- ALTER TABLE crm.crm_master_data_refs ALTER COLUMN status DROP DEFAULT;
