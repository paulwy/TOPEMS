-- 20261121230000 回滚：恢复 hrm 四表的 organization_id 列
--
-- 本回滚只恢复列形状与 tenant_id 派生值；不恢复已删除的历史差异值。
-- 删除前已核对这些表的 organization_id 逐行等于 tenant_id，因此派生恢复等价。
-- 回滚不删除数据、不改 tenant_id、不触碰 org_id/company_id。

ALTER TABLE hrm.departments ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE hrm.departments SET organization_id = tenant_id WHERE organization_id IS NULL;
ALTER TABLE hrm.departments ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE hrm.employees ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE hrm.employees SET organization_id = tenant_id WHERE organization_id IS NULL;

ALTER TABLE hrm.positions ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE hrm.positions SET organization_id = tenant_id WHERE organization_id IS NULL;
ALTER TABLE hrm.positions ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE hrm.attendance_records ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE hrm.attendance_records SET organization_id = tenant_id WHERE organization_id IS NULL;
ALTER TABLE hrm.attendance_records ALTER COLUMN organization_id SET NOT NULL;
