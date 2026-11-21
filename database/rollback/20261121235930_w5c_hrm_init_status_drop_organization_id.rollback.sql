-- 20261121235930 回滚：恢复 hrm.initialization_status.organization_id
--
-- 删除前已核对该列逐行等于 tenant_id，因此按 tenant_id 派生恢复等价。
-- 原列为 NOT NULL，恢复后置 NOT NULL；不删除数据、不改 tenant_id。

ALTER TABLE hrm.initialization_status ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE hrm.initialization_status SET organization_id = tenant_id WHERE organization_id IS NULL;
ALTER TABLE hrm.initialization_status ALTER COLUMN organization_id SET NOT NULL;
