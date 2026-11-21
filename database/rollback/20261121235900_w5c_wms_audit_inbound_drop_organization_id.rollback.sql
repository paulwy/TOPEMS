-- 20261121235900 回滚：恢复 WMS audit_logs / inbound_orders 的 organization_id
--
-- audit_logs 以 org_id 派生；inbound_orders 以 tenant_id 派生。
-- 删除前已核对逐行相等，因此派生恢复等价；不恢复历史差异值。

ALTER TABLE wms.audit_logs ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE wms.audit_logs SET organization_id = org_id WHERE organization_id IS NULL;
ALTER TABLE wms.audit_logs ALTER COLUMN organization_id SET NOT NULL;

ALTER TABLE wms.inbound_orders ADD COLUMN IF NOT EXISTS organization_id uuid;
UPDATE wms.inbound_orders SET organization_id = tenant_id WHERE organization_id IS NULL;
ALTER TABLE wms.inbound_orders ALTER COLUMN organization_id SET NOT NULL;
